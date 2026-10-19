/* The Packed Rabbit — the site's only script. No trackers, no requests to
   anyone else. The fit check uses the app's own rule (doorFit): you carry a
   piece long end first, so its cross-section is what has to pass. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- will it go through ---------- */
  var DOOR_H = 80, LEGS = 4;
  function doorFit(dims, W, H) {
    var d = dims.slice().sort(function (x, y) { return x - y; });
    var a = d[0], b = d[1];
    if (a <= W && b <= H) return { ok: true, how: "Straight through, long end first.", across: a, up: b, spare: W - a };
    if (b <= W && a <= H) return { ok: true, how: "On its side, long end first.", across: b, up: a, spare: W - b };
    return { ok: false, across: a, up: b, short: Math.ceil(a - W) };
  }
  function fitInit() {
    var svg = $("fit-svg"); if (!svg) return;
    var k = { door: $("k-door"), h: $("k-h"), d: $("k-d"), l: $("k-l"), legs: $("k-legs") };
    var frame = $("frame"), piece = $("piece"), dims = $("dims"), says = $("fit-says");
    var S = 3.85, FLOOR = 362, CX = 250;
    function draw() {
      var W = +k.door.value, h = +k.h.value - (k.legs.checked ? LEGS : 0), d = +k.d.value, l = +k.l.value;
      $("v-door").textContent = W + " in"; $("v-h").textContent = (+k.h.value) + " in"; $("v-d").textContent = d + " in"; $("v-l").textContent = l + " in";
      var r = doorFit([h, d, l], W, DOOR_H);
      frame.textContent = ""; piece.textContent = ""; dims.textContent = "";
      var dw = W * S, dh = DOOR_H * S, dx = CX - dw / 2, dy = FLOOR - dh;
      /* wall with the opening cut out */
      el("path", { d: "M0 0H500V" + FLOOR + "H" + (dx + dw) + "V" + dy + "H" + dx + "V" + FLOOR + "H0Z", fill: "#17365E" }, frame);
      el("rect", { x: dx, y: dy, width: dw, height: dh, fill: "#06121F" }, frame);
      el("path", { d: "M" + (dx - 7) + " " + FLOOR + "V" + (dy - 7) + "H" + (dx + dw + 7) + "V" + FLOOR, fill: "none", stroke: "#E9EEF5", "stroke-width": 7, "stroke-linejoin": "round" }, frame);
      /* the face that has to pass */
      var pw = r.across * S, ph = r.up * S, px = CX - pw / 2, py = FLOOR - ph;
      var col = r.ok ? "#2EE59D" : "#FF5C76";
      el("rect", { class: "piece", x: px, y: py, width: pw, height: ph, rx: 8, fill: r.ok ? "rgba(46,229,157,.28)" : "rgba(255,92,118,.22)", stroke: col, "stroke-width": 3 }, piece);
      if (!r.ok) {
        var over = (pw - dw) / 2;
        el("rect", { x: px, y: py, width: over + 4, height: ph, fill: "url(#hatch)" }, piece);
        el("rect", { x: dx + dw - 4, y: py, width: over + 4, height: ph, fill: "url(#hatch)" }, piece);
      }
      /* sofa arms drawn on the face so it reads as a sofa end */
      var arm = Math.min(pw, ph) * 0.18;
      el("path", { d: "M" + (px + arm) + " " + (py + ph * .45) + "H" + (px + pw - arm), stroke: col, "stroke-width": 2, opacity: .6, fill: "none", "stroke-dasharray": "6 6" }, piece);
      /* measurements */
      var t = el("text", { x: CX, y: dy - 14, fill: "#FFC21A", "text-anchor": "middle" }, dims); t.textContent = "door " + W + " in";
      el("path", { d: "M" + dx + " " + (dy - 30) + "H" + (dx + dw), stroke: "#FFC21A", "stroke-width": 2, "marker-start": "", fill: "none" }, dims);
      var t2 = el("text", { x: CX, y: py + ph / 2 + 22, fill: "#fff", "text-anchor": "middle" }, dims); t2.textContent = r.across + " × " + r.up + " in";
      var t3 = el("text", { x: CX, y: FLOOR + 26, fill: "rgba(255,255,255,.6)", "text-anchor": "middle", "font-size": 13 }, dims);
      t3.textContent = "the end of the sofa, as it meets the doorway";
      /* what to say */
      var html;
      if (r.ok) {
        var tight = r.spare < 2;
        html = '<span class="dot" aria-hidden="true">✓</span><span>It goes through. ' + r.how +
          "<small>" + r.spare + (r.spare === 1 ? " inch" : " inches") + " to spare." +
          (tight ? " Tight: wrap the arms, and take the door off its hinges for about 1⅜ inches more." : "") + "</small></span>";
      } else {
        var legsWould = !k.legs.checked && doorFit([h - LEGS, d, l], W, DOOR_H).ok;
        var hint = legsWould ? "Take the legs off and it goes through. Try the switch below."
          : r.short <= 1 ? "Take the door off its hinges: that gives back about 1⅜ inches."
          : "Not through this doorway, any way up. Measure another way in, or ask the movers about a window or a hoist.";
        html = '<span class="dot" aria-hidden="true">✕</span><span>' + r.short + (r.short === 1 ? " inch" : " inches") + " too wide." +
          "<small>Carried any way up, the end that has to pass is " + r.across + " × " + r.up + " inches. " + hint + "</small></span>";
      }
      says.className = "verdict " + (r.ok ? "ok" : "no");
      says.innerHTML = html;
    }
    ["door", "h", "d", "l"].forEach(function (n) { k[n].addEventListener("input", draw); });
    k.legs.addEventListener("change", draw);
    draw();
  }

  /* ---------- the truck filling ---------- */
  function truckInit() {
    var svg = $("truck"); if (!svg) return;
    var X0 = 18, Y0 = 34, COLS = 14, ROWS = 5, CW = 30, CH = 32;
    var BW = COLS * CW, BH = ROWS * CH;
    el("rect", { x: X0 - 6, y: Y0 - 6, width: BW + 12, height: BH + 12, rx: 10, fill: "none", stroke: "currentColor", "stroke-width": 3, opacity: .55 }, svg);
    /* cab */
    el("path", { d: "M" + (X0 + BW + 10) + " " + (Y0 + 40) + "h62l34 46v78h-96z", fill: "#0F2742", opacity: .9 }, svg);
    el("path", { d: "M" + (X0 + BW + 22) + " " + (Y0 + 52) + "h44l24 34h-68z", fill: "#9CC0FF", opacity: .85 }, svg);
    [X0 + 70, X0 + 300, X0 + BW + 62].forEach(function (cx) {
      el("circle", { cx: cx, cy: Y0 + BH + 24, r: 20, fill: "#1A2433" }, svg);
      el("circle", { cx: cx, cy: Y0 + BH + 24, r: 8, fill: "#C9CED6" }, svg);
    });
    /* furniture goes in first, at the front (by the cab); boxes behind it */
    var furn = [[12, 0, 2, 3], [12, 3, 2, 2], [10, 0, 2, 2], [10, 2, 2, 3], [8, 0, 2, 5], [7, 0, 1, 3], [6, 0, 1, 2]];
    var used = {};
    furn.forEach(function (f, i) {
      var c = f[0], r = f[1], w = f[2], h = f[3];
      for (var a = 0; a < w; a++) for (var b = 0; b < h; b++) used[(c + a) + "," + (r + b)] = 1;
      el("rect", { x: X0 + c * CW + 2, y: Y0 + r * CH + 2, width: w * CW - 4, height: h * CH - 4, rx: 6, fill: i % 2 ? "#5B8CFF" : "#1F6BFF" }, svg);
    });
    var boxes = 0, target = 49 - Object.keys(used).length;
    for (var c = COLS - 1; c >= 0; c--) for (var r = ROWS - 1; r >= 0; r--) {
      var key = c + "," + r; if (used[key]) continue;
      var x = X0 + c * CW + 2, y = Y0 + r * CH + 2;
      if (boxes < target) {
        el("rect", { x: x, y: y, width: CW - 4, height: CH - 4, rx: 3, fill: (c + r) % 3 ? "#C9A27A" : "#B88B5E" }, svg);
        el("rect", { x: x + (CW - 4) / 2 - 3, y: y, width: 6, height: CH - 4, fill: "#FFC21A", opacity: .85 }, svg);
        boxes++;
      } else {
        el("rect", { x: x, y: y, width: CW - 4, height: CH - 4, rx: 3, fill: "none", stroke: "currentColor", opacity: .22, "stroke-dasharray": "4 4" }, svg);
      }
    }
    var t = el("text", { x: X0 + 8, y: 22, fill: "currentColor", "font-weight": 800, "font-size": 16, "font-family": "ui-rounded,system-ui,sans-serif" }, svg);
    t.textContent = "70% full · 20-foot truck";
  }

  /* ---------- reviews, only once a review server exists ---------- */
  function reviewsInit() {
    var sec = $("reviews"); if (!sec) return;
    var srv = sec.getAttribute("data-server");
    if (!srv || /REPLACE_ME/.test(srv)) return;
    fetch(srv + "/reviews").then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.count) return;
      var esc = function (t) { var e = document.createElement("span"); e.textContent = t; return e.innerHTML; };
      $("rv-sum").textContent = d.average + " out of 5, from " + d.count + (d.count === 1 ? " review" : " reviews") + ", including the ones people kept private.";
      $("rv-list").innerHTML = d.reviews.slice(0, 12).map(function (r) {
        return '<div class="panel" style="margin-bottom:12px"><p style="margin:0 0 6px;font-size:1.1rem;letter-spacing:2px" aria-label="' + r.stars + ' out of 5 stars">' + "★★★★★".slice(0, r.stars) + '<span style="opacity:.25">' + "★★★★★".slice(r.stars) + "</span></p>" + (r.text ? "<p>" + esc(r.text) + "</p>" : "") + '<p class="muted" style="margin:0">' + esc(r.name || "Someone who moved") + " · " + esc(r.at) + "</p></div>";
      }).join("");
      sec.hidden = false;
    }).catch(function () {});
  }

  fitInit(); truckInit(); reviewsInit();
})();
