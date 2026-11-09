/* "Did you know?" for "Will it fit through the door?" (owner, 8 Nov 2026: "bring them
   down the rabbit hole"). Each fact comes from the answer page answers/sofa-corners.html.
   Drawings stay between x 14 and 236; the rabbit's hole is on the right. */
(function () {
  function R(x, y, w, h, c, r) { return '<rect class="' + (c || "") + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (r ? ' rx="' + r + '"' : "") + "/>"; }
  function P(d, c) { return '<path class="' + (c || "") + '" d="' + d + '"/>'; }
  function C(x, y, r, c) { return '<circle class="' + (c || "") + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; }
  function T(x, y, t, s) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" style="font-size:' + (s || 10) + 'px">' + t + "</text>"; }
  function arrowH(x1, x2, y) {
    return P("M" + x1 + " " + y + " H" + x2, "nf") + P("M" + (x1 + 7) + " " + (y - 5) + " L" + x1 + " " + y + " L" + (x1 + 7) + " " + (y + 5), "nf") +
      P("M" + (x2 - 7) + " " + (y - 5) + " L" + x2 + " " + y + " L" + (x2 - 7) + " " + (y + 5), "nf");
  }
  function arrowV(x, y1, y2) {
    return P("M" + x + " " + y1 + " V" + y2, "nf") + P("M" + (x - 5) + " " + (y1 + 7) + " L" + x + " " + y1 + " L" + (x + 5) + " " + (y1 + 7), "nf") +
      P("M" + (x - 5) + " " + (y2 - 7) + " L" + x + " " + y2 + " L" + (x + 5) + " " + (y2 - 7), "nf");
  }
  var MORE = ["Getting a sofa through a door", "answers/sofa-corners.html"];
  Object.assign(window.prFacts = window.prFacts || {}, {
    measure: {
      q: "Which numbers decide whether a sofa fits through a door?",
      c: ["Its length", "Its depth and height"], r: 1,
      a: "Its depth and its height.",
      why: "It goes through on its end or on its back, so those two have to pass the opening. The length hardly matters.",
      more: MORE,
      /* a sofa from the side, with its depth and its height marked */
      art: R(42, 210, 40, 72, "f2", 14) + R(38, 256, 150, 78, "f3", 14) + R(48, 334, 8, 10, "f3", 1) + R(170, 334, 8, 10, "f3", 1) +
        arrowH(38, 188, 194) + T(113, 186, "depth", 14) + arrowV(210, 210, 344) + T(212, 200, "height", 14)
    },
    hinges: {
      q: "Take the door off its hinges. How much room do you gain?",
      c: ["About an inch and a half", "Almost none"], r: 0,
      a: "About an inch and a half.",
      why: "An open door still fills part of the frame. Lift it off its hinges and that space is yours.",
      more: MORE,
      /* an empty doorway, and the door leaning against the wall beside it */
      art: R(34, 130, 108, 214, "f2", 2) + R(46, 142, 84, 202, "f1") + R(44, 168, 6, 16, "f3", 1) + R(44, 300, 6, 16, "f3", 1) +
        P("M166 152 L200 146 L216 344 L180 344 Z", "f3") + C(195, 250, 3) + T(88, 120, "+1½ in", 14)
    },
    hook: {
      q: "A sofa is deeper than the doorway is wide. Can it still go through?",
      c: ["Often, yes", "Never"], r: 0,
      a: "Often, if you hook it.",
      why: "Stand it on end and the top goes through first, then the base swings after it. Take the legs and loose cushions off first.",
      more: MORE,
      /* a sofa standing on its end, its top tipping into the doorway */
      art: R(120, 130, 104, 214, "f2", 2) + R(132, 142, 80, 202, "f1") +
        '<g transform="rotate(12 66 344)">' + R(36, 168, 60, 176, "f3", 14) + P("M62 184 V328", "nf") + "</g>" +
        P("M70 150 q44 -34 86 4", "nf") + P("M146 146 L157 155 L144 158", "nf")
    }
  });
})();
