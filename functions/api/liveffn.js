// Relais LiveFFN : le navigateur ne peut pas lire liveffn.com directement (CORS).
// Usage : /api/liveffn?competition=94487&epr=3   -> HTML de la page de resultats de l'epreuve
// Seul liveffn.com est autorise ; reponse mise en cache 15 s.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=15",
};

export async function onRequest({ request }) {
  const u = new URL(request.url);
  const competition = u.searchParams.get("competition") || "";
  const epr = u.searchParams.get("epr") || "";
  const page = u.searchParams.get("page") === "startlist" ? "startlist" : "resultats";
  if (!/^\d{1,8}$/.test(competition) || (epr && !/^\d{1,3}$/.test(epr))) {
    return new Response("bad_request", { status: 400, headers: corsHeaders });
  }
  let target = `https://www.liveffn.com/cgi-bin/${page}.php?competition=${competition}&langue=fra`;
  if (epr) target += `&go=epreuve&epreuve=${epr}`;
  try {
    const r = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0 (CNB live)" } });
    const html = await r.text();
    return new Response(html, {
      status: r.status,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response("upstream_failed " + String(err), { status: 502, headers: corsHeaders });
  }
}
