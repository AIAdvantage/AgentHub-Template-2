import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TOKEN = Deno.env.get('GITHUB_VAULT_TOKEN')!;

async function listFolder(repo: string, folder: string) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${folder}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'lovable-hub',
    },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

async function fetchRaw(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.v3.raw',
      'User-Agent': 'lovable-hub',
    },
  });
  if (!res.ok) throw new Error(`raw ${res.status}`);
  return await res.text();
}

function parseFrontmatter(raw: string) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {} as Record<string, string>, body: raw };
  const fm: Record<string, string> = {};
  m[1].split('\n').forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return { fm, body: m[2] };
}

function extractSummary(body: string) {
  const m = body.match(/##\s*(?:Summary|Zusammenfassung)\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (!m) return body.slice(0, 400).trim();
  return m[1].trim().replace(/\s+/g, ' ').slice(0, 400);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const repo = url.searchParams.get('repo') || 'fayamonkey/masteryhub';
    const folder = url.searchParams.get('folder') || 'content';
    const mode = url.searchParams.get('mode'); // 'list' | 'file' | null (default = old combined)
    const file = url.searchParams.get('file');

    // Single file fetch: lazy-load full transcript on click
    if (mode === 'file' && file) {
      const safe = file.replace(/^\/+/, '');
      const content = await fetchRaw(
        `https://api.github.com/repos/${repo}/contents/${safe}`
      );
      const { fm, body } = parseFrontmatter(content);
      return new Response(JSON.stringify({ file: safe, fm, body }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // List-only mode: returns metadata + short summary, NO full body.
    if (mode === 'list') {
      const entries = await listFolder(repo, folder);
      const files = (entries as any[]).filter(
        (e) => e.type === 'file' && e.name.toLowerCase().endsWith('.md') && e.name.toLowerCase() !== 'readme.md'
      );
      const items = await Promise.all(
        files.map(async (f) => {
          try {
            const raw = await fetchRaw(f.download_url || f.url);
            const { fm, body } = parseFrontmatter(raw);
            return {
              file: f.name,
              path: `${folder}/${f.name}`,
              fm,
              summary: extractSummary(body),
              size: raw.length,
            };
          } catch {
            return { file: f.name, path: `${folder}/${f.name}`, fm: {}, summary: '', size: 0 };
          }
        })
      );
      return new Response(JSON.stringify({ items }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=120',
        },
      });
    }

    // Default: combined cards + dna (used by the main Hub view).
    const [vaultEntries, dnaEntries] = await Promise.all([
      listFolder(repo, folder),
      listFolder(repo, `${folder}/dna`),
    ]);

    const vaultFiles = (vaultEntries as any[]).filter(
      (e) => e.type === 'file' && e.name.toLowerCase().endsWith('.md') && e.name.toLowerCase() !== 'readme.md'
    );
    const dnaFiles = (dnaEntries as any[]).filter(
      (e) => e.type === 'file' && e.name.toLowerCase().endsWith('.md')
    );

    const [cards, dna] = await Promise.all([
      Promise.all(
        vaultFiles.map(async (f) => ({ file: f.name, content: await fetchRaw(f.download_url || f.url) }))
      ),
      Promise.all(
        dnaFiles.map(async (f) => ({ file: f.name, content: await fetchRaw(f.download_url || f.url) }))
      ),
    ]);

    return new Response(JSON.stringify({ cards, dna }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
