// The Packed Rabbit: instant unlock after paying on the website (owner, 9 Nov 2026: "I want it to unlock the second they pay";
// switched on 20 Nov 2026). Stripe sends the buyer back to https://packedrabbit.com/app/?paid={CHECKOUT_SESSION_ID};
// the app asks GET /api/unlock?session=cs_live_..., and this asks Stripe whether that checkout is complete and paid.
// If it is, it answers with an unlock code in the app's own format. The same checkout always gets the same code,
// so reopening the page doesn't make a new one. Nothing about the buyer is kept: only the checkout ID and its code.
// The Stripe key is a restricted key (Checkout Sessions: Read) the owner pastes into the hub; it stays in the
// private secrets table and is never returned by any route. Codes for gifts and beta testers are made elsewhere.
const A = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", B = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ", SPACE = 36 ** 4;
function codeSum(body) {   /* the app's own check, from moving-command-center.jsx */
  let n = 0;
  for (let i = 0; i < body.length; i++) n = (n * 131 + body.charCodeAt(i) * 7919) % SPACE;
  let out = "", v = n;
  for (let i = 0; i < 4; i++) { out = A[v % 36] + out; v = Math.floor(v / 36); }
  return out;
}
function newCode() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  let body = "MP";
  for (const x of r) body += B[x % B.length];
  const c = body + codeSum(body);
  return c.slice(0, 5) + "-" + c.slice(5, 10) + "-" + c.slice(10);
}
const reply = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" } });

export async function onRequestGet({ request, env }) {
  const db = env.HUB;
  const cs = new URL(request.url).searchParams.get("session") || "";
  if (!/^cs_live_[A-Za-z0-9]{10,200}$/.test(cs)) return reply({ ok: false, why: "That link isn't from a payment." }, 400);
  if (!db) return reply({ ok: false, why: "Not set up yet. Your code comes by email within the hour." }, 503);
  const key = await db.prepare("SELECT v FROM secrets WHERE k = 'stripe_unlock'").first("v");
  if (!key) return reply({ ok: false, why: "Thank you. Your code comes by email within the hour; put it in on the membership screen." }, 503);
  const path = "paid/" + cs.replace(/[^A-Za-z0-9_]/g, "").slice(0, 80);
  const had = await db.prepare("SELECT data FROM docs WHERE path = ?").bind(path).first("data");
  if (had) return reply({ ok: true, code: JSON.parse(had).code });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(cs), { headers: { authorization: "Bearer " + key } });
  if (!r.ok) return reply({ ok: false, why: r.status === 404 ? "We couldn't find that payment." : "Stripe didn't answer. Open this page again in a minute." }, r.status === 404 ? 404 : 502);
  const j = await r.json();
  const paid = j.status === "complete" && (j.payment_status === "paid" || j.payment_status === "no_payment_required");
  if (!paid) return reply({ ok: false, why: "The payment hasn't come through yet. Open this page again in a minute." }, 202);
  const code = newCode(), now = Date.now();
  await db.prepare("INSERT OR IGNORE INTO docs (path, coll, data, updated) VALUES (?, 'paid', ?, ?)").bind(path, JSON.stringify({ code, at: now, mode: j.mode || "" }), now).run();
  const kept = await db.prepare("SELECT data FROM docs WHERE path = ?").bind(path).first("data");
  return reply({ ok: true, code: kept ? JSON.parse(kept).code : code });
}
