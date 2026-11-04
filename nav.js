/* Back, up and down buttons on every page. Small and out of the way.
   Owner, 4 Nov 2026: the floating back button covered a "+" on the truck tool and a
   note on the quote checker. Back now sits in the header, at the left; on phones the
   up button shows only once the footer is in view, and the footer gets room for it.
   Every page header also gets the same "Open the app" button as the homepage. */
(function () {
  if (window.__prNav) return; window.__prNav = 1;
  var css = ".prnav{position:fixed;right:14px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:60;display:flex;flex-direction:column;gap:10px}" +
    "@media (max-width:859px){body.has-sticky .prnav{bottom:calc(92px + env(safe-area-inset-bottom))}}" +
    ".prnav button{width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.85);background:#22341A;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 18px rgba(34,52,26,.28);padding:0}" +
    ".prnav button:focus-visible{outline:3px solid #C9E35C;outline-offset:2px}" +
    ".prnav button[hidden]{display:none}" +
    ".prnav svg,.prback svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}" +
    ".prback{flex:none;width:44px;height:44px;border-radius:50%;border:1.5px solid color-mix(in srgb,currentColor 22%,transparent);background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;padding:0;margin-right:2px}" +
    ".prback:focus-visible{outline:3px solid #C9E35C;outline-offset:2px}" +
    ".prhead{display:flex;align-items:center;gap:8px;min-width:0}" +
    "@media (max-width:440px){.prhasback .brand,.prhasback .brandrow{font-size:0!important;gap:0!important}}" +
    "@media (max-width:699px){body>footer{padding-bottom:calc(96px + env(safe-area-inset-bottom))!important}}" +
    "html.embed .prnav,html.embed .prback{display:none!important}" +
    "@media print{.prnav,.prback{display:none}}";
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
  wrap.appendChild(up); wrap.appendChild(down);
  var foot = null;
  function sync() {
    var y = scrollY, max = document.documentElement.scrollHeight - innerHeight, phone = innerWidth < 700;
    /* on phones the up button waits for the footer, so it never sits over a control */
    var atFoot = foot ? foot.getBoundingClientRect().top < innerHeight - 60 : y > max - 200;
    up.hidden = y < 500 || (phone && !atFoot);
    /* panel round 3: on phones the down button sat over forms and prices */
    down.hidden = phone || max < 300 || y > max - 200;
  }
  function header() {
    var bar = document.querySelector("body > header.top, body > header .bar");
    if (!bar) return false;
    var brand = bar.querySelector(".brand, .brandrow");
    /* the same button as the homepage, where a page's header has none */
    if (brand && !bar.querySelector(".btn")) {
      var a = document.createElement("a"); a.className = "btn navy"; a.textContent = "Open the app";
      try { a.href = new URL("app/", brand.href).href; } catch (e) { a.href = "/app/"; }
      bar.appendChild(a);
    }
    if (brand && (!home || fromHere)) {
      var g = document.createElement("div"); g.className = "prhead";
      brand.parentNode.insertBefore(g, brand);
      back.className = "prback"; back.removeAttribute("title");
      g.appendChild(back); g.appendChild(brand);
      bar.classList.add("prhasback");
      return true;
    }
    return false;
  }
  function start() {
    /* a page with no header keeps back in the floating stack */
    if (!header() && (!home || fromHere)) wrap.insertBefore(back, up);
    foot = document.querySelector("body > footer");
    document.body.appendChild(wrap); sync();
    addEventListener("scroll", sync, { passive: true }); addEventListener("resize", sync);
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
