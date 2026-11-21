// Unsubscribe for The Packed Rabbit's emails. Anyone can ask to stop getting
// email: the address goes on the suppression list (docs: unsubs/<hash>), and
// every hub contact with that address is set to "do not contact" right away.
// The answer never says whether the address was on file.
// Two ways in:
//  1. The unsubscribe page posts JSON (header x-unsub: 1).
//  2. One-click from the mail app (RFC 8058): the List-Unsubscribe header on every hub email points here as
//     /api/unsubscribe?e=<email>&t=<token>, and Gmail or Apple Mail posts "List-Unsubscribe=One-Click" to it.
//     The token is an HMAC of the address (key in the private secrets table), so the link only works for its own address.
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
import { unsubToken } from "../_lib/unsub.js";
const MAX = 20, WINDOW = 15 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function suppress(db, email, how) {
  const now = Date.now();
  const key = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email))).slice(0, 32);
  const day = new Date(now).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
  const rows = (await db.prepare("SELECT path, data FROM docs WHERE coll = 'contacts' AND lower(json_extract(data, '$.email')) = ?").bind(email).all()).results;
  const stmts = [db.prepare("INSERT OR REPLACE INTO docs (path, coll, data, updated) VALUES (?, 'unsubs', ?, ?)").bind("unsubs/" + key, JSON.stringify({ email, at: now, how, contacts: rows.map(r => r.path.slice(9)) }), now)];
  for (const r of rows) {
    const c = JSON.parse(r.data), id = r.path.slice(9);
    if (c.status === "do not contact") continue;
    const before = c.status || "new";
    c.status = "do not contact"; c.last = now;
    c.notes = (c.notes ? c.notes + " · " : "") + `Unsubscribed on ${day} ${how === "one-click" ? "with the unsubscribe button in their mail app" : "using the unsubscribe page"}.`;
    stmts.push(db.prepare("UPDATE docs SET data = ?, updated = ? WHERE path = ?").bind(JSON.stringify(c), now, r.path));
    stmts.push(db.prepare("INSERT INTO docs (path, coll, data, updated) VALUES (?, 'activity', ?, ?)").bind("activity/u" + now + id.replace(/[^A-Za-z0-9]/g, ""), JSON.stringify({ contact: id, company: c.company || "", kind: "status", text: `Status: ${before} → do not contact (unsubscribed)`, at: now, by: how === "one-click" ? "One-click unsubscribe" : "Unsubscribe page" }), now));
  }
  await db.batch(stmts);
}

export async function onRequestPost({ request, env }) {
  const db = env.HUB;
  if (!db) return json({ error: "unavailable" }, 503);
  const url = new URL(request.url);

  // One-click from a mail app: address and token in the link, body "List-Unsubscribe=One-Click".
  if (url.searchParams.get("e") && url.searchParams.get("t")) {
    const email = String(url.searchParams.get("e") || "").trim().toLowerCase().slice(0, 200);
    const t = String(url.searchParams.get("t") || "");
    if (!EMAIL.test(email)) return json({ error: "bad_email" }, 400);
    if (t !== await unsubToken(db, email)) return json({ error: "bad_link" }, 400);
    await suppress(db, email, "one-click");
    return json({ ok: true });
  }

  if (request.headers.get("x-unsub") !== "1") return json({ error: "bad_request" }, 400);
  let body; try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL.test(email)) return json({ error: "bad_email" }, 400);
  const ip = "u:" + (request.headers.get("cf-connecting-ip") || "?"), now = Date.now();
  await db.prepare("DELETE FROM attempts WHERE at < ?").bind(now - WINDOW).run();
  const n = await db.prepare("SELECT COUNT(*) AS n FROM attempts WHERE ip = ?").bind(ip).first("n");
  if (n >= MAX) return json({ error: "too_many_tries" }, 429);
  await db.prepare("INSERT INTO attempts (ip, at) VALUES (?, ?)").bind(ip, now).run();
  await suppress(db, email, "page");
  return json({ ok: true });
}
