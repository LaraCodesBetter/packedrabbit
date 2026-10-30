/* Back, up and down buttons on every page. Small, fixed, out of the way. */
(function () {
  if (window.__prNav) return; window.__prNav = 1;
  var css = ".prnav{position:fixed;right:14px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:60;display:flex;flex-direction:column;gap:10px}" +
    "@media (max-width:859px){body.has-sticky .prnav{bottom:calc(92px + env(safe-area-inset-bottom))}}" +
    ".prnav button{width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.85);background:#0F2742;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 18px rgba(15,39,66,.28);padding:0}" +
    ".prnav button:focus-visible{outline:3px solid #FFC21A;outline-offset:2px}" +
    ".prnav button[hidden]{display:none}" +
    ".prnav svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}" +
    "@media print{.prnav{display:none}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M5 15l7-7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M5 9l7 7 7-7"/></svg>'
  };
  function btn(k, label) {
    var b = document.createElement("button"); b.type = "button"; b.innerHTML = I[k];
    b.setAttribute("aria-label", label); b.title = label; return b;
  }
  var wrap = document.createElement("nav"); wrap.className = "prnav"; wrap.setAttribute("aria-label", "Page");
  var home = location.pathname === "/" || /\/index\.html$/.test(location.pathname) && location.pathname.split("/").length <= 2;
  var fromHere = document.referrer && document.referrer.indexOf(location.origin) === 0;
  var back = btn("back", fromHere ? "Back" : "Home");
  back.onclick = function () { if (fromHere && history.length > 1) history.back(); else location.href = "/"; };
  var up = btn("up", "Back to the top"), down = btn("down", "Scroll down");
  var smooth = !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  up.onclick = function () { window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" }); };
  down.onclick = function () { window.scrollBy({ top: Math.round(innerHeight * 0.8), behavior: smooth ? "smooth" : "auto" }); };
  if (!home || fromHere) wrap.appendChild(back);
  wrap.appendChild(up); wrap.appendChild(down);
  function sync() {
    var y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    up.hidden = y < 500;
    /* panel round 3: on phones the down button sat over forms and prices */
    down.hidden = innerWidth < 700 || max < 300 || y > max - 200;
  }
  function start() { document.body.appendChild(wrap); sync(); addEventListener("scroll", sync, { passive: true }); addEventListener("resize", sync); }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
