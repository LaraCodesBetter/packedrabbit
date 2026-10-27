/* The homepage lens (owner, 27 Oct 2026). A made-up quote built from real ones.
   Owner, 27 Oct, on an iPhone: "not making sense". The lens no longer magnifies
   (enlarged words landed on the wrong lines), it steps from one red flag to the
   next on its own, and on a phone you tap a line instead of dragging, so the
   page still scrolls. Nothing here is sent anywhere. */
(function () {
  var Q = [
    ["ESTIMATE AND ORDER FOR SERVICE", "", 1],
    ["Sample Moving Co.", ""],
    ["We arrange your move through our nationwide network of carriers.", "A broker, not a mover. Someone else's truck comes."],
    ["Pickup window: 72 hours. Survey waived.", "Nobody looked at your things. Expect the price to change."],
    ["Estimated weight: 4,200 lbs", ""],
    ["Line haul                 $2,769.00", ""],
    ["Fuel surcharge              $415.35", ""],
    ["Binding estimate fee      $2,001.99", "A fee almost as big as the move. Ask what it's for."],
    ["Availability discount     -$615.35", ""],
    ["Total                     $4,770.99", ""],
    ["Deposit 30% at booking, non-refundable.", "Too much up front, and you can't get it back."],
    ["Valuation: [X] $0.60 per lb", "The weakest coverage, already ticked."],
    ["This price is valid today only.", "Pressure. A real price lasts more than a day."]
  ];
  var quote = document.getElementById("lensq");
  if (!quote) return;
  var base = document.getElementById("lbase"), read = document.getElementById("lread"), reading = document.getElementById("reading"), all = document.getElementById("lall"), nextBtn = document.getElementById("lnext");
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function plain(x) { return x.replace(/\s{2,}/g, " "); }
  var html = Q.map(function (q) { return '<span class="l' + (q[2] ? " h" : "") + (q[1] ? " f" : "") + '">' + esc(q[0]) + "</span>"; }).join("");
  base.innerHTML = html; read.innerHTML = html;
  var flagIdx = []; Q.forEach(function (q, i) { if (q[1]) flagIdx.push(i); });
  var flags = flagIdx.length;
  document.getElementById("lcount").textContent = flags + " red flags.";
  var lines = [].slice.call(base.querySelectorAll(".l"));
  var R = 96, pos = { x: 0, y: 0 }, last = -2, cur = 0;
  function size() { R = window.innerWidth < 700 ? 70 : 96; quote.style.setProperty("--r", R + "px"); }
  function box(i) { var r = lines[i].getBoundingClientRect(), q = quote.getBoundingClientRect(); return { top: r.top - q.top, h: r.height, left: r.left - q.left, w: r.width }; }
  function lineAt(y) {
    var hit = 0, best = 1e9;
    lines.forEach(function (el, i) { var b = box(i), d = Math.abs(b.top + b.h / 2 - y); if (d < best) { best = d; hit = i; } });
    return hit;
  }
  function say(i) {
    if (i === last) return; last = i;
    var n = flagIdx.indexOf(i);
    if (n >= 0) { cur = n; reading.className = "reading hit"; reading.innerHTML = '<span class="dot"></span><div><small>Red flag ' + (n + 1) + " of " + flags + "</small><b>" + esc(Q[i][1]) + "</b><span>" + esc(plain(Q[i][0])) + "</span></div>"; }
    else { reading.className = "reading"; reading.innerHTML = '<span class="dot"></span><div><b>Nothing wrong with this line.</b><span>Tap Next red flag, or tap another line.</span></div>'; }
  }
  /* the lens sits on one line, centered on its words */
  function show(i) {
    var b = box(i), x = b.left + Math.min(b.w, quote.clientWidth - b.left - 20) / 2, y = b.top + b.h / 2;
    x = Math.max(R * 0.6, Math.min(quote.clientWidth - R * 0.6, x));
    pos = { x: x, y: y };
    quote.style.setProperty("--px", x + "px"); quote.style.setProperty("--py", y + "px");
    read.style.setProperty("--x", (x - read.offsetLeft) + "px"); read.style.setProperty("--y", (y - read.offsetTop) + "px");
    lines.forEach(function (el, k) { el.classList.toggle("on", k === i && !!Q[k][1]); });
    if (!quote.classList.contains("all")) say(i);
  }
  size();
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) quote.classList.add("still");
  show(flagIdx[2]);
  /* on its own: one red flag after another, until someone takes over */
  var auto = null;
  function stop() { if (auto) { clearInterval(auto); auto = null; } }
  function next() { show(flagIdx[(cur + 1) % flags]); }
  if (!still) { show(flagIdx[0]); auto = setInterval(next, 3200); }
  nextBtn.addEventListener("click", function () { stop(); if (quote.classList.contains("all")) toggleAll(); next(); });
  /* a mouse can drag; a finger taps a line, so the page still scrolls */
  var drag = false;
  function pt(e) { var q = quote.getBoundingClientRect(); return { x: e.clientX - q.left, y: e.clientY - q.top }; }
  quote.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse") { stop(); drag = true; show(lineAt(pt(e).y)); } });
  quote.addEventListener("pointermove", function (e) { if (drag) show(lineAt(pt(e).y)); });
  window.addEventListener("pointerup", function () { drag = false; });
  quote.addEventListener("click", function (e) { stop(); show(lineAt(pt(e).y)); });
  quote.addEventListener("keydown", function (e) {
    var m = { ArrowUp: -1, ArrowDown: 1 }[e.key];
    if (m) { e.preventDefault(); stop(); show(Math.max(0, Math.min(lines.length - 1, lineAt(pos.y) + m))); }
  });
  window.addEventListener("resize", function () { size(); show(lineAt(pos.y)); });
  function toggleAll() {
    var on = quote.classList.toggle("all");
    all.textContent = on ? "Use the lens again" : "Show all " + flags;
    if (on) {
      stop();
      reading.className = "reading list";
      reading.innerHTML = flagIdx.map(function (i) { return "<p><b>" + esc(Q[i][1]) + "</b> <span>" + esc(plain(Q[i][0])) + "</span></p>"; }).join("");
    } else { last = -2; show(flagIdx[cur]); }
  }
  all.addEventListener("click", toggleAll);
})();
