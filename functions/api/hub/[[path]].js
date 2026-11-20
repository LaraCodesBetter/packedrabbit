// The Packed Rabbit hub: storage and sign-in on packedrabbit.com.
// Data lives in the Cloudflare D1 database bound as HUB. Each person on the
// team signs in with their own long random code (only its salted SHA-256 hash
// is stored); a correct code gives that browser a session cookie for 400 days.
// Roles: owner (everything, manages the team), admin (everything but the
// team), member (reads and edits), viewer (reads only). AI team members such
// as Claude have no code: they work through the database connection.
const COOKIE = "prhub";
const SESSION_DAYS = 400;
const MAX_TRIES = 10, TRY_WINDOW = 15 * 60 * 1000;
const SEG = /^[A-Za-z0-9_-]{1,80}$/;

const json = (b, s = 200, h = {}) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", ...h } });
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
const sha = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const norm = c => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ROLES = ["admin", "member", "viewer"];
const ABC = "abcdefghjkmnpqrstuvwxyz23456789";
const newCode = () => { const b = crypto.getRandomValues(new Uint8Array(24)); let o = ""; for (let i = 0; i < 24; i++) o += (i && i % 4 === 0 ? "-" : "") + ABC[b[i] % ABC.length]; return o; };
const userOut = u => ({ id: u.id, name: u.name || (u.id === "owner" ? "Lara" : u.id), role: u.role || (u.id === "owner" ? "owner" : "member"), email: u.email || "", kind: u.kind || "person", created: u.created, lastSeen: u.last_seen || null, canSignIn: !!u.hash });

function validPath(p, wantDoc) {
  if (typeof p !== "string") return false;
  const s = p.split("/");
  if (s.length > 6 || !s.every(x => SEG.test(x))) return false;
  return wantDoc ? s.length % 2 === 0 : s.length % 2 === 1;
}
const collOf = p => p.slice(0, p.lastIndexOf("/"));

// Activity feed: every change to a contact, written by the server so nothing is missed.
const WATCH = { status: "Status", cls: "Class", email: "Email", phone: "Phone", company: "Company", name: "Person", role: "Role", city: "City", state: "State", website: "Website", notes: "Notes", source: "Source page", leadSource: "Lead source" };
const EV = { outreach: "Email we sent", inbound: "Email they sent", reply: "Reply", beta: "Joined the beta", purchase: "Purchase", open: "Opened our email", call: "Call or meeting", note: "Note" };
function activityFor(path, before, after, who) {
  const s = path.split("/");
  if (s[0] !== "contacts") return [];
  const company = (s.length === 2 ? after.company : null) || (before && before.company) || "";
  if (s.length === 2) {
    if (!before) return [{ contact: s[1], company, kind: "added", text: "Added to the hub" + (after.status && after.status !== "new" ? " as " + after.status : "") }];
    const out = [];
    if (after.status !== undefined && after.status !== before.status) out.push({ contact: s[1], company, kind: "status", text: `Status: ${before.status || "new"} → ${after.status}` });
    const changed = Object.keys(WATCH).filter(k => k !== "status" && after[k] !== undefined && String(after[k] ?? "") !== String(before[k] ?? ""));
    if (changed.length) out.push({ contact: s[1], company, kind: "edit", text: "Updated " + changed.map(k => WATCH[k].toLowerCase()).join(", ") });
    return out;
  }
  if (s.length === 4 && s[2] === "events" && !before) return [{ contact: s[1], company, kind: after.type === "note" ? "note" : "email", text: (EV[after.type] || after.type) + (after.subject ? ": " + after.subject : "") }];
  return [];
}

async function session(req, db) {
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)prhub=([A-Za-z0-9]+)/);
  if (!m) return null;
  const th = await sha(m[1]);
  const row = await db.prepare("SELECT expires, user_id FROM sessions WHERE token_hash = ?").bind(th).first();
  if (!row || row.expires <= Date.now()) return null;
  const uid = row.user_id || "owner"; // sessions from before the team existed are Lara's
  const u = await db.prepare("SELECT * FROM auth WHERE id = ?").bind(uid).first();
  if (!u || !u.hash) return null; // removed from the team
  return { ...userOut(u), tokenHash: th };
}

