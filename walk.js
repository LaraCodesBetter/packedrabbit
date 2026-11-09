/* The walk-through engine for the free tools (owner, 7 Nov 2026: "a walk-through
   page for everything, same style as first view, elegant, calm and simple").
   A page calls prWalk({ start, steps, scene }) and gets one question at a time,
   a line drawing behind it, Back at the foot, and the full tool underneath.
   Nothing typed here is sent anywhere. */
(function () {
  var ROOM = '<g class="wk-room"><line x1="0" y1="326" x2="360" y2="326"/><rect x="10" y="150" width="70" height="194" rx="2"/><line x1="10" y1="198" x2="80" y2="198"/><line x1="10" y1="248" x2="80" y2="248"/><line x1="10" y1="298" x2="80" y2="298"/><rect class="rf" x="18" y="166" width="8" height="32"/><rect x="28" y="170" width="7" height="28"/><rect class="rf" x="252" y="96" width="88" height="104" rx="2"/><line x1="296" y1="96" x2="296" y2="200"/><line x1="252" y1="148" x2="340" y2="148"/><path class="rf" d="M242 88 h16 c-3 30 3 66 -2 120 h-14z"/><path class="rf" d="M350 88 h-16 c3 30 -3 66 2 120 h14z"/><line x1="236" y1="88" x2="358" y2="88"/><rect x="246" y="200" width="100" height="7" rx="2"/><path d="M310 200 l3-14 h16 l3 14z"/><path d="M321 186 c-7-9 -8-18 -3-23 M321 186 c5-10 12-14 16-12"/></g>';
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /* the site's root, from where this file was loaded, so links and the rabbit work from any page */
  var BASE = ((document.currentScript && document.currentScript.src) || "").replace(/walk\.js(\?.*)?$/, "");
  /* "Did you know?": the rabbit comes up out of his hole at the right, behind its front rim */
  function hole() {
    return '<path class="f3" d="M236 345 q8 -16 62 -16 q54 0 62 16 z"/><ellipse class="wk-hole" cx="298" cy="341" rx="44" ry="8"/>' +
      '<clipPath id="wk-hc"><rect x="230" y="150" width="140" height="191"/></clipPath><g clip-path="url(#wk-hc)">' +
      '<image class="wk-pop" href="' + BASE + 'img/rabbit-peek.webp" x="250" y="236" width="96" height="106"/></g>' +
      '<path class="wk-rim" d="M254 341 q44 14 88 0"/>';
  }
  var EARS = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11.5 18c-2.4-4-3.4-9.3-1.6-12.6 1.5-.4 3.6 2.4 4.4 6.5M20.5 18c2.4-4 3.4-9.3 1.6-12.6-1.5-.4-3.6 2.4-4.4 6.5"/><path d="M5 27.5c1.6-5.4 5.8-9 11-9s9.4 3.6 11 9"/></svg>';
  function svg(fore, room) {
    return '<svg viewBox="0 0 360 352" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' + (room === false ? "" : (window.prArt ? window.prArt.ROOM : ROOM)) +
      '<rect class="wk-gnd" x="-400" y="344" width="1160" height="40"/><g class="wk-fore">' + (fore || "") + '</g><line class="wk-gline" x1="-400" y1="344" x2="760" y2="344"/></svg>';
  }
  window.prWalkSvg = svg;

  window.prWalk = function (cfg) {
    var main = document.querySelector("main");
    if (!main || document.documentElement.classList.contains("embed")) return null;
    var host = document.createElement("section");
    host.className = "walk"; host.id = "walk"; host.setAttribute("aria-label", cfg.label || "Step by step");
    main.parentNode.insertBefore(host, main);
    main.classList.add("wk-under"); main.id = main.id || "main";
    var uh = document.createElement("p"); uh.className = "wk-under-h"; uh.textContent = cfg.underTitle || "Everything on one page";
    main.insertBefore(uh, main.firstChild);
    document.body.classList.add("has-walk"); document.body.classList.add("wk-closed");
    /* owner, 7 Nov: nothing stacked. The whole tool waits behind one button, out of sight until asked for. */

    var S = cfg.state || {}, hist = [], cur = null, lastScene = null;
    /* the rabbit's facts for this page (site/facts.js): a guess, then the answer, then the next one */
    var FX = window.prFacts || {}, FK = (cfg.facts || []).filter(function (k) { return FX[k]; });
    function here(u) { return (BASE + u).replace(/[?#].*$/, "") === location.href.replace(/[?#].*$/, "").replace(/index\.html$/, ""); }
    FK.forEach(function (k, i) {
      var f = FX[k], nx = FK[i + 1];
      cfg.steps["f-" + k] = { fact: k, say: "Did you know?", h: f.q, scene: "fact-" + k,
        choices: f.c.map(function (c, j) { return { label: c, run: function (S, api) { S["fx_" + k] = j; api.go("a-" + k); return false; } }; }) };
      cfg.steps["a-" + k] = { fact: k, scene: "fact-" + k,
        say: function (S) { return S["fx_" + k] === f.r ? "You knew it." : "Easy to miss."; },
        h: f.a, sub: f.why,
        fine: f.src ? 'From <a href="' + esc(f.src[1]) + '" rel="noopener">' + esc(f.src[0]) + "</a>" : "",
        cta: nx ? { label: "Next question", go: "f-" + nx } : (cfg.factsEnd || { label: "Back to the start", run: function (S, api) { hist = []; api.replace(typeof cfg.start === "function" ? cfg.start(S) : cfg.start); return false; } }),
        link: f.more && !here(f.more[1]) ? { label: f.more[0], href: BASE + f.more[1] } : null };
    });
    function nextFact() { for (var i = 0; i < FK.length; i++) if (S["fx_" + FK[i]] == null) return FK[i]; return FK[0]; }
    var api = {
      S: S,
      go: function (id) { if (cur) hist.push(cur); show(id); },
      replace: function (id) { show(id); },
      back: function () { if (hist.length) show(hist.pop()); },
      tool: function () { document.body.classList.remove("wk-closed"); var r = matchMedia("(prefers-reduced-motion: reduce)").matches; main.scrollIntoView({ behavior: r ? "auto" : "smooth" }); },
      redraw: function () { var sc = host.querySelector(".wk-scene"); if (sc) sc.innerHTML = scene(cur, false); }
    };
    function scene(id, fresh) {
      var st = cfg.steps[id], name = typeof st.scene === "function" ? st.scene(S) : st.scene;
      if (st.fact) return '<div class="' + (fresh ? "wk-draw" : "") + '" style="position:absolute;inset:0">' + svg((FX[st.fact].art || "") + hole(), false) + "</div>";
      var out = cfg.scene ? cfg.scene(name, S) : "";
      return '<div class="' + (fresh ? "wk-draw" : "") + '" style="position:absolute;inset:0">' + svg(out, st.room) + "</div>";
    }
    function act(a, el) {
      if (!a) return;
      if (a.run) { var r = a.run(S, api, el); if (r === false) return; }
      if (a.href) { location.href = a.href; return; }
      if (a.tool) { api.tool(); return; }
      if (a.go) api.go(typeof a.go === "function" ? a.go(S) : a.go);
    }
    function show(id) {
      var st = cfg.steps[id]; if (!st) return;
      if (st.enter) st.enter(S, api);
      cur = id;
      /* alpha test, 8 Nov: Back from another page started the walk over at question 1. This tab remembers the step. */
      try { sessionStorage.setItem("wk:" + location.pathname, JSON.stringify({ id: id, hist: hist, S: S })); } catch (e) {}
      var h = '<div class="wk-text">';
      if (st.say) h += '<p class="wk-say">' + esc(typeof st.say === "function" ? st.say(S) : st.say) + "</p>";
      h += '<h2 class="wk-h" tabindex="-1">' + esc(typeof st.h === "function" ? st.h(S) : st.h) + "</h2>";
      var sub = typeof st.sub === "function" ? st.sub(S) : st.sub;
      if (sub) h += '<p class="wk-sub">' + esc(sub) + "</p>";
      if (st.html) h += (typeof st.html === "function" ? st.html(S) : st.html);
      if (st.field) {
        var f = st.field;
        h += '<div class="wk-field"><label class="sr" for="wk-' + f.id + '" style="position:absolute;left:-9999px">' + esc(f.label || st.h) + "</label>";
        if (f.type === "textarea") h += '<textarea id="wk-' + f.id + '" placeholder="' + esc(f.placeholder || "") + '">' + esc(S[f.id] || "") + "</textarea>";
        else h += '<input id="wk-' + f.id + '" type="' + (f.type || "text") + '" inputmode="' + (f.inputmode || "text") + '" placeholder="' + esc(f.placeholder || "") + '" value="' + esc(S[f.id] || "") + '" autocomplete="off">';
        h += "</div>";
      }
      if (st.list) {
        var L = typeof st.list === "function" ? st.list(S) : st.list;
        h += '<ul class="wk-list">' + L.map(function (x) { return '<li class="' + (x.plum ? "plum" : "") + '"><b>' + esc(x.b) + "</b>" + esc(x.t || "") + (x.a ? ' <a href="' + esc(x.a[1]) + '">' + esc(x.a[0]) + "</a>" : "") + "</li>"; }).join("") + "</ul>";
      }
      if (st.choices) h += '<div class="wk-choices">' + st.choices.map(function (c, i) { return '<button type="button" class="wk-choice" data-c="' + i + '">' + esc(c.label) + (c.small ? "<small>" + esc(c.small) + "</small>" : "") + "</button>"; }).join("") + "</div>";
      if (st.cta) h += '<button type="button" class="wk-cta" data-cta>' + esc(st.cta.label) + "</button>";
      if (st.link) h += '<button type="button" class="wk-link" data-link>' + esc(st.link.label) + "</button>";
      if (st.dyk && FK.length) h += '<button type="button" class="wk-dyk" data-dyk>' + EARS + "Did you know?</button>";
      var fine = typeof st.fine === "function" ? st.fine(S) : st.fine;
      if (fine) h += '<p class="wk-fine">' + fine + "</p>";
      h += "</div>";
      var fresh = (typeof st.scene === "function" ? st.scene(S) : st.scene) !== lastScene;
      lastScene = typeof st.scene === "function" ? st.scene(S) : st.scene;
      h += '<div class="wk-scene">' + scene(id, fresh) + '</div><div class="wk-band"></div>';
      /* alpha test, 8 Nov: the first page offered Home even when someone came from another page of the site. Back goes back there. */
      var cameFrom = false; try { cameFrom = !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1; } catch (e) {}
      h += '<div class="wk-nav">' + (hist.length ? '<button type="button" data-back>Back</button>' : cameFrom ? '<button type="button" data-back-page>Back</button>' : '<a href="' + (cfg.home || "../") + '" data-back-home>Home</a>');
      h += '<button type="button" class="wk-all" data-all>' + esc(cfg.allLabel || "See the whole tool") + "</button></div>";
      host.innerHTML = h;
      [].forEach.call(host.querySelectorAll("[data-c]"), function (b) { b.onclick = function () { act(st.choices[+b.getAttribute("data-c")], b); }; });
      var c = host.querySelector("[data-cta]"); if (c) c.onclick = function () { act(st.cta, c); };
      var l = host.querySelector("[data-link]"); if (l) l.onclick = function () { act(st.link, l); };
      var bb = host.querySelector("[data-back]"); if (bb) bb.onclick = api.back;
      var dk = host.querySelector("[data-dyk]"); if (dk) dk.onclick = function () { api.go("f-" + nextFact()); };
      var bp = host.querySelector("[data-back-page]"); if (bp) bp.onclick = function () { history.back(); };
      host.querySelector("[data-all]").onclick = api.tool;
      if (st.field) {
        var inp = host.querySelector("#wk-" + st.field.id);
        inp.addEventListener("input", function () { S[st.field.id] = inp.value; if (st.field.live) { st.field.live(S, api); } });
      }
      if (st.after) st.after(S, api, host);
      if (started) { var hh = host.querySelector(".wk-h"); try { hh.focus({ preventScroll: true }); } catch (e) {} if (host.getBoundingClientRect().top < 0) window.scrollTo(0, 0); }
    }
    var started = false, first = typeof cfg.start === "function" ? cfg.start(S) : cfg.start;
    try {
      var nav = (performance.getEntriesByType("navigation")[0] || {}).type;
      var was = (nav === "back_forward" || nav === "reload") && JSON.parse(sessionStorage.getItem("wk:" + location.pathname) || "null");
      if (was && cfg.steps[was.id] && (was.hist || []).every(function (k) { return cfg.steps[k]; })) { Object.assign(S, was.S || {}); hist = was.hist || []; first = was.id; }
    } catch (e) {}
    show(first);
    started = true;
    return api;
  };
})();
