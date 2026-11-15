/* The Packed Rabbit: move-dates links (owner, 15 Nov 2026).
   An agent, landlord, relocation team or anyone else helping with a move types the dates
   and who to call on /send/. The client gets one link: /dates/#plan=...
   Everything travels inside the link itself, after the #, which browsers never send to a
   server. Nothing in this file sends anything anywhere. The app reads the same link
   (readPlan in moving-command-center.jsx), so the two must stay in step. */
(function () {
  "use strict";
  var P = (window.PRPlan = {});

  /* What the dates can be. The app doesn't need this list: every date carries its own label. */
  P.KINDS = [
    ["Buying or selling a home", [
      ["earnest", "Earnest money due"], ["inspect", "Home inspection"], ["appraisal", "Appraisal"],
      ["loan", "Loan approval deadline"], ["title", "Title or escrow appointment"], ["walk", "Final walk-through"],
      ["closing", "Closing"], ["keys", "Keys handed over"]]],
    ["Renting", [
      ["lease", "Lease signing"], ["secdep", "Security deposit due"], ["rent", "First month's rent due"],
      ["inspin", "Move-in inspection"], ["keypick", "Pick up the keys"], ["notice", "Move-out notice due"],
      ["inspout", "Move-out inspection"]]],
    ["Moving", [
      ["pack", "Packing day"], ["load", "Movers: loading"], ["deliver", "Movers: delivery"], ["truck", "Truck pickup"],
      ["elevator", "Elevator reserved"], ["storage", "Storage move-in"], ["clean", "Cleaners"]]],
    ["Home services", [
      ["utilon", "Utilities start"], ["utiloff", "Utilities stop"], ["internet", "Internet install"],
      ["furn", "Furniture delivery"], ["lock", "Locksmith"]]],
    ["Anything else", [["other", "Something else"]]]
  ];
  /* dates where money changes hands: the client is reminded never to wire money because of a link */
  P.MONEY = { earnest: 1, title: 1, closing: 1, secdep: 1, rent: 1, loan: 1 };
  P.label = function (k) {
    for (var g = 0; g < P.KINDS.length; g++) for (var i = 0; i < P.KINDS[g][1].length; i++) if (P.KINDS[g][1][i][0] === k) return P.KINDS[g][1][i][1];
    return "";
  };

  /* ---- cleaning: the same limits here and in the app ---- */
  function str(v, n) { return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n); }
  /* account numbers show the last 4 digits only (standing rule): a long run of digits in a
     note or a reference becomes ••••1234. Ten or eleven digits are left alone: phone numbers. */
  function mask(s) { return s.replace(/\d{8,}/g, function (m) { return m.length === 10 || m.length === 11 ? m : "••••" + m.slice(-4); }); }
  function day(v) { v = str(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + "T12:00:00").getTime()) ? v : ""; }
  function hm(v) { v = str(v, 5); return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : ""; }
  function mail(v) { v = str(v, 80); return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v) ? v : ""; }
  function who(c) {
    c = c || {};
    return { n: str(c.n, 60), r: str(c.r, 60), p: str(c.p, 30).replace(/[^0-9+()\-. x]/g, "").trim(), e: mail(c.e) };
  }
  function has(c) { return !!(c && (c.n || c.r || c.p || c.e)); }
  function clean(o) {
    o = o || {};
    var out = { v: 1, s: str(o.s, 10).replace(/[^a-z0-9]/gi, "") || "x", f: who(o.f), t: str(o.t, 40), d: [], k: [] };
    var seen = {};
    (Array.isArray(o.d) ? o.d : []).slice(0, 24).forEach(function (x, n) {
      x = x || {};
      var d = day(x.d);
      if (!d) return;
      var i = str(x.i, 8).replace(/[^a-z0-9]/gi, "") || "n" + n;
      if (seen[i]) i = i + n;
      seen[i] = 1;
      var k = str(x.k, 12).replace(/[^a-z]/g, "");
      var item = { i: i, k: k, l: str(x.l, 60) || P.label(k) || "A date for your move", d: d, h: hm(x.h), w: str(x.w, 120), r: mask(str(x.r, 40)), x: mask(str(x.x, 200)) };
      var c = who(x.c);
      if (has(c)) item.c = c;
      out.d.push(item);
    });
    (Array.isArray(o.k) ? o.k : []).slice(0, 12).forEach(function (c) { c = who(c); if (has(c)) out.k.push(c); });
    return out;
  }
  P.clean = clean;

  /* ---- the link ---- */
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
  function b64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64(t) {
    t = t.replace(/-/g, "+").replace(/_/g, "/");
    t += "===".slice((t.length + 3) % 4);
    var s = atob(t), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function pipe(bytes, stream) {
    return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  /* empty fields are left out of the link, so it stays short enough to text */
  function compact(k, v) { return v === "" || (Array.isArray(v) && !v.length && (k === "k")) ? undefined : v; }
  P.encode = function (plan) {
    var json = JSON.stringify(clean(plan), compact), sum = fnv(json), raw = new TextEncoder().encode(json);
    var plain = function () { return "j" + b64(raw) + "." + sum; };
    if (!window.CompressionStream) return Promise.resolve(plain());
    return pipe(raw, new CompressionStream("deflate")).then(function (z) { return "z" + b64(z) + "." + sum; }, plain);
  };
  /* rejects with "cut" (the link didn't arrive whole) or "old" (this browser can't unpack it) */
  P.decode = function (code) {
    var m = /^([zj])([A-Za-z0-9_-]+)\.([0-9a-z]{1,8})$/.exec(String(code || ""));
    if (!m) return Promise.reject(new Error("cut"));
    var bytes;
    try { bytes = unb64(m[2]); } catch (e) { return Promise.reject(new Error("cut")); }
    var got = m[1] === "z"
      ? (window.DecompressionStream ? pipe(bytes, new DecompressionStream("deflate")) : Promise.reject(new Error("old")))
      : Promise.resolve(bytes);
    return got.then(function (b) {
      var json = new TextDecoder().decode(b);
      if (fnv(json) !== m[3]) throw new Error("cut");
      return clean(JSON.parse(json));
    }, function (e) { throw new Error(e && e.message === "old" ? "old" : "cut"); });
  };
  P.codeFrom = function (hash) { var m = /(?:^#|&)plan=([A-Za-z0-9_.-]+)/.exec(String(hash || "")); return m ? m[1] : ""; };
  P.giftFrom = function (hash) { var m = /gift=([A-Za-z0-9_-]+\.[A-Z0-9]{8})/.exec(String(hash || "")); return m ? m[1] : ""; };

  /* ---- words ---- */
  P.niceDate = function (d) {
    var x = new Date(d + "T12:00:00"), o = { weekday: "long", month: "long", day: "numeric" };
    if (x.getFullYear() !== new Date().getFullYear()) o.year = "numeric";
    return x.toLocaleDateString("en-US", o);
  };
  P.niceTime = function (h) {
    if (!h) return "";
    var a = h.split(":"), H = +a[0], ap = H < 12 ? "am" : "pm", h12 = H % 12 || 12;
    return h12 + (a[1] === "00" ? "" : ":" + a[1]) + " " + ap;
  };
  P.person = function (c) { return c ? [c.n, c.r].filter(Boolean).join(", ") : ""; };
  P.contactLine = function (c) { return c ? [P.person(c), c.p, c.e].filter(Boolean).join(" · ") : ""; };
  P.fromLine = function (plan) { var w = P.person(plan.f); return w ? "Sent by " + w : ""; };
  P.tel = function (p) { return "tel:" + String(p || "").replace(/[^0-9+]/g, ""); };

  /* ---- the calendar file: each date keeps the same id, so a second file updates instead of doubling ---- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()); }
  function esc(s) { return String(s || "").replace(/[\\;,]/g, function (m) { return "\\" + m; }).replace(/\r?\n/g, "\\n"); }
  function fold(line) { var out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = " " + line.slice(74); } out.push(line); return out.join("\r\n"); }
  P.ics = function (plan, items) {
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Packed Rabbit//Move dates//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:My move"];
    (items || plan.d).forEach(function (x) {
      L.push("BEGIN:VEVENT", "UID:pl-" + plan.s + "-" + x.i + "@packedrabbit.com", "DTSTAMP:" + stamp);
      if (x.h) {
        var s = new Date(x.d + "T" + x.h + ":00"), e = new Date(s.getTime() + 3600000);
        L.push("DTSTART:" + ymd(s) + "T" + pad(s.getHours()) + pad(s.getMinutes()) + "00", "DTEND:" + ymd(e) + "T" + pad(e.getHours()) + pad(e.getMinutes()) + "00");
      } else {
        var n = new Date(x.d + "T12:00:00"); n.setDate(n.getDate() + 1);
        L.push("DTSTART;VALUE=DATE:" + x.d.replace(/-/g, ""), "DTEND;VALUE=DATE:" + ymd(n));
      }
      L.push("SUMMARY:" + esc(x.l));
      if (x.w) L.push("LOCATION:" + esc(x.w));
      var desc = [P.contactLine(x.c), x.r && "Reference: " + x.r, x.x, P.fromLine(plan)].filter(Boolean).join("\n");
      if (desc) L.push("DESCRIPTION:" + esc(desc));
      L.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:" + esc(x.l + " tomorrow"), "END:VALARM", "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.map(fold).join("\r\n") + "\r\n";
  };
  P.download = function (name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
    var a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };
})();
