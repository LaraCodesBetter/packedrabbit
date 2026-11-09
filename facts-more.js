/* More of the rabbit's "Did you know?" questions (owner, 8 Nov 2026). Each one comes from an
   answer page on this site, and links to it; the source is a government agency where one is
   named. No mover, broker, moving app or other company is named or cited.
   Drawings stay between x 14 and 236; the rabbit's hole is on the right. */
(function () {
  function R(x, y, w, h, c, r) { return '<rect class="' + (c || "") + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (r ? ' rx="' + r + '"' : "") + "/>"; }
  function P(d, c) { return '<path class="' + (c || "") + '" d="' + d + '"/>'; }
  function C(x, y, r, c) { return '<circle class="' + (c || "") + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; }
  function T(x, y, t, s, c) { return '<text class="' + (c || "") + '" x="' + x + '" y="' + y + '" text-anchor="middle" style="font-size:' + (s || 10) + 'px">' + t + "</text>"; }
  /* the walk's box truck, facing right, its back at x, on the ground line */
  function truck(x, s, inside) {
    return '<g transform="translate(' + x + " 344) scale(" + s + ')">' + R(0, -122, 200, 104, "", 6) + (inside || "") +
      P("M200 -88 h46 l34 36 v34 h-80 z", "f2") + P("M210 -78 h30 l24 26 h-54 z", "f3") + R(272, -30, 12, 8, "f3", 2) +
      C(48, -6, 17) + C(48, -6, 6, "f2") + C(238, -6, 17) + C(238, -6, 6, "f2") + "</g>";
  }
  function lines(x, y, w, n, gap) { var d = ""; for (var i = 0; i < n; i++) d += "M" + x + " " + (y + i * gap) + " h" + (i === n - 1 ? w * 0.6 : w) + " "; return P(d, "nf"); }
  var FMCSA = ["FMCSA: Your rights and responsibilities", "https://www.fmcsa.dot.gov/protect-your-move/consumer-rights"];

  Object.assign(window.prFacts = window.prFacts || {}, {
    "phone-price": {
      q: "Can a mover give you a real price over the phone?",
      c: ["Yes, if you list everything", "No, they need to see it"], r: 1,
      a: "No. They need to see it.",
      why: "A real price needs a real inventory, in person or by video. A quote by phone without seeing your things is a warning sign.",
      src: ["FMCSA: Protect your move", "https://www.fmcsa.dot.gov/protect-your-move"],
      more: ["Should a mover see my things first?", "answers/estimate-survey.html"],
      /* a phone, and a price floating out of it */
      art: R(54, 214, 70, 130, "f2", 12) + R(62, 228, 54, 96, "f1", 4) + C(89, 334, 4) +
        P("M134 196 h84 a10 10 0 0 1 10 10 v32 a10 10 0 0 1 -10 10 h-56 l-14 14 v-14 h-14 a10 10 0 0 1 -10 -10 v-32 a10 10 0 0 1 10 -10 z", "f1") + T(176, 228, "$1,200?", 15)
    },
    "round-trip": {
      q: "Should you pay for the mover's empty drive back?",
      c: ["Yes, it's standard", "No, ask for one-way"], r: 1,
      a: "No. Ask for a one-way price.",
      why: "A mover based far away may charge for driving the empty truck to you, or home again. It can add thousands, and you don't have to accept it.",
      src: FMCSA,
      more: ["About round-trip charges", "answers/round-trip-charge.html"],
      /* an empty truck, and the trip back drawn over it */
      art: truck(20, 0.64, T(100, -62, "empty", 18)) + P("M40 222 h124 a20 20 0 0 1 0 40 h-12", "nf") + P("M160 254 l-10 8 l10 8", "nf")
    },
    reweigh: {
      q: "Think the weight on your bill is wrong. Can you ask for a reweigh?",
      c: ["Yes, and it's free", "Only if you pay"], r: 0,
      a: "Yes, and it's free.",
      why: "On an interstate move priced by weight, you can watch every weighing and ask for a reweigh before anything is unloaded. The bill then uses the reweigh, even if it comes out higher.",
      src: FMCSA,
      more: ["Is the weight they charged real?", "answers/moving-weight-reweigh.html"],
      /* the truck on a scale, and the scale's readout */
      art: R(14, 334, 200, 10, "f2", 2) + truck(22, 0.56) + R(194, 234, 40, 52, "f1", 6) + P("M214 286 V334", "nf") + T(214, 258, "lbs", 12) + T(214, 276, "?", 14)
    },
    irs: {
      q: "Does a post office change of address update the IRS?",
      c: ["Yes, automatically", "Don't count on it"], r: 1,
      a: "Don't count on it.",
      why: "Tell the IRS yourself: put the new address on your next return, or send Form 8822. Allow about 45 days.",
      src: ["IRS: Change your address", "https://www.irs.gov/taxtopics/tc157"],
      more: ["Changing your address with the IRS", "answers/change-address-irs-ssa.html"],
      /* the form, and an envelope ready to go */
      art: R(36, 176, 120, 168, "f1", 4) + T(96, 202, "Form 8822", 14) + lines(52, 226, 88, 5, 20) +
        R(146, 288, 88, 56, "f2", 4) + P("M146 288 l44 30 l44 -30", "nf")
    },
    usps: {
      q: "A change-of-address website wants $40. Is that the real one?",
      c: ["Yes, that's the fee", "Probably not"], r: 1,
      a: "Probably not. It's about $1.",
      why: "The official online form costs about a dollar for an identity check, and it's free in person at a post office. Type usps.com yourself instead of clicking an ad.",
      src: ["USPS: Forward mail", "https://www.usps.com/manage/forward.htm"],
      more: ["Is this change-of-address site real?", "answers/usps-fake.html"],
      /* a web page asking $40, struck through, and the real price */
      art: R(24, 196, 210, 138, "f1", 8) + P("M24 218 h210", "nf") + C(38, 207, 3, "f3") + C(50, 207, 3, "f3") + C(62, 207, 3, "f3") +
        T(82, 284, "$40", 30, "pt") + P("M50 274 h66", "plum") + T(178, 284, "$1", 30)
    },
    "truck-license": {
      q: "Do you need a special license for a 26-foot rental truck?",
      c: ["Yes, a commercial one", "Usually not"], r: 1,
      a: "Usually not.",
      why: "A commercial license starts at 26,001 pounds, and the largest rental trucks are rated just under that. Read the weight rating on the sticker inside the driver's door.",
      src: ["FMCSA: Moving your own things", "https://www.fmcsa.dot.gov/regulations/hours-service/hours-service-frequently-asked-questions-non-business-transportation"],
      more: ["Do I need a special license?", "answers/truck-license.html"],
      /* the cab of a truck, the sticker in the door frame */
      art: P("M24 326 V226 q0 -18 18 -18 h96 l62 66 v52 z", "f2") + P("M56 222 h74 l46 50 h-120 z", "f1") + P("M56 280 v40", "nf") +
        R(64, 286, 44, 26, "f3", 2) + T(86, 303, "GVWR", 10) + C(158, 326, 18) + C(158, 326, 7, "f2") + C(52, 326, 18) + C(52, 326, 7, "f2")
    },
    "truck-theft": {
      q: "Is a loaded moving truck safe in a hotel lot overnight?",
      c: ["Yes, if it's locked", "Not without a plan"], r: 1,
      a: "Not without a plan.",
      why: "Loaded moving trucks do get stolen from hotel lots. Park somewhere well lit, back the cargo door against a wall, and take anything you can't replace inside with you.",
      more: ["Leaving a loaded truck overnight", "answers/truck-overnight.html"],
      /* backed up against a wall, under a light */
      art: R(14, 236, 14, 108, "f2") + truck(28, 0.6) + P("M222 344 V176 h-26", "nf") + P("M184 174 h22 l-4 10 h-14 z", "f1")
    },
    fridge: {
      q: "Can you lay a refrigerator down to move it?",
      c: ["Yes, it's fine", "Keep it upright"], r: 1,
      a: "Keep it upright if you can.",
      why: "Lying down can let oil run where it shouldn't. Once it's standing again, makers say to wait at least 2 to 4 hours before plugging it in.",
      more: ["Moving a refrigerator", "answers/fridge-move.html"],
      /* an upright fridge, and the wait */
      art: R(44, 170, 92, 174, "f1", 8) + P("M44 236 h92", "nf") + R(120, 188, 6, 34, "f3", 2) + R(120, 250, 6, 52, "f3", 2) +
        P("M136 322 q34 0 42 22", "nf") + C(192, 222, 28, "f1") + P("M192 222 v-17 M192 222 h13", "nf")
    },
    moth: {
      q: "Can your patio furniture need an inspection before you move?",
      c: ["Never", "Sometimes, yes"], r: 1,
      a: "Sometimes, for spongy moths.",
      why: "Leaving a federal spongy moth quarantine area for a place outside it means inspecting outdoor things like grills, bikes and patio furniture. Skipping a required inspection can bring penalties.",
      src: ["USDA APHIS: Spongy moth", "https://www.aphis.usda.gov/plant-pests-diseases/spongy-moth"],
      more: ["Do I have to check for spongy moths?", "answers/spongy-moth.html"],
      /* a patio chair under a magnifying glass */
      art: R(48, 210, 82, 74, "f1", 10) + R(42, 282, 94, 14, "f2", 4) + P("M50 296 V344 M128 296 V344", "nf") + C(108, 238, 5, "f3") +
        C(182, 250, 26, "f1") + P("M200 269 L226 296", "nf") + R(220, 290, 12, 24, "f3", 4)
    },
    wear: {
      q: "Can a landlord keep your deposit for normal wear and tear?",
      c: ["Yes", "No"], r: 1,
      a: "No, only for damage.",
      why: "Faded paint, a few nail holes and carpet worn thin are normal. Big holes, burns and stains are damage, so take dated photos when you move in and when you move out.",
      more: ["Normal wear and tear", "answers/wear-and-tear.html"],
      /* a wall: the paler patch where a picture hung, and its nail hole */
      art: R(24, 170, 210, 160, "f1") + R(24, 330, 210, 14, "f2") + R(74, 206, 92, 66, "f2", 2) + C(120, 198, 3, "f3") + C(196, 236, 3, "f3") + C(58, 252, 3, "f3")
    },
    tax: {
      q: "Can you deduct your moving costs on your taxes?",
      c: ["Yes, for a job move", "For most people, no"], r: 1,
      a: "For most people, no.",
      why: "On a federal return, only active-duty military moving on orders can deduct it, and from 2026 some intelligence community employees too. A few states still allow it on the state return.",
      src: ["IRS: Topic 455, moving expenses", "https://www.irs.gov/taxtopics/tc455"],
      more: ["Can I deduct my moving costs?", "answers/moving-expenses-tax-deductible.html"],
      /* a long receipt, and a tax form that says no */
      art: P("M40 160 h96 v176 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 z", "f1") + T(88, 186, "Movers", 13) + lines(54, 210, 68, 5, 18) +
        R(150, 226, 82, 118, "f2", 4) + T(191, 250, "Taxes", 13) + lines(162, 270, 58, 3, 18)
    },
    health: {
      q: "Moving to another state. Does your health plan move with you?",
      c: ["Usually, yes", "Often, no"], r: 1,
      a: "Often, no.",
      why: "Marketplace plans and Medicaid are tied to your state. A permanent move usually opens a 60-day window to pick a new plan.",
      src: ["HealthCare.gov", "https://www.healthcare.gov/"],
      more: ["Health insurance after a move", "answers/health-insurance-after-move.html"],
      /* the insurance card, staying behind as you go */
      art: R(28, 236, 150, 96, "f1", 10) + R(28, 256, 150, 16, "f3") + lines(44, 292, 74, 2, 18) + P("M150 206 h70", "nf") + P("M212 198 l9 8 l-9 8", "nf")
    }
  });
})();
