/* The homepage lens (owner, 27 Oct 2026). A made-up quote built from real ones;
   the monocle reads down it once, then anyone can drag it over any line.
   Nothing here is sent anywhere. */
(function () {
  var Q = [
    ["ESTIMATE AND ORDER FOR SERVICE", "", 1],
    ["Sample Moving Co.", ""],
    ["We arrange your move through our nationwide network of carriers.", "A broker, not a mover. Someone else's truck comes."],
    ["Pickup window: 72 hours. Survey waived.", "Nobody looked at your things. Expect the price to change."],
    ["Estimated weight: 4,200 lbs", ""],
    ["Line haul                 $2,769.00", ""],
    ["Fuel surcharge              $415.35", ""],
    ["Binding estimate fee      $2,001.99", "A fee bigger than the move. Ask what it's for."],
    ["Availability discount     -$615.35", ""],
    ["Total                     $4,770.99", ""],
    ["Deposit 30% at booking, non-refundable.", "Too much up front, and you can't get it back."],
    ["Valuation: [X] $0.60 per lb", "The weakest coverage, already ticked."],
    ["This price is valid today only.", "Pressure. A real price lasts more than a day."]
  ];
  var quote = document.getElementById("lensq");
  if (!quote) return;
  var base = document.getElementById("lbase"), read = document.getElementById("lread"), reading = document.getElementById("reading"), all = document.getElementById("lall");
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function plain(x) { return x.replace(/\s{2,}/g, " "); }
  var html = Q.map(function (q) { return '<span class="l' + (q[2] ? " h" : "") + (q[1] ? " f" : "") + '">' + esc(q[0]) + "</span>"; }).join("");
  base.innerHTML = html; read.innerHTML = html;
  var flags = Q.filter(function (q) { return q[1]; }).length;
  document.getElementById("lcount").textContent = flags + " red flags.";
  var lines = [].slice.call(base.querySelectorAll(".l")), fls = [].slice.call(base.querySelectorAll(".l.f"));
  var R = 96, pos = { x: 0, y: 0 }, last = -2;
  function size() { R = window.innerWidth < 700 ? 84 : 112; quote.style.setProperty("--r", R + "px"); }
  function say(x, y) {
    var q = quote.getBoundingClientRect(), hit = -1, best = 1e9;
    lines.forEach(function (el, i) { var r = el.getBoundingClientRect(), d = Math.abs(r.top - q.top + r.height / 2 - y); if (d < best) { best = d; hit = i; } });
    var on = best < R * 0.55 && Q[hit][1] ? hit : -1;
    if (on === last) return; last = on;
    reading.className = "reading" + (on >= 0 ? " hit" : "");
    reading.innerHTML = on >= 0
      ? '<span class="dot"></span><div><b>' + esc(Q[on][1]) + "</b><span>" + esc(plain(Q[on][0])) + "</span></div>"
      : '<span class="dot"></span><div><b>Nothing wrong with this line.</b><span>Keep moving the lens. There are ' + flags + " red flags on this quote.</span></div>";
  }
  function place(x, y) {
    var w = quote.clientWidth, h = quote.clientHeight;
    x = Math.max(R * 0.4, Math.min(w - R * 0.4, x)); y = Math.max(R * 0.4, Math.min(h - R * 0.4, y)); pos = { x: x, y: y };
    quote.style.setProperty("--px", x + "px"); quote.style.setProperty("--py", y + "px");
    read.style.setProperty("--x", (x - read.offsetLeft) + "px"); read.style.setProperty("--y", (y - read.offsetTop) + "px");
    if (!quote.classList.contains("all")) say(x, y);
  }
  function at(el) { var r = el.getBoundingClientRect(), q = quote.getBoundingClientRect(); return { x: r.left - q.left + Math.min(r.width, 260) / 2 + 40, y: r.top - q.top + r.height / 2 }; }
  size();
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rest = at(fls[2]); place(rest.x, rest.y);
  var moved = false;
  /* one sweep on load: the lens reads down the quote and rests on the big fee */
  if (!still) {
    var path = [at(fls[0]), at(fls[1]), at(fls[2])], i = 0, from = { x: pos.x, y: 30 }, t0 = null, dur = 650;
    place(from.x, from.y);
    var step = function (ts) {
      if (moved) return;
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, to = path[i];
      place(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      if (k < 1) return requestAnimationFrame(step);
      i++; if (i < path.length) { from = { x: pos.x, y: pos.y }; t0 = null; setTimeout(function () { requestAnimationFrame(step); }, 380); }
    };
    setTimeout(function () { requestAnimationFrame(step); }, 500);
  }
  var drag = false;
  function pt(e) { var q = quote.getBoundingClientRect(); return { x: e.clientX - q.left, y: e.clientY - q.top }; }
  quote.addEventListener("pointerdown", function (e) { moved = true; drag = true; try { quote.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } var p = pt(e); place(p.x, p.y); });
  quote.addEventListener("pointermove", function (e) { if (drag || e.pointerType === "mouse") { moved = true; var p = pt(e); place(p.x, p.y); } });
  quote.addEventListener("pointerup", function () { drag = false; });
  quote.addEventListener("keydown", function (e) {
    var d = 24, m = { ArrowUp: [0, -d], ArrowDown: [0, d], ArrowLeft: [-d, 0], ArrowRight: [d, 0] }[e.key];
    if (m) { e.preventDefault(); moved = true; place(pos.x + m[0], pos.y + m[1]); }
  });
  window.addEventListener("resize", function () { size(); place(pos.x, pos.y); });
  all.addEventListener("click", function () {
    var on = quote.classList.toggle("all");
    all.textContent = on ? "Use the lens again" : "Show everything it found";
    if (on) {
      reading.className = "reading list";
      reading.innerHTML = Q.filter(function (q) { return q[1]; }).map(function (q) { return "<p><b>" + esc(q[1]) + "</b> <span>" + esc(plain(q[0])) + "</span></p>"; }).join("");
    } else { last = -2; say(pos.x, pos.y); }
  });
})();
