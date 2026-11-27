import { unsubToken } from "../../_lib/unsub.js";
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
const userOut = u => ({ id: u.id, name: u.name || (u.id === "owner" ? "Owner" : u.id), role: u.role || (u.id === "owner" ? "owner" : "member"), email: u.email || "", kind: u.kind || "person", created: u.created, lastSeen: u.last_seen || null, canSignIn: !!u.hash });

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
  const uid = row.user_id || "owner"; // sessions from before the team existed are the owner's
  const u = await db.prepare("SELECT * FROM auth WHERE id = ?").bind(uid).first();
  if (!u || !u.hash) return null; // removed from the team
  return { ...userOut(u), tokenHash: th };
}


// ---------- Mail (owner, 20 Nov 2026): every @packedrabbit.com address, read and sent here, never Gmail ----------
// Mail arrives in Resend; this copies it into the hub. Sending goes out through Resend from our own addresses.
// The Resend key lives in the D1 table "secrets", which no route ever returns.
// Display names, signatures and the postal address live in the hub (doc meta/mail), not in this public code.
const FROMS = { hello: "The Packed Rabbit", customerservice: "The Packed Rabbit Customer Service", sales: "The Packed Rabbit Sales",
  info: "The Packed Rabbit", partners: "The Packed Rabbit Partners", beta: "The Packed Rabbit Beta", larac: "The Packed Rabbit",
  claude: "Claude, AI assistant at The Packed Rabbit", assistant: "Claude, AI assistant at The Packed Rabbit", lumi: "Lumi, AI research assistant at The Packed Rabbit" };