export async function onRequest({ request, env, params }) {
  const db = env.HUB;
  if (!db) return json({ error: "storage_not_connected" }, 503);
  const route = (params.path || []).join("/");
  const url = new URL(request.url);
  const post = request.method === "POST";
  if (post && request.headers.get("x-hub") !== "1") return json({ error: "bad_request" }, 400);
  let body = {};
  if (post) { try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); } }

  if (route === "login" && post) {
    const ip = request.headers.get("cf-connecting-ip") || "?";
    const now = Date.now();
    await db.prepare("DELETE FROM attempts WHERE at < ?").bind(now - TRY_WINDOW).run();
    const n = await db.prepare("SELECT COUNT(*) AS n FROM attempts WHERE ip = ?").bind(ip).first("n");
    if (n >= MAX_TRIES) return json({ error: "too_many_tries" }, 429);
    const rows = (await db.prepare("SELECT id, hash, salt FROM auth WHERE hash <> ''").all()).results;
    let a = null;
    for (const r of rows) if (same(await sha(r.salt + norm(body.code)), r.hash)) a = r;
    if (!a) {
      await db.prepare("INSERT INTO attempts (ip, at) VALUES (?, ?)").bind(ip, now).run();
      return json({ error: "wrong_code" }, 401);
    }
    const tok = hex(crypto.getRandomValues(new Uint8Array(32)));
    const exp = now + SESSION_DAYS * 864e5;
    await db.batch([db.prepare("INSERT INTO sessions (token_hash, created, expires, label, user_id) VALUES (?, ?, ?, ?, ?)").bind(await sha(tok), now, exp, (request.headers.get("user-agent") || "").slice(0, 120), a.id), db.prepare("UPDATE auth SET last_seen = ? WHERE id = ?").bind(now, a.id)]);
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=${tok}; Path=/api/hub; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Strict` });
  }

  const s = await session(request, db);
  if (!s) return json({ error: "signed_out" }, 401);

  if (route === "me") {
    const seeded = await db.prepare("SELECT 1 FROM docs WHERE path = 'meta/seeded'").first();
    const { tokenHash, ...me } = s;
    return json({ ok: true, seeded: !!seeded, user: me });
  }
  if (route === "users") {
    const r = await db.prepare("SELECT * FROM auth ORDER BY created").all();
    return json({ users: r.results.map(userOut) });
  }
  if (route.startsWith("users/") && post) {
    if (s.role !== "owner") return json({ error: "owner_only" }, 403);
    const now = Date.now();
    if (route === "users/add") {
      const name = String(body.name || "").trim().slice(0, 60), role = ROLES.includes(body.role) ? body.role : "member";
      if (!name) return json({ error: "name_needed" }, 400);
      const id = "u" + hex(crypto.getRandomValues(new Uint8Array(6)));
      const code = newCode(), salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      await db.prepare("INSERT INTO auth (id, hash, salt, created, name, role, email, kind) VALUES (?, ?, ?, ?, ?, ?, ?, 'person')").bind(id, await sha(salt + norm(code)), salt, now, name, role, String(body.email || "").trim().slice(0, 120)).run();
      return json({ ok: true, id, code });
    }
    const id = String(body.id || "");
    const u = await db.prepare("SELECT * FROM auth WHERE id = ?").bind(id).first();
    if (!u || id === "owner") return json({ error: "not_found" }, 404);
    if (route === "users/role") {
      if (!ROLES.includes(body.role)) return json({ error: "bad_role" }, 400);
      await db.prepare("UPDATE auth SET role = ? WHERE id = ?").bind(body.role, id).run();
      return json({ ok: true });
    }
    if (route === "users/newcode") {
      if (u.kind === "ai") return json({ error: "ai_has_no_code" }, 400);
      const code = newCode(), salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      await db.batch([db.prepare("UPDATE auth SET hash = ?, salt = ? WHERE id = ?").bind(await sha(salt + norm(code)), salt, id), db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id)]);
      return json({ ok: true, code });
    }
    if (route === "users/remove") {
      await db.batch([db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id), db.prepare("DELETE FROM auth WHERE id = ?").bind(id)]);
      return json({ ok: true });
    }
    return json({ error: "not_found" }, 404);
  }
  if (route === "logout" && post) {
    const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)prhub=([A-Za-z0-9]+)/);
    if (body.everywhere) await db.prepare("DELETE FROM sessions WHERE coalesce(user_id, 'owner') = ?").bind(s.id).run();
    else if (m) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha(m[1])).run();
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/api/hub; Max-Age=0; HttpOnly; Secure; SameSite=Strict` });
  }
  if (route === "list") {
    const coll = url.searchParams.get("coll");
    if (!validPath(coll, false)) return json({ error: "bad_path" }, 400);
    const r = await db.prepare("SELECT path, data FROM docs WHERE coll = ?").bind(coll).all();
    return json({ docs: r.results.map(x => ({ id: x.path.slice(coll.length + 1), ...JSON.parse(x.data) })) });
  }
  if ((route === "set" || route === "merge" || route === "bulk") && post && s.role === "viewer") return json({ error: "read_only" }, 403);
  if ((route === "set" || route === "merge") && post) {
    const { path, data } = body;
    if (!validPath(path, true) || !data || typeof data !== "object" || Array.isArray(data)) return json({ error: "bad_doc" }, 400);
    let out = data;
    const curTxt = await db.prepare("SELECT data FROM docs WHERE path = ?").bind(path).first("data");
    const before = curTxt ? JSON.parse(curTxt) : null;
    if (route === "merge") {
      if (!before) return json({ error: "not_found" }, 404);
      out = { ...before, ...data };
    }
    const txt = JSON.stringify(out);
    if (txt.length > 100000) return json({ error: "too_large" }, 413);
    const now = Date.now();
    const stmts = [db.prepare("INSERT INTO docs (path, coll, data, updated) VALUES (?, ?, ?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, updated = excluded.updated").bind(path, collOf(path), txt, now)];
    const who = s.name;
    const acts = activityFor(path, before, out, who);
    if (acts.length && path.split("/").length === 4) {
      const parent = await db.prepare("SELECT data FROM docs WHERE path = ?").bind(path.split("/").slice(0, 2).join("/")).first("data");
      if (parent) acts.forEach(x => x.company = JSON.parse(parent).company || x.company);
    }
    acts.forEach((a, i) => {
      const aid = "a" + now + i + hex(crypto.getRandomValues(new Uint8Array(3)));
      stmts.push(db.prepare("INSERT INTO docs (path, coll, data, updated) VALUES (?, 'activity', ?, ?)").bind("activity/" + aid, JSON.stringify({ ...a, at: now, by: who }), now));
    });
    await db.batch(stmts);
    return json({ ok: true });
  }
  if (route === "bulk" && post) {
    // First-time copy of the records from the old hub; never overwrites.
    const docs = Array.isArray(body.docs) ? body.docs.slice(0, 200) : [];
    const now = Date.now(), stmts = [];
    for (const d of docs) {
      if (!validPath(d.path, true) || !d.data || typeof d.data !== "object") continue;
      stmts.push(db.prepare("INSERT OR IGNORE INTO docs (path, coll, data, updated) VALUES (?, ?, ?, ?)").bind(d.path, collOf(d.path), JSON.stringify(d.data), now));
    }
    if (stmts.length) await db.batch(stmts);
    return json({ ok: true, count: stmts.length });
  }
  return json({ error: "not_found" }, 404);
}
