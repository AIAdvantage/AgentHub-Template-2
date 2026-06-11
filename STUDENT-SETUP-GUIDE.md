# Build Your AI Hub — Complete Click-by-Click Guide (Workshop 1)

_Total beginner friendly. Every click, every screen. Do them in order — don't skip._

> 🟢 GitHub steps are exact. 🟡 Lovable steps are described from the current flow — your
> trainer's video shows the exact screens (Lovable changes its UI sometimes).

---

## What you'll have at the end
A private website (your **Hub**) where the files your AI writes show up as cards, plus an
**Ideas** board and a **Wins** tracker.
**The idea in one line:** *your Cowork agent writes a file to GitHub → your Hub shows it.*

## What you need
- **Claude Cowork** (you have it).
- A free **GitHub** account (we make it below).
- A free **Lovable** account (we make it below).
- The **template link**: `https://github.com/fayamonkey/AgentHub-Template`
- A computer with **Chrome**. Keep this guide open in one tab.

---

## 🟢 PART 0A — Make a GitHub account (≈3 min)
1. Open a new browser tab.
2. In the address bar type **github.com** and press **Enter**.
3. You see GitHub's homepage. Top-right, click the **Sign up** button.
4. Type your **email** → click **Continue**.
5. Type a **password** → click **Continue**.
6. Type a **username** (e.g. `dirk-hub`) → click **Continue**.
7. If asked, solve the little puzzle, then click **Create account**.
8. GitHub sends a **code to your email**. Open your email, copy the code, paste it on the
   GitHub page.
9. ✅ You now see your GitHub home screen. Leave this tab open.

## 🟡 PART 0B — Make a Lovable account (≈1 min)
1. Open another new tab → go to **lovable.dev** → press **Enter**.
2. You see Lovable's homepage with a big prompt box in the middle.
3. Top-right, click **Sign up** (or **Get started**).
4. Click **Continue with GitHub** (reuses the account you just made).
5. A GitHub window asks to authorize Lovable → click **Authorize**.
6. ✅ You're now on Lovable. Leave this tab open.

---

## 🟡 PART 1 — Build your Hub from the template (≈5 min, mostly waiting)

1. Go to your **Lovable** tab. You land on the **dashboard**: a colorful page that says
   **"Let's build something, <your name>"** with a big **chat box** in the middle
   (placeholder text: *"Ask Lovable to generate a report on…"*) and a left sidebar
   (Home, Search, Projects…).
2. Click into that **chat box**.
3. **Paste the setup prompt** (your trainer gives it; it's also in the template as
   `LOVABLE-SETUP-PROMPT.md`). The prompt already contains the **template repo URL** and
   all the build instructions — so you do **NOT** connect GitHub here. *(That option isn't
   available at this step; it happens later, in Part 1B.)*
4. **What you see:** your pasted text fills the chat box.
5. Press **Enter** (or click the round **↑** button on the right of the box).
6. **What you see:** Lovable opens a project view and starts **thinking**, then writes out
   a **Plan**.
7. If a **plan / approve** prompt appears, click **Approve** (or **Start**). Then wait —
   Lovable builds for a minute or two and turns on **Lovable Cloud**.
8. ✅ **What you see when done:** a preview titled **"My AI Hub"** with the top menu
   **Home · 💡 Ideas · 🏆 Wins · Tools · Library**, and the Home area saying *"Your vault is
   empty"* — that's **correct**, not an error.

## 🟡 PART 1B — Connect GitHub (this creates your own repo)
_(Exact screens to be added from the live flow — see note at the end of this guide.)_
1. In your Lovable project, open the **GitHub / Git** option and **connect GitHub**.
2. Lovable creates **your own private repo** for this project (e.g.
   `yourname/agent-hub-xxxx`).
3. **Find and copy your repo name:** Settings → **Git** → "Repository connection" shows
   `yourname/agent-hub-xxxx` with a green **Connected**. **Copy it** — you need it in
   Part 2 and Part 4.

---

## 🟢 PART 2 — Make your GitHub token (≈3 min)

> This token is the **bridge**: your Hub uses it to *read* your repo, your AI uses it to *write*.

1. Go to your **GitHub** tab.
2. Top-right, click your **round profile picture** → in the menu click **Settings**.
3. Left sidebar: scroll all the way down → click **Developer settings** (last item).
4. Left sidebar: click **Personal access tokens** → then **Fine-grained tokens**.
5. Click the **Generate new token** button (top right).
6. **Token name:** type `ai-hub`.
7. **Expiration:** pick **90 days**.
8. **Repository access:** click **Only select repositories** → a search box appears →
   type and select **your repo from Part 1** (`yourname/agent-hub-xxxx`).
9. Scroll to **Permissions** → click **Repository permissions** → find **Contents** in the
   list → on its dropdown choose **Read and write**.
10. Scroll down → click **Generate token**.
11. **What you see:** a green box with your token, starting with `github_pat_…`. Click the
    **copy** icon. **Copy ONLY the token — no spaces, no line breaks.**
12. Paste it temporarily into a notes app — you'll use it in Part 3 and Part 5.

---

## 🟡 PART 3 — Give the token to your Hub (≈2 min)
1. Back in the **Lovable** tab, open your project's **Settings** → look for **Cloud**,
   **Secrets**, or **Environment variables**.
2. Click **Add secret** (or **New variable**).
3. **Name:** type exactly `GITHUB_VAULT_TOKEN`.
4. **Value:** paste your token from Part 2.
5. Click **Save**.
6. ✅ The secret is stored. (Your Hub can now read your private repo.)

---

## 🟡 PART 4 — Point your Hub at your repo (≈1 min)
1. In the **Lovable chat box** (left), type this one line (use your repo from Part 1):
   > Set githubRepo in src/config.js to yourname/agent-hub-xxxx
2. Press **Enter**.
3. **What you see:** Lovable says it edited `config.js` and rebuilds.
4. (Optional) Type: `Also set ownerName in src/config.js to <Your Name>`.
5. ✅ Done. Your Hub now points at your own repo.

---

## 🟢/🟡 PART 5 — Feed your Hub from Claude (the magic moment, ≈3 min)
1. Open **Claude Cowork**.
2. Make sure Cowork has access to a **folder on your computer** (your workspace).
3. In that folder, create a small text file named **`gh-token.txt`** and paste **only your
   token** (one line). Save. *(Cowork reads this to log in to GitHub. Never put this file in
   a public place.)*
4. In Cowork, type a message like:
   > Save this text as a markdown file with frontmatter (title, emoji, rung: R4,
   > category: tools, updated: today), then commit it to my GitHub repo
   > `yourname/agent-hub-xxxx` in the `content/` folder. Use the token in `gh-token.txt`.
   > Text: "Hello from my AI — this is my first Hub card."
5. Cowork does it and tells you it pushed the file.
6. Go to your **Hub** Preview → **reload the page** (normal refresh, F5).
7. ✅ **What you see:** a new card under **Tools** with your text. **That's content written
   by your AI, showing in your Hub.** 🎉

> 🔁 To make it automatic later: add one line to any Cowork **scheduled task** — *"…also
> save the result as a markdown file and commit it to my GitHub vault's content/ folder."*

---

## 🟡 PART 6 — Use Ideas + Wins (≈2 min)
1. In your Hub top menu, click **💡 Ideas**.
2