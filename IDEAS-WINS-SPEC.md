# Build-Spec: Ideas-Pipeline + Wins-Tracker (Workshop 1)

_Für den Lovable-Agenten. App: `fayamonkey/private-content-hub` (Lovable Cloud aktiv)._
_Grundlage: Meeting-Beschlüsse 2026-06-09 + Igors Referenz (Alfredo Board / Hub Requests)._

---

## Überblick

Zwei verbundene Features als neue Hub-Bereiche:

1. **Ideas-Pipeline** — ein einfaches Kanban, in das Mitglieder Verbesserungs-/Build-Ideen
   für ihren eigenen Agenten/Hub kippen und nach rechts schieben.
2. **Wins-Tracker** — sobald eine Idee auf „Erledigt" landet, entsteht automatisch ein „Win".

**Wichtig (Vereinfachung aus dem Meeting):** Bewusst **kein** Approved/Rejected, **kein**
Hintergrund-Cron, der das Board verwaltet. Es ist ein „dummes", schönes Board zum
Ideen-Festhalten + ein Copy-Button. KI nur **auf Knopfdruck**.

---

## Speicherung: Lovable Cloud (Supabase)

Das Board ist interaktiv → Zustand in der DB (nicht in GitHub). Lege diese Tabellen an
(mit RLS, privat pro Projekt):

**`ideas`**
| Feld | Typ | Notiz |
| --- | --- | --- |
| id | uuid (PK) | |
| title | text | Pflicht |
| context | text | freies Kontextfeld |
| category | text | z.B. Tool, Content, System (frei) |
| status | text | `idea` \| `in_progress` \| `done` |
| position | int | Reihenfolge in der Spalte |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | |

**`wins`**
| Feld | Typ | Notiz |
| --- | --- | --- |
| id | uuid (PK) | |
| idea_id | uuid | FK → ideas.id |
| title | text | |
| summary | text | 1–2 Sätze |
| created_at | timestamptz | default now() |

**`changelog`**
| Feld | Typ | Notiz |
| --- | --- | --- |
| id | uuid (PK) | |
| entry_date | date | |
| title | text | |
| category | text | |
| summary | text | |

---

## Feature A — Ideas-Pipeline (Kanban)

**Neuer Nav-Eintrag „💡 Ideas" → Route `/ideas`.** Look & Verhalten wie Igors
`board.alfredos.app` (Drag-and-Drop zwischen Spalten), aber **nur drei Spalten**:

```
[ Ideen ]   →   [ In Arbeit ]   →   [ Erledigt ]
```

- **Karte anlegen:** „+ Neue Idee" pro Spalte (oder global). Felder: Titel (Pflicht),
  Kontext (optional), Kategorie (optional).
- **Drag-and-Drop:** Karten zwischen Spalten und innerhalb sortierbar → `status` +
  `position` aktualisieren.
- **Karten-Detail (Klick):** Titel, Kontext (editierbar), Kategorie, Status, Daten.
- **„Copy to Cowork"-Button** (wie „Copy for Alfredo"): kopiert einen **strukturierten
  Prompt** in die Zwischenablage:
  ```
  Idee: <title>
  Kategorie: <category>
  Karten-ID: <id>
  Kontext: <context>

  Wenn erledigt, hänge einen Eintrag an meinen Changelog unter dem heutigen Datum
  mit Titel und 1–2-Satz-Zusammenfassung dessen, was gebaut wurde.
  ```
  Der User fügt das selbst in Cowork ein. **Nicht** automatisch verdrahten.
- Optionale KI-Knöpfe (nur auf Klick, nicht automatisch): „Kontext mit meiner DNA
  ergänzen" / „Das recherchieren". Für die erste Version weglassen ist ok.

---

## Feature B — Wins-Tracker

**Neuer Nav-Eintrag „🏆 Wins" → Route `/wins`.**

- **Trigger (gelockt, Stephanies Idee):** Sobald eine Karte auf **`done`** wechselt,
  **automatisch**:
  1. einen `wins`-Eintrag erzeugen (title = Idee-Titel, summary = Kontext/kurz),
  2. einen `changelog`-Eintrag anhängen (entry_date = heute, title, category, summary).
- **Wins-Ansicht:** zeigt die Wins als Karten. Jede Win-Karte als **quadratische
  HTML-Kachel** (social-tauglich, später exportierbar). „Wall of Wins".
- **Optional/später:** ein wöchentlicher Cowork-Task liest den `changelog` und erzeugt
  einen zusammengefassten „Wall of Wins"-Post in der Stimme des Mitglieds. (Nicht Teil
  dieser ersten Version — nur DB-Felder bereitstellen.)

---

## Im Workshop (Kontext für die UI, nicht zwingend zu bauen)

- Beide Features kommen **vorgebaut** im Starter; Mitglieder personalisieren nur.
- Live-Moment: jede:r legt **eine** Idee an → nach „In Arbeit" → bis Ende auf „Erledigt"
  → ein Win erscheint automatisch.

---

## Abgrenzung / Regeln

- **Privat** bleiben (RLS, kein Web-Publish nötig).
- Inhalts-Karten (`/content` via `get-cards`) **nicht** anfassen — die laufen schon.
- Ideas/Wins/Changelog leben in **Supabase**, nicht in GitHub.
- Stil/Look konsistent mit dem bestehenden Hub.
- **Kein** automatischer Cron auf dem Board. KI nur auf expliziten Knopfdruck.

---

## Akzeptanzkriterien

- [ ] „💡 Ideas"-Space mit 3-Spalten-Kanban, Karten per Drag-and-Drop verschiebbar.
- [ ] Idee anlegen/bearbeiten (Titel, Kontext, Kategorie); Reihenfolge bleibt erhalten.
- [ ] „Copy to Cowork" kopiert den strukturierten Prompt.
- [ ] Karte → „Erledigt" erzeugt automatisch einen Win **und** einen Changelog-Eintrag.
- [ ] „🏆 Wins"-Space zeigt die Wins als quadratische HTML-Kacheln.
- [ ] Alles privat (Supabase RLS), Inhalts-Karten unverändert lauffähig.
