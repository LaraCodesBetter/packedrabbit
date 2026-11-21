/* One way to say a number can't be right (panel review, 21 Nov 2026: negative or
   impossible numbers were quietly turned into 0, so the answer changed with no word why).
   prCheck(input, message) shows the message under that field and marks it; prCheck(input)
   clears it. The answer itself is drawn as if the field were empty until it's fixed. */
(function () {
  "use strict";
  var css = document.createElement("style");
  css.textContent = ".fchk{margin:6px 0 0;color:var(--no,#C8102E);font-weight:650;font-size:.95rem;line-height:1.35;flex-basis:100%}" +
    "input[aria-invalid=true]{outline:2px solid var(--no,#C8102E);outline-offset:1px}";
  document.head.appendChild(css);
  var n = 0;
  window.prCheck = function (inp, msg) {
    if (!inp) return !!msg;
    var id = inp.getAttribute("data-fchk");
    if (!id) { id = "fchk" + (++n); inp.setAttribute("data-fchk", id); }
    var box = document.getElementById(id);
    if (!msg) { if (box) box.remove(); inp.removeAttribute("aria-invalid"); var d = (inp.getAttribute("aria-describedby") || "").replace(id, "").trim(); if (d) inp.setAttribute("aria-describedby", d); else inp.removeAttribute("aria-describedby"); return false; }
    if (!box) {
      box = document.createElement("p"); box.className = "fchk"; box.id = id; box.setAttribute("role", "alert");
      var host = inp.closest("li, .fld-row, div, label") || inp.parentNode;
      if (host.tagName === "LABEL") host = host.parentNode;
      host.appendChild(box);
    }
    box.textContent = msg; inp.setAttribute("aria-invalid", "true");
    var db = inp.getAttribute("aria-describedby") || ""; if (db.indexOf(id) < 0) inp.setAttribute("aria-describedby", (db + " " + id).trim());
    return true;
  };
  /* the usual number rule: empty is fine, otherwise between lo and hi */
  window.prNum = function (inp, lo, hi, what) {
    var raw = String(inp.value || "").replace(/[$,\s]/g, "");
    if (raw === "" && inp.validity && inp.validity.badInput) { window.prCheck(inp, "Use numbers only for " + what + "."); return { ok: false, v: 0 }; }
    if (raw === "") { window.prCheck(inp); return { ok: true, v: 0, empty: true }; }
    var v = Number(raw);
    if (!isFinite(v) || !/^-?\d*\.?\d*$/.test(raw)) { window.prCheck(inp, "Use numbers only for " + what + "."); return { ok: false, v: 0 }; }
    if (v < lo) { window.prCheck(inp, (lo === 0 ? what.charAt(0).toUpperCase() + what.slice(1) + " can't be less than 0." : "Enter at least " + lo.toLocaleString("en-US") + " for " + what + ".")); return { ok: false, v: 0 }; }
    if (v > hi) { window.prCheck(inp, "Enter " + hi.toLocaleString("en-US") + " or less for " + what + "."); return { ok: false, v: 0 }; }
    window.prCheck(inp); return { ok: true, v: v };
  };
})();
