# Paste this as the FIRST message when you connect this repo to a new Lovable project

You are adopting an existing, working web app from this GitHub repo. It is a **plain
Vite + React "AI Hub"** with exactly three features: a content **Hub**, an **Ideas**
pipeline (Kanban), and a **Wins** tracker. Wire it up to run in Lovable + Lovable Cloud —
do NOT redesign or rebuild it.

## Hard rules
- KEEP the existing plain Vite + React app as-is. Do NOT rebuild it on TanStack Start or
  another stack unless something genuinely won't run otherwise.
- Do NOT skip the GitHub vault content read — it is the core mechanic.
- Do NOT add features (no Avatar, no Transcripts, no extra spaces). Only Hub + Ideas + Wins.

## How it already works (implemented in this repo)
- **Hub:** markdown "cards" come from the connected GitHub repo's `/content` folder, read AT
  RUNTIME via the Supabase Edge Function `supabase/functions/get-cards` — it reads the private
  repo server-side using a `GITHUB_VAULT_TOKEN` secret and returns the cards. **No token in the
  browser.** The hub calls it from `src/lib/vault.js`.
- **Ideas + Wins:** live in Lovable Cloud (Supabase). Schema in `supabase/migrations/`
  (tables `ideas`, `wins`, `changelog`; moving an idea to "done" auto-creates a win).
- **Config:** `src/config.js` is the only file the user edits (`ownerName`, `githubRepo`,
  `vaultFolder: "content"`).

## Do exactly this
1. Activate Lovable Cloud (Supabase) for this project.
2. Apply the migrations in `supabase/migrations/` (ideas/wins/changelog + functions).
3. Deploy the `get-cards` edge function.
4. Add a secret `GITHUB_VAULT_TOKEN` (the user pastes a GitHub fine-grained token with
   Contents: Read on their vault repo). Prompt the user to set it.
5. Build and run.

## Done when
- App builds and runs, nav shows only **Home + 💡 Ideas + 🏆 Wins**.
- Ideas board (drag-and-drop) and Wins tracker work via Lovable Cloud.
- Hub is ready to show markdown cards once `src/config.js` points at a vault repo and
  `GITHUB_VAULT_TOKEN` is set (an empty hub before that is expected — not an error).

Ask nothing else — just do the above.
