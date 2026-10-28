/* Share your result (owner, 28 Oct 2026: "make this go viral").
   After a quote is checked, one tap makes a picture of the result to share:
   how many red flags, what they were, and packedrabbit.com. It is drawn here
   on the page; nothing is uploaded. Amounts and company names from the quote
   are left out of the picture. */
(function () {
  var KEEP = /fee|charge|estimate|deposit|valuation|protection|coverage|binding|tariff|surcharge/i;
  var CO = /\b(?:[A-Z][\w&.'-]*\s+){0,4}(?:Inc|LLC|L\.L\.C|Co|Corp|Corporation|Company|Holdings|Group|Moving|Movers|Logistics|Van Lines|Relocation|Freight|Transport|Transportation|Storage|Services)\b\.?/g;
  function clean(t) {
    return String(t)
      .replace(/["\u201c]([^"\u201d]{1,60})["\u201d]/g, function (m, x) { return KEEP.test(x) ? m : "another company"; }) // panel review: no company names
      .replace(CO, "another company")
      .replace(/\$[\d,]+(\.\d+)?/g, "")            // no dollar amounts from their quote
      .replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();
  }
  function short(t) {
    var s = String(t).split(/(?<=[.!?])\s/)[0];
    s = s.split(/\s[—–-]\s/)[0];                          // "a broker — someone who..." -> "a broker"
    s = s.replace(/\s+(of|for|at|is|was|costs?)?\s*\$[\d,]+(\.\d+)?.*$/i, ""); // stop before any dollar amount
    s = clean(s).replace(/[.,;:]+$/, "") + "."; s = s.charAt(0).toUpperCase() + s.slice(1);
    return s.length > 70 ? s.slice(0, 67).replace(/\s+\S*$/, "") + "..." : s; }
  function wrap(g, text, x, y, maxW, lh, maxLines) {
    var words = text.split(" "), line = "", n = 0;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = words[i]; if (++n >= maxLines - 1) { line = line + (i < words.length - 1 ? "..." : ""); break; } }
      else line = test;
    }
    g.fillText(line, x, y); return y + lh;
  }
  function draw(flags) {
    var W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d"), F = '-apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif';
    var bad = flags.filter(function (f) { return f.tone === "bad"; }), ask = flags.filter(function (f) { return f.tone === "warn"; });
    g.fillStyle = "#0F2742"; g.fillRect(0, 0, W, H);
    g.save(); g.translate(0, 70); g.rotate(-0.02); g.fillStyle = "#FFC21A"; g.fillRect(-20, 0, W + 40, 36); g.restore();
    g.fillStyle = window.prSpooky ? "#FF8A1F" : "#FFC21A"; g.font = "800 40px " + F; g.fillText(window.prSpooky && bad.length ? "The scariest part of my mover's quote:" : "I checked my mover's quote.", 80, 210);
    g.fillStyle = "#FFFFFF"; g.font = "900 104px " + F;
    var head = bad.length ? bad.length + (bad.length === 1 ? " red flag." : " red flags.") : ask.length ? ask.length + (ask.length === 1 ? " thing to ask." : " things to ask.") : "It looks clean.";
    g.fillText(head, 80, 340);
    var y = 450, list = (bad.length ? bad : ask).slice(0, 4);
    list.forEach(function (f) {
      g.fillStyle = bad.length ? "#D7142E" : "#FFC21A"; g.beginPath(); g.arc(98, y - 14, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#FFFFFF"; g.font = "600 44px " + F; y = wrap(g, short(f.text), 136, y, W - 220, 56, 2) + 30;
    });
    if ((bad.length ? bad : ask).length > 4) { g.fillStyle = "rgba(255,255,255,.75)"; g.font = "600 36px " + F; g.fillText("and " + ((bad.length ? bad : ask).length - 4) + " more", 136, y); }
    g.fillStyle = "#FFC21A"; roundRect(g, 80, H - 300, 620, 104, 52); g.fill();
    g.fillStyle = "#2E2203"; g.font = "900 54px " + F; g.fillText("packedrabbit.com", 120, H - 230);
    g.fillStyle = "rgba(255,255,255,.88)"; g.font = "600 38px " + F; g.fillText("Check yours before you sign.", 80, H - 130);
    g.fillStyle = "rgba(255,255,255,.6)"; g.font = "500 30px " + F; g.fillText("A moving app made by a consumer, for consumers.", 80, H - 80);
    return c;
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  window.prShareResult = function (flags, btn) {
    var c = draw(flags || []);
    var bad = (flags || []).filter(function (f) { return f.tone === "bad"; }).length;
    var text = bad ? "My mover's quote had " + bad + (bad === 1 ? " red flag" : " red flags") + ". Check yours before you sign: https://packedrabbit.com/quote-check/" : "Check your mover's quote before you sign: https://packedrabbit.com/quote-check/";
    c.toBlob(function (blob) {
      var file = new File([blob], "my-quote-check.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: text }).catch(function () {});
      } else {
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "my-quote-check.png"; document.body.appendChild(a); a.click(); a.remove();
        if (btn) { btn.textContent = "Picture saved. Share it anywhere."; }
        try { navigator.clipboard && navigator.clipboard.writeText(text).catch(function () {}); } catch (e) { /* fine */ }
      }
    }, "image/png");
  };
})();
