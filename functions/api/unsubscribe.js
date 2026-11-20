// Unsubscribe for The Packed Rabbit's emails. Anyone can ask to stop getting
// email: the address goes on the suppression list (docs: unsubs/<hash>), and
// every hub contact with that address is set to "do not contact" right away.
// The answer never says whether the address was on file.
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
const MAX = 20, WINDOW = 15 * 60 * 1000;

export async function onRequestPost({ request, env }) {
  const db = env.HUB;
  if (!db) return json({ error: "unavailable" }, 503);
  if (request.headers.get("x-unsub") !== "1") return json({ error: "bad_request" }, 400);
  let body; try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "bad_email" }, 400);
  const ip = "u:" + (request.headers.get("cf-connecting-ip") || "?"), now = Date.now();
  await db.prepare("DELETE FROM attempts WHERE at < ?").bind(now - WINDOW).run();
  const n = await db.prepare("SELECT COUNT(*) AS n FROM attempts WHERE ip = ?").bind(ip).first("n");
  if (n >= MAX) return json({ error: "too_many_tries" }, 429);
  await db.prepare("INSERT INTO attempts (ip, at) VALUES (?, ?)").bind(ip, now).run();

  const key = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email))).slice(0, 32);
  const day = new Date(now).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
  const rows = (await db.prepare("SELECT path, data FROM docs WHERE coll = 'contacts' AND lower(json_extract(data, '$.email')) = ?").bind(email).all()).results;
  const stmts = [db.prepare("INSERT OR REPLACE INTO docs (path, coll, data, updated) VALUES (?, 'unsubs', ?, ?)").bind("unsubs/" + key, JSON.stringify({ email, at: now, contacts: rows.map(r => r.path.slice(9)) }), now)];
  for (const r of rows) {
    const c = JSON.parse(r.data), id = r.path.slice(9);
    if (c.status === "do not contact") continue;
    const before = c.status || "new";
    c.status = "do not contact"; c.last = now;
    c.notes = (c.notes ? c.notes + " · " : "") + `Unsubscribed on ${day} using the unsubscribe page.`;
    stmts.push(db.prepare("UPDATE docs SET data = ?, updated = ? WHERE path = ?").bind(JSON.stringify(c), now, r.path));
    stmts.push(db.prepare("INSERT INTO docs (path, coll, data, updated) VALUES (?, 'activity', ?, ?)").bind("activity/u" + now + id.replace(/[^A-Za-z0-9]/g, ""), JSON.stringify({ contact: id, company: c.company || "", kind: "status", text: `Status: ${before} → do not contact (unsubscribed)`, at: now, by: "Unsubscribe page" }), now));
  }
  await db.batch(stmts);
  return json({ ok: true });
}
