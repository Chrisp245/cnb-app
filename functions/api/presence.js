// Presences CNB (Cloudflare Pages Function + base D1)
// Meme contrat que l'ancienne fonction Netlify :
//   GET  /api/presence?group=avenirs|benjamins  -> { presence: [[true,false,...], ...] }
//   POST /api/presence?group=...  { i, j, value }  ou  { reset: true }
// Binding D1 requis : DB  (voir GUIDE-MIGRATION.md)

const GROUPS = ["avenirs", "benjamins"];
const MAX_INDEX = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: corsHeaders });

function resolveGroup(request) {
  const g = (new URL(request.url).searchParams.get("group") || "avenirs").toLowerCase();
  return GROUPS.includes(g) ? g : "avenirs";
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!env.DB) return json({ error: "db_not_bound" }, 500);

  const grp = resolveGroup(request);

  try {
    if (request.method === "GET") {
      const { results } = await env.DB
        .prepare("SELECT i, j, value FROM presence WHERE grp = ?")
        .bind(grp)
        .all();
      const presence = [];
      let maxI = -1;
      for (const r of results) if (r.i > maxI) maxI = r.i;
      for (let k = 0; k <= maxI; k++) presence[k] = [];
      for (const r of results) presence[r.i][r.j] = r.value === 1;
      return json({ presence });
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => null);

      if (body && body.reset === true) {
        await env.DB.prepare("DELETE FROM presence WHERE grp = ?").bind(grp).run();
        return json({ ok: true, reset: true });
      }

      const { i, j, value } = body || {};
      if (
        !Number.isInteger(i) || !Number.isInteger(j) ||
        i < 0 || j < 0 || i > MAX_INDEX || j > MAX_INDEX ||
        typeof value !== "boolean"
      ) {
        return json({ error: "invalid_body" }, 400);
      }

      await env.DB
        .prepare(
          "INSERT INTO presence (grp, i, j, value) VALUES (?, ?, ?, ?) " +
          "ON CONFLICT(grp, i, j) DO UPDATE SET value = excluded.value",
        )
        .bind(grp, i, j, value ? 1 : 0)
        .run();
      return json({ ok: true });
    }

    return json({ error: "method_not_allowed" }, 405);
  } catch (err) {
    return json({ error: "handler_failed", detail: String(err) }, 500);
  }
}
