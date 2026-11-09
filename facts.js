/* The rabbit's "Did you know?" (owner, 8 Nov 2026: "a did you know ... really good
   questions ... bring them down the rabbit hole"). A question, a one-tap guess, then the
   answer and where it comes from. Each answer leads to one next question and one tool,
   and the trail ends. No feed, no counts, no streaks.
   Sources are government and consumer agencies only, never a mover, broker or moving app.
   Each fact has a small drawing on the left; the rabbit comes up out of his hole on the right. */
(function () {
  function R(x, y, w, h, c, r) { return '<rect class="' + (c || "") + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (r ? ' rx="' + r + '"' : "") + "/>"; }
  function P(d, c) { return '<path class="' + (c || "") + '" d="' + d + '"/>'; }
  function C(x, y, r, c) { return '<circle class="' + (c || "") + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; }
  function T(x, y, t, s, c) { return '<text class="' + (c || "") + '" x="' + x + '" y="' + y + '" text-anchor="middle" style="font-size:' + (s || 10) + 'px">' + t + "</text>"; }
  /* the walk's box truck, facing right, its back at x, sitting on the ground line */
  function truck(x, s, c) {
    return '<g class="' + (c || "") + '" transform="translate(' + x + " 344) scale(" + s + ')">' + R(0, -122, 200, 104, "", 6) + P("M100 -122 v104", "nf") +
      P("M200 -88 h46 l34 36 v34 h-80 z", "f2") + P("M210 -78 h30 l24 26 h-54 z", "f3") + R(272, -30, 12, 8, "f3", 2) +
      C(48, -6, 17) + C(48, -6, 6, "f2") + C(238, -6, 17) + C(238, -6, 6, "f2") + "</g>";
  }
  function tag(x, y, t, s) { return P("M" + x + " " + (y - 24) + " v10", "nf") + P("M" + (x - 30) + " " + (y - 14) + " h60 v30 h-60 z", "f3") + C(x, y - 6, 3) + T(x, y + 11, t, s || 13); }

  window.prFacts = {
    truck: {
      q: "Does every moving company own a truck?",
      c: ["Yes, of course", "No"], r: 1,
      a: "No. A broker owns none.",
      why: "It sells your move to a company that does. You may not know which one until the truck pulls up.",
      src: ["FMCSA: Movers vs. brokers", "https://www.fmcsa.dot.gov/protect-your-move/movers-vs-brokers"],
      more: ["Mover or broker? How to tell", "movers-vs-brokers/"],
      /* the truck that isn't there: a dashed outline with a question mark in the box */
      art: truck(14, 0.74, "dash") + T(88, 300, "?", 44)
    },
    deposit: {
      q: "Is a big deposit normal?",
      c: ["Yes, it holds the date", "No"], r: 1,
      a: "No. It's a warning sign.",
      why: "The FTC and FMCSA both list a large deposit as a red flag. Some real movers take nothing up front.",
      src: ["FTC: Avoid scams when you hire a moving company", "https://consumer.ftc.gov/consumer-alerts/2024/09/avoid-scams-when-you-hire-moving-company"],
      more: ["Check a quote's deposit", "quote-check/"],
      /* a stack of bills and a fat envelope */
      art: R(40, 318, 120, 26, "f1", 3) + C(100, 331, 8, "nf") + T(100, 335, "$", 11) +
        R(46, 292, 120, 26, "f1", 3) + C(106, 305, 8, "nf") + T(106, 309, "$", 11) +
        R(36, 266, 120, 26, "f1", 3) + C(96, 279, 8, "nf") + T(96, 283, "$", 11) +
        R(150, 296, 84, 48, "f3", 3) + P("M150 296 l42 26 l42 -26", "nf")
    },
    cents: {
      q: "The mover breaks your 10-pound laptop. What's the least they can pay?",
      c: ["What it cost", "$6"], r: 1,
      a: "$6, on the free coverage.",
      why: "The free option pays 60 cents a pound. Between states, full value protection is the default, and you only get the free one if you sign for it.",
      src: ["FMCSA: Protect Your Move", "https://www.fmcsa.dot.gov/protect-your-move"],
      more: ["Read the whole answer", "answers/valuation.html"],
      /* a laptop on a bathroom scale, and a price tag */
      art: R(44, 326, 140, 18, "f2", 6) + R(94, 330, 40, 10, "", 2) + T(114, 338, "10 lb", 8) +
        R(66, 252, 96, 62, "f1", 4) + R(74, 260, 80, 46, "", 2) + R(54, 314, 120, 12, "", 4) +
        P("M174 318 Q190 316 196 306", "nf") + P("M198 290 h40 v26 h-40 l-10 -13 z", "f3") + C(194, 303, 2.5, "nf") + T(220, 308, "$6", 14)
    },
    hostage: {
      q: "The estimate said $2,000. At delivery they want $3,000 or they won't unload. Do you have to pay it?",
      c: ["Yes", "No"], r: 1,
      a: "No. $2,200 at most.",
      why: "On a non-binding estimate between states, they can only demand 110% at delivery. Anything more is billed later, and you have time to question it.",
      src: ["FMCSA: Protect Your Move", "https://www.fmcsa.dot.gov/protect-your-move"],
      more: ["Read the whole answer", "answers/movers-holding-goods-hostage.html"],
      /* the truck, doors shut, a padlock on the back with a tag: 110% */
      art: truck(64, 0.68) + R(68, 282, 18, 16, "tape", 3) + P("M71 282 v-6 a6 6 0 0 1 12 0 v6", "nf") + P("M77 298 Q 64 306 48 306", "nf") + P("M18 306 h60 v30 h-60 z", "f3") + C(24, 321, 2.5, "nf") + T(50, 327, "110%", 12)
    },
    calls: {
      q: "Can you make a company stop calling you?",
      c: ["Yes", "Not really"], r: 0,
      a: "Yes. Ask once.",
      why: "Say \"Please put me on your do-not-call list\" and note the date. Under the FTC's rules, that company has to stop.",
      src: ["FTC: Do Not Call questions", "https://www.consumer.ftc.gov/national-do-not-call-registry-faqs"],
      more: ["Mover or broker? How to tell", "movers-vs-brokers/"],
      /* a ringing phone with a no sign over it */
      art: R(84, 232, 72, 112, "", 12) + R(90, 244, 60, 84, "f1", 4) + C(120, 336, 3, "nf") +
        P("M70 260 q-10 14 0 28 M58 252 q-18 22 0 44 M170 260 q10 14 0 28 M182 252 q18 22 0 44", "nf") +
        C(120, 288, 52, "plum nf") + P("M84 252 l72 72", "plum nf")
    }
  };
})();
