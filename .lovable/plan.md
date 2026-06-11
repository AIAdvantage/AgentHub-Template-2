## Geht das im jetzigen Setup? Ja — und sogar sauber.

Lovable Cloud bringt Postgres mit der `pgvector`-Extension mit, und das Lovable-AI-Gateway hat einen Embeddings-Endpoint (`google/gemini-embedding-001`). Tool-Calling wird vom selben Gateway unterstützt. Wir brauchen nichts Externes — kein Pinecone, kein OpenAI-Key, kein zweiter Server.

## Zielarchitektur

```text
                 ┌────────────────────────────────────────┐
                 │  HUB (Ideen, Wins, Changelog, Vault)   │
                 └───────────────┬────────────────────────┘
                                 │ on change (Trigger / Cron)
                                 ▼
                 ┌────────────────────────────────────────┐
                 │  embed-hub  (Edge Function)            │
                 │  - chunked Text → Embedding via Gateway│
                 │  - upsert in public.hub_chunks         │
                 └───────────────┬────────────────────────┘
                                 ▼
                 ┌────────────────────────────────────────┐
                 │  public.hub_chunks (pgvector)          │
                 │  + public.hub_glossary (kleine Sicht)  │
                 └───────────────┬────────────────────────┘
                                 ▼
   User ──► Avatar ──► avatar-chat (Edge, AI SDK + Tools)
                       ├─ System-Prompt: kompaktes Glossar
                       └─ Tools: search_hub, get_item, list_recent
                                 (Modell ruft sie selbst auf)
```

## Was der Avatar pro Anfrage sieht

1. Kleines **Glossar** (~1–3 KB) immer im System-Prompt: Zählungen pro Tabelle, neueste 10 Titel je Bereich, Liste der Inhalts-Ordner. Damit weiß er, _was_ existiert, aber nicht _was drin steht_.
2. **Tools**, die er bei Bedarf ruft:
   - `search_hub(query, top_k)` — semantische Suche über alle Chunks
   - `get_item(kind, id_or_filename)` — vollen Inhalt einer Idee / eines Transkripts / einer Karte laden
   - `list_recent(kind, limit)` — letzte N Einträge eines Typs
3. Systemprompt-Regel: _„Wenn du dir nicht sicher bist, **suche oder lade**, halluziniere nie."_

## Wie die Vektor-DB sich von selbst aktuell hält

- **DB-Trigger** auf `ideas`, `wins`, `changelog` → `pg_net.http_post` an `embed-hub` mit `{ kind, id }`. Funktion holt die Zeile, zerlegt sie in Chunks, embedded, upsertet.
- **Cron-Job** (alle 5 Min) für den GitHub-Vault: vergleicht SHA jeder Datei mit `hub_chunks.source_sha` und re-embedded nur Geändertes.
- **Bootstrap-Endpoint** (`embed-hub?mode=full`), den du einmalig oder nach Schema-Änderungen aufrufst.

Du musst am Avatar nichts mehr ändern, wenn neue Tabellen/Dateien dazukommen — du erweiterst nur den Indexer um die neue Quelle, die Tools `search_hub` / `get_item` bleiben gleich.

## Implementierungsschritte

1. **DB-Migration**
   - `create extension vector;`
   - Tabelle `hub_chunks(id, kind, source_id, source_path, chunk_idx, content, embedding vector(1536), source_sha, updated_at)` — wir nehmen 1536 Dim (gemini-embedding-001 mit `dimensions: 1536`), spart Platz und reicht klar.
   - HNSW-Index auf `embedding vector_cosine_ops`.
   - SQL-Funktion `match_hub_chunks(query_embedding, top_k, kinds[])` für die Suche.
   - View `hub_glossary` für den kompakten Überblick.
   - Trigger auf `ideas`/`wins`/`changelog`, die per `pg_net` `embed-hub` anstoßen.

2. **Edge Function `embed-hub`**
   - Modi: `row` (eine Zeile), `file` (eine Vault-Datei), `full` (alles), `cron` (Diffs).
   - Chunking ~800 Zeichen mit 150 Overlap.
   - Embedding via `https://ai.gateway.lovable.dev/v1/embeddings`, Modell `google/gemini-embedding-001`, `dimensions: 1536`.
   - Upsert per `source_id`+`chunk_idx`, alte Chunks der Quelle löschen.

3. **Edge Function `avatar-chat` (umbauen auf AI SDK + Tools)**
   - `streamText` (oder `generateText`) mit drei Tools: `search_hub`, `get_item`, `list_recent`.
   - Vor dem Call lädt sie das Glossar aus `hub_glossary` (1-Sekunden-Cache).
   - `stopWhen: stepCountIs(50)`, damit der Avatar mehrere Suchen hintereinander machen darf.
   - System-Prompt klar: kurz sprechen, immer Tools nutzen statt raten.

4. **Cron für Vault**
   - `pg_cron`: alle 5 Min `embed-hub?mode=cron` aufrufen.

5. **Initialer Backfill**
   - Einmalig `embed-hub?mode=full` triggern, fertig.

## Was du als Nutzer davon merkst

- Avatar antwortet weiter in 1–2 Sek, aber wenn du nach Inhalt fragst, sagt er z.B. „Moment, ich schaue im Brainstorming-Meeting nach…" und antwortet präzise mit Zitat.
- Tokens pro Antwort sinken drastisch (Glossar 1–3 KB statt Snapshot 60 KB).
- Hub kann auf tausende Karten wachsen, ohne dass am Avatar etwas geändert werden muss.
- Neue Tabellen-Quellen einfügen = 1 Trigger + 1 Zeile im Indexer.

## Technische Details

- Embedding-Modell: `google/gemini-embedding-001` mit `dimensions: 1536` (3072 wäre Default, 1536 spart 50 % Index-RAM bei minimal schlechterer Trefferqualität).
- `hub_chunks` bekommt RLS „open all" passend zu deinem bestehenden Stil, plus `GRANT`s für `authenticated`/`service_role`.
- Trigger nutzen `pg_net` (Extension aktivieren) und rufen die Edge Function mit dem `SUPABASE_PUBLISHABLE_KEY` auf — der Service-Role-Key ist auf Lovable Cloud nicht zugänglich.
- Glossar-View aggregiert ohne große Joins: `count(*) per kind`, `array_agg(title order by created_at desc limit 10)`, plus die Vault-Dateinamen aus `hub_chunks` distinct.
- Tool-Calling: AI SDK `tool({ description, inputSchema: z.object(...), execute })`, eingebunden in `streamText`. Die Antwort des Modells bleibt reiner Sprechtext (kein Markdown), damit TTS sie sauber vorliest.
- Kosten: Embeddings sind sehr günstig (~$0.000005 pro 1 K Tokens). Bei 500 Dateien à 5 KB → einmaliger Backfill kostet Centbruchteile, danach nur Diffs.

## Was nicht im Scope ist (jetzt)

- Hybrid-Suche (Vektor + Volltext) — kann später dazu, falls Treffer schwach werden.
- Re-Embedding bei Modellwechsel — würde eine `model_version`-Spalte verlangen, lassen wir vorerst weg.
- UI zum Browsen der Chunks — nicht nötig, Hub-Views bleiben die Wahrheit.

Wenn du grünes Licht gibst, baue ich Schritt 1–5 in einem Rutsch und mache den initialen Backfill.