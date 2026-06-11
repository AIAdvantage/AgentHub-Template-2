# Build Your AI Hub — Complete Setup Guide (Workshop 1)

_From zero to a private Hub where everything your AI builds shows up in one place —
plus an Ideas board and a Wins tracker. No coding. Follow every step in order._

---

## What you'll have at the end
A private web app (your **Hub**) that:
- shows the markdown files your **Claude Cowork** agent writes, as cards,
- has an **Ideas** board (drag ideas: Ideas → In Progress → Done),
- has a **Wins** tracker (every idea you finish becomes a win automatically).

**How it works in one sentence:** *Your Cowork agent writes a file to GitHub → your Hub
reads it and shows it.* GitHub is your private vault; Lovable hosts the Hub; Lovable Cloud
runs the Ideas/Wins database.

---

## What you need (prerequisites)
1. **Claude Cowork** — you already have this from the program.
2. **A GitHub account** (free) — your private storage. We'll create it below.
3. **A Lovable account** (free to start) — builds and hosts your Hub.
4. The **template link** (your trainer provides it):
   `https://github.com/fayamonkey/AgentHub-Template`

> 💡 Tip: do this on a computer (not phone), in Chrome. Keep this guide open in one tab.

---

## PART 0 — Create your accounts

### 0.1 GitHub
1. Go to **github.com** → **Sign up**.
2. Enter email, password, a username → verify your email. Done — that's your free account.

### 0.2 Lovable
1. Go to **lovable.dev** → **Sign up** (you can use "Continue with GitHub").
2. You're in. We'll come back here in Part 1.

---

## PART 1 — Create your Hub from the template

1. In **Lovable**, start a **new project** and **connect it to the template GitHub repo**
   (`fayamonkey/AgentHub-Template`). When asked, allow Lovable to access GitHub
   (the one-click GitHub App — no tokens here yet).
2. As your **very first message** to Lovable, paste the **setup prompt** (it's in the
   template repo as `LOVABLE-SETUP-PROMPT.md`, and your trainer provides it). It tells
   Lovable exactly what to do so it doesn't ask questions.
3. Lovable now builds your Hub: it **activates Lovable Cloud**, sets up the Ideas/Wins
   database, deploys the content reader, and **creates your own private repo** for this
   project.
4. **Write down your repo name.** In Lovable open **Settings → Git** (or **+ → GitHub →
   Manage**) and note it, e.g. `yourname/agent-hub-xyz`. **You need this in Part 2 and 4.**

> ✅ At this point your Hub builds and shows **Home + 💡 Ideas + 🏆 Wins**. The Hub area
> will say *"Your vault is empty"* — that's correct, we connect content next.

---

## PART 2 — Create your GitHub access token

This token is the **bridge**: your Hub uses it (server-side) to *read* your private repo,
and your Cowork agent uses it to *write* to it.

1. On **GitHub**, top-right avatar → **Settings**.
2. Left sidebar, scroll down → **Developer settings**.
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. Fill in:
   - **Token name:** `ai-hub`
   - **Expiration:** 90 days (or longer)
   - **Repository access:** choose **Only select repositories** → pick **your repo from
     Part 1** (`yourname/agent-hub-xyz`).
   - **Permissions:** click **Repository permissions** → find **Contents** → set it to
     **Read and write**.
5. Click **Generate token** → **copy** the token (it starts with `github_pat_…`).
   Keep it somewhere safe for the next two steps.

> ⚠️ Copy ONLY the token — no spaces, no line breaks. A stray space causes a
> "Bad credentials" error later.

---

## PART 3 — Give the token to your Hub (the secret)

1. Back in **Lovable**, open your project's **Lovable Cloud / secrets** settings.
2. Add a secret named **exactly** `GITHUB_VAULT_TOKEN` and paste your token as the value.
   Save.

> This lets your Hub's content reader open your private repo. The token lives only on the
> server — never in the browser.

---

## PART 4 — Point your Hub at your repo

1. In the **Lovable chat**, type this one line (replace with your repo from Part 1):
   > Set `githubRepo` in `src/config.js` to `yourname/agent-hub-xyz`.
2. Lovable edits that one line and rebuilds. (Optional: also set `ownerName` to your name.)

> `src/config.js` is the **only file you ever edit**. `vaultFolder` stays `"content"`.

---

## PART 5 — Feed your Hub from Claude (the magic moment)

Now make your Cowork agent write a card into your repo's `content/` folder.

1. In **Claude Cowork**, make sure your agent can reach a folder on your computer (your
   workspace). Save your token there in a small text file, e.g. `gh-token.txt`
   (just the token, one line). *(Your agent reads it to authenticate with GitHub. Never
   put this file inside a public repo.)*
2. Ask your agent, for example:
   > Take this text and save it as a markdown file with this frontmatter
   > (title, emoji, rung, category: tools, updated), then commit it to my GitHub repo
   > `yourname/agent-hub-xyz` in the `content/` folder. Use the token in `gh-token.txt`.
3. A markdown card like this is what gets saved:
   ```
   ---
   title: My First Card
   emoji: 📰
   rung: R4
   category: tools
   updated: 2026-06-11
   ---
   # Hello from my AI
   This card was written by my Cowork agent and committed to my vault.
   ```
4. **Reload your Hub** (normal refresh). Your card appears under **Tools**. 🎉

> 🔁 To make this automatic: add one line to any Cowork **scheduled task** — *"…also save
> the result as a markdown file and commit it to my GitHub vault's content/ folder."* From
> then on, every run drops a fresh card into your Hub.

---

## PART 6 — Use Ideas + Wins
- Open **💡 Ideas**: add an idea, drag it across **Ideas → In Progress → Done**.
- The moment it hits **Done**, a **🏆 Win** appears automatically. These live in Lovable
  Cloud (Supabase) and update instantly.
- The **Copy to Cowork** button on a card copies a ready prompt you paste into Cowork.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Hub says *"Your vault is empty"* | Normal until Parts 4–5 are done. Not an error. |
| `get-cards … GitHub 401 "Bad credentials"` | The token (secret) has a stray space/line break, or doesn't include your repo. Re-paste it clean (Part 3) and make sure the token's repo access covers your repo (Part 2). |
| `404 / Vault not found` | `githubRepo` in `src/config.js` doesn't match your real repo, or `content/` doesn't exist yet. Fix Part 4 / push a card (Part 5). |
| New card doesn't show | **Reload the page.** Content loads when the page opens (no auto-refresh by default). |
| Ideas/Wins don't save | Lovable Cloud isn't active. Re-run the setup prompt (Part 1) so the database tables get created. |

---

## Mental model (keep this in mind)
- **GitHub repo** = your private vault (markdown content) **and** the app code, in one place.
- **Token** = the bridge: Hub *reads* with it, Cowork *writes* with it.
- **`src/config.js`** = which repo is your vault (the one file you edit).
- **Cowork** = writes markdown to `content/`. **Your Hub** = reads it and shows it.
- **Ideas/Wins** = live in Lovable Cloud (instant), separate from the GitHub content.
