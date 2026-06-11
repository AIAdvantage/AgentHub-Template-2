// Runtime loader: fetches cards via Lovable Cloud Edge Function "get-cards",
// which reads the (private) GitHub repo server-side. No token in the browser.
// New cards show up after a normal reload — no rebuild required.

export function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  m[1].split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return { fm, body: m[2] };
}

const _cache = new Map();
async function fetchAll(repo, folder) {
  const key = `${repo}::${folder}`;
  if (_cache.has(key)) return _cache.get(key);
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `https://${projectId}.supabase.co/functions/v1/get-cards?repo=${encodeURIComponent(repo)}&folder=${encodeURIComponent(folder)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${anon}`, apikey: anon },
  });
  if (!res.ok) throw new Error(`get-cards ${res.status}: ${await res.text()}`);
  const data = await res.json();
  _cache.set(key, data);
  return data;
}

export async function loadVault(repo, folder) {
  const { cards: raws } = await fetchAll(repo, folder);
  const cards = (raws || []).map(({ file, content }) => {
    const { fm, body } = parseFrontmatter(content);
    return { file, fm, body };
  });
  const rungOrder = { R5: 5, R4: 4, R3: 3, R2: 2, R1: 1 };
  cards.sort(
    (a, b) =>
      (rungOrder[(b.fm.rung || "").toUpperCase()] || 0) -
      (rungOrder[(a.fm.rung || "").toUpperCase()] || 0)
  );
  return cards;
}

export async function loadDna(repo, folder = "content") {
  const { dna } = await fetchAll(repo, folder);
  return (dna || []).map(({ file, content }) => ({
    name: file,
    title: file.replace(/\.md$/, "").replace(/-/g, " ").replace(/dna/i, "DNA"),
    raw: content,
  }));
}

/** Fast metadata-only list (no full body). Used by Transcripts overview. */
export async function loadVaultMeta(repo, folder) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `https://${projectId}.supabase.co/functions/v1/get-cards?mode=list&repo=${encodeURIComponent(repo)}&folder=${encodeURIComponent(folder)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${anon}`, apikey: anon } });
  if (!res.ok) throw new Error(`get-cards list ${res.status}`);
  const { items } = await res.json();
  return items || [];
}

const _fileCache = new Map();
/** Lazy-load a single file's full body on demand. */
export async function loadVaultFile(repo, path) {
  const key = `${repo}::${path}`;
  if (_fileCache.has(key)) return _fileCache.get(key);
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `https://${projectId}.supabase.co/functions/v1/get-cards?mode=file&repo=${encodeURIComponent(repo)}&file=${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${anon}`, apikey: anon } });
  if (!res.ok) throw new Error(`get-cards file ${res.status}`);
  const data = await res.json();
  _fileCache.set(key, data);
  return data;
}

export function mdToHtml(s) {
  return s
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/^\s*\d+\. (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "<br/><br/>");
}