const SIG_DEFAULT = "The Packed Rabbit\npackedrabbit.com";
const LEGAL_DEFAULT = "This email and anything attached to it are confidential and meant only for the person or business it is addressed to. If it reached you by mistake, please tell the sender by replying, then delete it.";
async function mailCfg(db) { try { const t = await db.prepare("SELECT data FROM docs WHERE path = 'meta/mail'").first("data"); return t ? JSON.parse(t) : {}; } catch (e) { return {}; } }
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[A-Za-z]{2,}$/;
const addrs = v => (Array.isArray(v) ? v : String(v || "").split(/[,;\s]+/)).map(x => String(x).trim().toLowerCase()).filter(Boolean);
const bare = a => { const m = String(a || "").match(/<([^>]+)>/); return (m ? m[1] : String(a || "")).trim().toLowerCase(); };
const nameOf = a => { const m = String(a || "").match(/^\s*"?([^"<]*?)"?\s*</); return m ? m[1].trim() : ""; };
async function resend(db, path, init = {}) {
  const key = await db.prepare("SELECT v FROM secrets WHERE k = 'resend'").first("v");
  if (!key) { const e = new Error("mail_not_connected"); e.code = 503; throw e; }
  const r = await fetch("https://api.resend.com" + path, { ...init, headers: { authorization: "Bearer " + key, "content-type": "application/json", ...(init.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j && (j.message || j.name)) || ("resend_" + r.status)); e.code = 502; throw e; }
  return j;
}
// Owner, 20 Nov 2026: mail goes out through Cloudflare, the company that holds packedrabbit.com, once its key is saved.
async function cfSecrets(db) { const r = (await db.prepare("SELECT k, v FROM secrets WHERE k IN ('cf_token','cf_account')").all()).results; const o = {}; r.forEach(x => o[x.k] = x.v); return o.cf_token && o.cf_account ? o : null; }
async function cfSend(cf, msg) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cf.cf_account}/email/sending/send`, { method: "POST", headers: { authorization: "Bearer " + cf.cf_token, "content-type": "application/json" }, body: JSON.stringify(msg) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) { const e = new Error("Cloudflare said: " + (((j.errors || [])[0] || {}).message || ("status " + r.status)) + " (" + r.status + ", code " + (((j.errors || [])[0] || {}).code || "none") + ")"); e.code = 502; e.cf = JSON.stringify(j).slice(0, 1500); throw e; }
  return j.result || {};
}
const safeId = id => String(id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 70);
async function mailSync(db) {
  // Owner, 20 Nov 2026: incoming mail now arrives through Cloudflare Email Routing straight into the hub.
  // The old Resend mailbox is read only if its key is still saved, to catch anything sent there before the switch.
  const hasResend = await db.prepare("SELECT 1 FROM secrets WHERE k = 'resend'").first();
  let L = null; if (hasResend) { try { L = await resend(db, "/emails/receiving?limit=100"); } catch (e) { L = null; } }
  const items = (L && L.data) || [];
  let added = 0;
  const rules = (await db.prepare("SELECT data FROM docs WHERE coll = 'mailrules'").all()).results.map(x => JSON.parse(x.data)).filter(r => r.on !== 0 && r.contains);
  for (const m of items) {
    const id = "r" + safeId(m.id);
    if (await db.prepare("SELECT 1 FROM docs WHERE path = ?").bind("mail/" + id).first()) continue;
    let d = m;
    try { d = await resend(db, "/emails/receiving/" + encodeURIComponent(m.id)); } catch (e) { /* keep the summary */ }
    const at = Date.parse(d.created_at || m.created_at) || Date.now();
    const head = { dir: "in", from: bare(d.from || m.from), fromName: nameOf((d.headers && d.headers.from) || d.from || ""), to: addrs(d.to || m.to).map(bare), cc: addrs(d.cc).map(bare),
      subject: String(d.subject || m.subject || "(no subject)").slice(0, 300), at, read: false, messageId: d.message_id || m.message_id || "",
      snippet: String(d.text || "").replace(/\s+/g, " ").trim().slice(0, 160), attachments: (d.attachments || []).map(a => ({ name: a.filename || "attachment", size: a.size || 0 })).slice(0, 20) };
    for (const r of rules) {
      const hay = (r.field === "subject" ? head.subject : head.from + " " + head.fromName).toLowerCase();
      if (hay.includes(String(r.contains).toLowerCase())) { if (r.folder && r.folder !== "inbox") head.folder = r.folder; if (r.star) head.star = true; head.rule = r.contains; break; }
    }
    head.rchk = 1;
    const body = { text: String(d.text || "").slice(0, 60000), html: String(d.html || "").length <= 90000 ? String(d.html || "") : "" };
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO docs (path, coll, data, updated) VALUES (?, 'mail', ?, ?)").bind("mail/" + id, JSON.stringify(head), at),
      db.prepare("INSERT OR IGNORE INTO docs (path, coll, data, updated) VALUES (?, ?, ?, ?)").bind("mail/" + id + "/parts/body", "mail/" + id + "/parts", JSON.stringify(body), at),
    ]);
    added++;
  }
  // mail copied in by the hourly helper gets the same rules, once
  const unchecked = (await db.prepare("SELECT path, data FROM docs WHERE coll = 'mail' AND json_extract(data, '$.dir') = 'in' AND json_extract(data, '$.rchk') IS NULL LIMIT 200").all()).results;
  for (const u of unchecked) {
    const h = JSON.parse(u.data); h.rchk = 1;
    for (const r of rules) {
      const hay = (r.field === "subject" ? String(h.subject || "") : String(h.from || "") + " " + String(h.fromName || "")).toLowerCase();
      if (!h.folder && hay.includes(String(r.contains).toLowerCase())) { if (r.folder && r.folder !== "inbox") h.folder = r.folder; if (r.star) h.star = true; h.rule = r.contains; break; }
    }
    await db.prepare("UPDATE docs SET data = ? WHERE path = ?").bind(JSON.stringify(h), u.path).run();
  }
  return added;
}
const escH = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
async function mailSend(db, s, b) {
  const box = String(b.from || "").toLowerCase();
  if (!FROMS[box]) return { error: "bad_from" };
  if (box === "larac" && s.role !== "owner") return { error: "owner_only" };
  // owner, 20 Nov 2026: Claude and Lumi may send from their own packedrabbit.com addresses; never from a private address
  // members send only from their own address
  if (s.role === "member") { const own = String(s.email || "").toLowerCase(); if (own !== box + "@packedrabbit.com") return { error: "own_address_only" }; }
  const to = addrs(b.to), cc = addrs(b.cc);
  if (!to.length || [...to, ...cc].some(a => !EMAIL_RE.test(a))) return { error: "bad_address" };
  // never write to anyone who unsubscribed or is marked do not contact (CAN-SPAM; owner, 27 Nov 2026: every other block removed)
  for (const a of [...to, ...cc]) {
    const e = String(a).toLowerCase();
    const key = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(e))).slice(0, 32);
    if (await db.prepare("SELECT 1 FROM docs WHERE path = ?").bind("unsubs/" + key).first()) return { error: "unsubscribed", who: e };
    const c = await db.prepare("SELECT json_extract(data, '$.status') AS st FROM docs WHERE coll = 'contacts' AND lower(json_extract(data, '$.email')) = ? AND lower(json_extract(data, '$.status')) LIKE 'do not contact%' LIMIT 1").bind(e).first();
    if (c) return { error: "unsubscribed", who: e };
  }
  const subject = String(b.subject || "").trim().slice(0, 250), text = String(b.text || "").trim().slice(0, 200000);
  if (!subject || !text) return { error: "subject_and_message_needed" };
  // owner, 27 Nov 2026: no daily cap on outgoing mail
  // a reply keeps the conversation together in their inbox
  let headers = {};
  if (b.replyOf) {
    const o = await db.prepare("SELECT data FROM docs WHERE path = ?").bind("mail/" + safeId(b.replyOf)).first("data");
    const mid = o && JSON.parse(o).messageId;
    if (mid) headers = { "In-Reply-To": mid, References: mid };
  }
  const cfg = await mailCfg(db);
  const sig = (cfg.sigs && cfg.sigs[box]) || SIG_DEFAULT, legal = cfg.legal || LEGAL_DEFAULT, postal = cfg.address || "";
  const name = (cfg.names && cfg.names[box]) || FROMS[box];
  // CAN-SPAM and the mail apps' own unsubscribe button (owner, 20 Nov 2026: the postal address in ultra-small type at the
  // very bottom, then a really small Unsubscribe link). One recipient gets a link signed for their own address.
  let unsubPage = "https://packedrabbit.com/unsubscribe/";
  if (to.length === 1) {
    const t = await unsubToken(db, to[0]), e = encodeURIComponent(to[0]);
    unsubPage += "?e=" + e;
    headers["List-Unsubscribe"] = `<https://packedrabbit.com/api/unsubscribe?e=${e}&t=${t}>, <mailto:hello@packedrabbit.com?subject=unsubscribe>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const full = text + "\n\n" + sig + "\n\n" + legal + (postal ? "\n" + postal : "") + "\nUnsubscribe: " + unsubPage;
  const foot = `${postal ? `<p style="font-size:9px;line-height:1.3;color:#8a968d;margin:6px 0 0">${escH(postal)}</p>` : ""}<p style="font-size:9px;line-height:1.3;margin:2px 0 0"><a href="${escH(unsubPage)}" style="color:#8a968d">Unsubscribe</a></p>`;
  // A designed email (an approved campaign) may bring its own HTML; owner and admins only. Its {unsubscribe} becomes the link.
  const designed = typeof b.html === "string" && b.html.trim() && (s.role === "owner" || s.role === "admin") ? b.html.slice(0, 500000).split("{unsubscribe}").join(escH(unsubPage)) : "";
  const html = designed ? (/unsubscribe/i.test(designed) && (!postal || designed.includes(postal.split(",").slice(-2)[0].trim())) ? designed : designed + `<div style="font-family:Arial,Helvetica,sans-serif;padding:0 10px">${foot}</div>`)
    : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1d2a20">${escH(text).replace(/\n/g, "<br>")}<br><br>${escH(sig).replace(/\n/g, "<br>")}<p style="font-size:11px;line-height:1.4;color:#6b7a6f;margin:18px 0 0">${escH(legal)}</p>${foot}</div>`;
  const cf = await cfSecrets(db);
  let r, via;
  if (cf) {
    r = await cfSend(cf, { from: { address: box + "@packedrabbit.com", name: name.replace(/[<>"]/g, "") }, to, cc: cc.length ? cc : undefined, reply_to: box + "@packedrabbit.com", subject, text: full, html, headers: Object.keys(headers).length ? headers : undefined });
    via = "cloudflare";
  } else {
    r = await resend(db, "/emails", { method: "POST", body: JSON.stringify({ from: `${name.replace(/[<>"]/g, "")} <${box}@packedrabbit.com>`, to, cc: cc.length ? cc : undefined, reply_to: `${box}@packedrabbit.com`, subject, text: full, html, headers }) });
    via = "resend";
  }
  const id = "s" + safeId(r.id || hex(crypto.getRandomValues(new Uint8Array(8))));
  const at = Date.now();
  await db.batch([
    db.prepare("INSERT OR REPLACE INTO docs (path, coll, data, updated) VALUES (?, 'mail', ?, ?)").bind("mail/" + id, JSON.stringify({ dir: "out", from: box + "@packedrabbit.com", to, cc, subject, at, read: true, by: s.name, via, replyOf: b.replyOf || "", snippet: text.replace(/\s+/g, " ").slice(0, 160),
      // owner, 21 Nov 2026: each send says which campaign and which day's batch it belongs to, so Sent can be read by batch
      campaign: String(b.campaign || "").slice(0, 80), batch: String(b.batch || "").slice(0, 80) }), at),
    db.prepare("INSERT OR REPLACE INTO docs (path, coll, data, updated) VALUES (?, ?, ?, ?)").bind("mail/" + id + "/parts/body", "mail/" + id + "/parts", JSON.stringify({ text: full, html }), at),
  ]);
  if (b.replyOf) await db.prepare("UPDATE docs SET data = json_set(data, '$.answered', ?) WHERE path = ?").bind(at, "mail/" + safeId(b.replyOf)).run();
  // owner, 23 Nov 2026: every outreach email stays attached to its prospect for good. The send is written on the
  // contact's record (never removed), and a new prospect becomes contacted. Only when the address matches the contact.
  const cid = safeId(b.contact);
  if (cid) {
    const c = await db.prepare("SELECT data FROM docs WHERE path = ?").bind("contacts/" + cid).first("data");
    const cd = c ? JSON.parse(c) : null;
    if (cd && to.includes(String(cd.email || "").toLowerCase())) {
      const st = String(cd.status || "new").toLowerCase() === "new" ? "contacted" : cd.status;
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO docs (path, coll, data, updated) VALUES (?, ?, ?, ?)").bind(`contacts/${cid}/events/${id}`, `contacts/${cid}/events`, JSON.stringify({ type: "outreach", subject, body: text, at, mailId: id, from: box + "@packedrabbit.com", to: to.join(", "), campaign: String(b.campaign || "").slice(0, 80), batch: String(b.batch || "").slice(0, 80), via, by: s.name }), at),
        db.prepare("UPDATE docs SET data = json_set(data, '$.status', ?, '$.last', ?, '$.firstSent', coalesce(json_extract(data, '$.firstSent'), ?), '$.campaign', coalesce(nullif(?, ''), json_extract(data, '$.campaign'))), updated = ? WHERE path = ?").bind(st, at, at, String(b.campaign || "").slice(0, 80), at, "contacts/" + cid),
        db.prepare("UPDATE docs SET data = json_set(data, '$.contact', ?) WHERE path = ?").bind(cid, "mail/" + id),
        db.prepare("INSERT OR IGNORE INTO docs (path, coll, data, updated) VALUES (?, 'activity', ?, ?)").bind("activity/a" + id, JSON.stringify({ contact: cid, company: cd.company || "", kind: "email", text: `Email sent from ${box}@packedrabbit.com: ${subject}` + (st !== cd.status ? `. Status ${cd.status || "new"} to ${st}.` : ""), at, by: s.name }), at),
      ]);
    }
  }
  return { ok: true, id };
}

// owner, 27 Nov 2026: "send them in a batch of 50 ... 50 every hour". A drip sends one draft batch a little at a time,
// as the person who started it, up to perHour each clock hour. GitHub Actions calls mail/drip-tick at the top of each
// hour; the hub's own button sends the first hour at once.
const DRIP_ART = { "cid:att0": "https://packedrabbit.com/email/hero.jpg", "cid:att1": "https://packedrabbit.com/email/rabbit.png" };
function designHtml(camp, d) {
  // the same as the hub's designFor(): the campaign's designed letter with this draft's paragraphs in place
  const h = camp && camp.html; if (!h) return "";
  const a = h.indexOf('<p style="margin:0 0 14px">Dear'), z = h.indexOf('<p style="margin:0 0 2px">Warmly,'); if (a < 0 || z < a) return "";
  const paras = String(d.text || "").split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !/^Warmly,?$/.test(p) && !/^Open the sneak peek:/.test(p));
  let out = h.slice(0, a) + paras.map(p => `<p style="margin:0 0 14px">${escH(p).replace(/\n/g, "<br>")}</p>`).join("\n") + "\n" + h.slice(z);
  Object.entries(DRIP_ART).forEach(([k, v]) => { out = out.split(k).join(v); });
  return out.split("{email}").join(encodeURIComponent(String(d.to || "").toLowerCase()));
}
async function dripTick(db, max) {
  const hour = Math.floor(Date.now() / 3600e3);
  const rows = (await db.prepare("SELECT path, data FROM docs WHERE coll = 'drips'").all()).results;
  let sent = 0, stopped = "", more = false;
  for (const r of rows) {
    if (!JSON.parse(r.data).active) continue;
    // one run at a time per drip, so the hourly count can't be passed by two calls at once
    const now = Date.now();
    const lk = await db.prepare("UPDATE docs SET data = json_set(data, '$.lock', ?) WHERE path = ? AND coalesce(json_extract(data, '$.lock'), 0) < ?").bind(now + 90e3, r.path, now).run();
    if (!lk.meta || !lk.meta.changes) continue;
    const dp = JSON.parse(await db.prepare("SELECT data FROM docs WHERE path = ?").bind(r.path).first("data"));
    dp.lock = 0;
    if (dp.hour !== hour) { dp.hour = hour; dp.thisHour = 0; }
    const room = Math.min(max - sent, (dp.perHour || 50) - (dp.thisHour || 0));
    if (room > 0) {
      const D = (await db.prepare("SELECT path, data FROM docs WHERE coll = 'mail' AND json_extract(data, '$.dir') = 'draft' AND json_extract(data, '$.campaign') = ? AND json_extract(data, '$.batch') = ? AND coalesce(json_extract(data, '$.gone'), 0) = 0 AND coalesce(json_extract(data, '$.dripSkip'), 0) = 0 ORDER BY json_extract(data, '$.at') LIMIT ?").bind(dp.campaign, dp.batch, room).all()).results;
      const campRow = dp.art ? await db.prepare("SELECT data FROM docs WHERE path = ?").bind("campaigns/" + safeId(dp.campaign)).first("data") : null;
      const camp = campRow ? JSON.parse(campRow) : null;
      const who = { id: dp.byId || "owner", role: dp.byRole || "owner", name: dp.by || "Owner" };
      for (const x of D) {
        // claim the draft first, so two runs can never send it twice
        const c = await db.prepare("UPDATE docs SET data = json_set(data, '$.gone', 1, '$.dripAt', ?) WHERE path = ? AND coalesce(json_extract(data, '$.gone'), 0) = 0").bind(Date.now(), x.path).run();
        if (!c.meta || !c.meta.changes) continue;
        const m = JSON.parse(x.data);
        let res;
        try {
          const html = camp ? designHtml(camp, m) : "";
          res = await mailSend(db, who, { from: m.from || "hello", to: m.to, cc: m.cc || "", subject: m.subject || "", text: m.text || "", replyOf: m.replyOf || "", campaign: m.campaign, batch: m.batch, contact: m.contact || "", ...(html ? { html } : {}) });
        } catch (e) {
          // the mail service refused or failed: put the draft back and try again next hour
          await db.prepare("UPDATE docs SET data = json_set(data, '$.gone', 0, '$.dripErr', ?) WHERE path = ?").bind(String(e.message || "error").slice(0, 200), x.path).run();
          stopped = String(e.message || "error"); break;
        }
        if (res && res.error) {
          await db.prepare("UPDATE docs SET data = json_set(data, '$.gone', 0, '$.dripSkip', 1, '$.dripErr', ?) WHERE path = ?").bind(res.error, x.path).run();
          dp.skipped = (dp.skipped || 0) + 1; continue;
        }
        sent++; dp.thisHour = (dp.thisHour || 0) + 1; dp.sent = (dp.sent || 0) + 1;
      }
      const left = await db.prepare("SELECT COUNT(*) AS n FROM docs WHERE coll = 'mail' AND json_extract(data, '$.dir') = 'draft' AND json_extract(data, '$.campaign') = ? AND json_extract(data, '$.batch') = ? AND coalesce(json_extract(data, '$.gone'), 0) = 0 AND coalesce(json_extract(data, '$.dripSkip'), 0) = 0").bind(dp.campaign, dp.batch).first("n");
      dp.left = left;
      if (!left) { dp.active = 0; dp.finished = Date.now(); }
      else if ((dp.thisHour || 0) < (dp.perHour || 50)) more = true;
    }
    dp.lastTick = Date.now(); if (stopped) dp.lastError = stopped;
    await db.prepare("UPDATE docs SET data = ?, updated = ? WHERE path = ?").bind(JSON.stringify(dp), Date.now(), r.path).run();
    if (stopped || sent >= max) break;
  }
  return { ok: true, sent, more: more && !stopped, error: stopped || undefined };
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

  if (route === "mail/drip-tick" && post) {
    // No key needed: a tick can only send drafts the owner already started dripping, and never more than perHour
    // in a clock hour (counted in the drip itself), so an early or extra call changes nothing. Counts only come back.
    try { const r = await dripTick(db, 4); return json({ sent: r.sent, more: r.more }); } catch (e) { return json({ error: "tick_failed" }, 500); }
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
  if (route === "mail/sync") {
    try { return json({ ok: true, added: await mailSync(db) }); } catch (e) { return json({ error: e.message }, (e.code >= 400 && e.code < 600) ? e.code : 500); }
  }
  if (route === "mail/status") {
    const cf = await cfSecrets(db);
    return json({ ok: true, sending: cf ? "cloudflare" : "resend" });
  }
  if (route === "mail/cloudflare" && post) {
    if (s.role !== "owner") return json({ error: "owner_only" }, 403);
    const token = String(body.token || "").trim();
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) return json({ error: "bad_token" }, 400);
    let account = String(body.account || "").trim().replace(/[^a-f0-9]/gi, "");
    if (!account) {
      const r = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=5", { headers: { authorization: "Bearer " + token } });
      const j = await r.json().catch(() => ({}));
      const list = (j && j.result) || [];
      if (!r.ok || !list.length) return json({ error: "need_account_id" }, 400);
      account = list[0].id;
    }
    const now = Date.now();
    await db.batch([
      db.prepare("INSERT INTO secrets (k, v, updated) VALUES ('cf_token', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated").bind(token, now),
      db.prepare("INSERT INTO secrets (k, v, updated) VALUES ('cf_account', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated").bind(account, now),
    ]);
    return json({ ok: true, sending: "cloudflare" });
  }
  // Owner, 20 Nov 2026: the payment server. The Stripe key (restricted, Checkout Sessions: Read) is pasted here by the
  // owner, checked with Stripe once, and kept in the private secrets table; /api/unlock uses it to unlock on the spot.
  if (route === "pay/status") {
    const k = await db.prepare("SELECT updated FROM secrets WHERE k = 'stripe_unlock'").first("updated");
    return json({ ok: true, on: !!k, since: k || null });
  }
  if (route === "pay/stripe" && post) {
    if (s.role !== "owner") return json({ error: "owner_only" }, 403);
    const key = String(body.key || "").trim();
    if (!/^(rk|sk)_live_[A-Za-z0-9]{20,250}$/.test(key)) return json({ error: "bad_key" }, 400);
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions?limit=1", { headers: { authorization: "Bearer " + key } });
    if (!r.ok) return json({ error: r.status === 401 ? "stripe_refused" : r.status === 403 ? "needs_checkout_read" : "stripe_" + r.status }, 400);
    const now = Date.now();
    await db.batch([
      db.prepare("INSERT INTO secrets (k, v, updated) VALUES ('stripe_unlock', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated").bind(key, now),
      db.prepare("INSERT INTO docs (path, coll, data, updated) VALUES (?, 'log', ?, ?)").bind("log/lpay" + now, JSON.stringify({ at: now, area: "payments", title: "Instant unlock switched on (Stripe key saved)", details: "", by: s.name }), now),
    ]);
    return json({ ok: true, on: true });
  }
  // Owner, 26 Nov 2026: reading photos (box contents, furniture, quotes, listings). The owner pastes her Claude API key
  // here; it's checked once and kept in the private secrets table. /api/read uses it and keeps nothing. Empty key = off.
  if (route === "ai/status") {
    const k = await db.prepare("SELECT updated FROM secrets WHERE k = 'anthropic_read'").first("updated");
    let today = 0; try { today = (await db.prepare("SELECT SUM(n) AS t FROM reads WHERE day = ?").bind(new Date().toISOString().slice(0, 10)).first("t")) || 0; } catch (e) {}
    return json({ ok: true, on: !!k, since: k || null, today });
  }
  if (route === "ai/key" && post) {
    if (s.role !== "owner") return json({ error: "owner_only" }, 403);
    const key = String(body.key || "").trim(), now = Date.now();
    if (!key) {
      await db.batch([
        db.prepare("DELETE FROM secrets WHERE k = 'anthropic_read'"),
        db.prepare("INSERT INTO docs (path, coll, data, updated) VALUES (?, 'log', ?, ?)").bind("log/lai" + now, JSON.stringify({ at: now, area: "ai", title: "Reading photos switched off (key removed)", details: "", by: s.name }), now),
      ]);
      return json({ ok: true, on: false });
    }
    if (!/^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(key)) return json({ error: "bad_key" }, 400);
    const r = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } });
    if (!r.ok) return json({ error: r.status === 401 ? "ai_refused" : "ai_" + r.status }, 400);
    await db.batch([
      db.prepare("INSERT INTO secrets (k, v, updated) VALUES ('anthropic_read', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated").bind(key, now),
      db.prepare("INSERT INTO docs (path, coll, data, updated) VALUES (?, 'log', ?, ?)").bind("log/lai" + now, JSON.stringify({ at: now, area: "ai", title: "Reading photos switched on (Claude key saved)", details: "", by: s.name }), now),
    ]);
    return json({ ok: true, on: true });
  }
  if ((route === "mail/drip" || route === "mail/drip-run") && post) {
    if (s.role !== "owner" && s.role !== "admin") return json({ error: "owner_only" }, 403);
    if (route === "mail/drip") {
      const campaign = String(body.campaign || "").slice(0, 80), batch = String(body.batch || "").slice(0, 80);
      const key = safeId((campaign + "-" + batch).replace(/[^A-Za-z0-9_-]/g, "-"));
      if (!key) return json({ error: "bad_batch" }, 400);
      const first = await db.prepare("SELECT json_extract(data, '$.from') AS f FROM docs WHERE coll = 'mail' AND json_extract(data, '$.dir') = 'draft' AND json_extract(data, '$.campaign') = ? AND json_extract(data, '$.batch') = ? LIMIT 1").bind(campaign, batch).first();
      if (first && String(first.f || "") === "larac" && s.role !== "owner") return json({ error: "owner_only" }, 403);
      const old = await db.prepare("SELECT data FROM docs WHERE path = ?").bind("drips/" + key).first("data");
      const dp = { ...(old ? JSON.parse(old) : {}), campaign, batch, perHour: Math.max(1, Math.min(10000, parseInt(body.perHour, 10) || 50)), art: body.art !== false, by: s.name, byId: s.id, byRole: s.role, active: body.stop ? 0 : 1, [body.stop ? "stopped" : "started"]: Date.now() };
      await db.prepare("INSERT OR REPLACE INTO docs (path, coll, data, updated) VALUES (?, 'drips', ?, ?)").bind("drips/" + key, JSON.stringify(dp), Date.now()).run();
      return json({ ok: true, id: key, active: dp.active });
    }
    try { return json(await dripTick(db, 4)); } catch (e) { return json({ error: e.message }, 500); }
  }
  if (route === "mail/send" && post) {
    if (s.role === "viewer") return json({ error: "read_only" }, 403);
    try { const r = await mailSend(db, s, body); return json(r, r.error ? 400 : 200); } catch (e) {
      // keep the exact reason in the hub's log so Claude can read it
      try { const now = Date.now(); await db.prepare("INSERT INTO docs (path, coll, data, updated) VALUES (?, 'log', ?, ?)").bind("log/lsendfail" + now, JSON.stringify({ at: now, area: "email", title: "A send from Mail failed", details: String(e.message || "") + (e.cf ? " | " + e.cf : ""), by: s.name }), now).run(); } catch (x) {}
      return json({ error: e.message }, (e.code >= 400 && e.code < 600) ? e.code : 500); }
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
