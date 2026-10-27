/* "Where are you in your move?" (owner, 27 Oct 2026): take people by the hand.
   Pick where you are; see the next three steps, each with the one button that
   does it. The choice is remembered on this device only. */
(function () {
  var P = {
    start: { n: "Just getting started", steps: [
      ["Put in your moving date", "Everything counts back from that one day: what to do this week, and when to book.", "Start my plan", "app/?stage=new"],
      ["Measure the big pieces", "The sofa, the bed, the dresser. Find out now what won't fit through the new door.", "Will it fit?", "fit/"],
      ["Decide: movers or a truck", "See what each would cost for your home, and which pieces are worth moving at all.", "Compare the costs", "diy-cost/"]] },
    movers: { n: "Hiring movers", steps: [
      ["Find out who you're talking to", "A mover owns trucks. A broker sells your move to someone else. Ask, then look them up.", "Mover or broker?", "movers-vs-brokers/"],
      ["Check every quote before you sign", "Paste it in. See the hidden fees, the big deposit and the weak coverage.", "Check a quote", "#check"],
      ["Keep every quote side by side", "Stars for facts, every call logged, the deposit paid by card and tracked.", "Open my quotes", "app/?stage=started"]] },
    diy: { n: "Moving myself", steps: [
      ["Pick the right truck", "Sized from what you own, not a guess from how many bedrooms you have.", "What size truck?", "truck/"],
      ["Get the boxes, free if you can", "How many you need, which sizes, and where people find them free.", "How many boxes?", "boxes/"],
      ["Number every box as you pack", "Say what's in it. Find the coffee maker in a second, months later.", "Start my boxes", "app/?stage=started"]] },
    booked: { n: "Already booked", steps: [
      ["Read the paperwork now, not on move day", "What the bill of lading is, and what to check before you sign it.", "Read before you sign", "answers/bill-of-lading.html"],
      ["Pack so you can find everything", "Numbered boxes with photos, and a list of what rides with you, not on the truck.", "Start my boxes", "app/?stage=booked"],
      ["Get your move-day plan", "One list for the day, counted back from the time the truck comes.", "See the checklist", "checklist/"]] },
    week: { n: "Moving this week", steps: [
      ["Pack what stays with you", "Medicine, documents, chargers, keys, and the pet bag. Never on the truck.", "My stays-with-me list", "app/?stage=booked"],
      ["Photograph every empty room", "Your proof for the deposit, taken before you hand back the keys.", "Get the deposit back", "deposit/"],
      ["Change your address", "The post office, the bank, the DMV and the rest, in the right order.", "Change of address", "change-address/"]] },
    moved: { n: "Just moved in", steps: [
      ["Check every box in", "Mark each one as it comes off the truck, and note anything damaged right away.", "Open my boxes", "app/?stage=booked"],
      ["Know your claim deadline", "How long you have to file for damage or loss, and how to do it.", "Damage claims", "answers/claim.html"],
      ["Get your old deposit back", "Your state's deadline, and the letter to send if it's late.", "My deposit", "deposit/"]] }
  };
  var root = document.getElementById("guide"); if (!root) return;
  var chips = root.querySelector(".gchips"), out = root.querySelector(".gsteps"), cta = root.querySelector(".gcta");
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  chips.innerHTML = Object.keys(P).map(function (k) { return '<button type="button" data-k="' + k + '" aria-pressed="false">' + esc(P[k].n) + "</button>"; }).join("");
  function pick(k) {
    var p = P[k] || P.start;
    [].forEach.call(chips.children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.k === k)); });
    out.innerHTML = p.steps.map(function (s) {
      return '<li><div><b>' + esc(s[0]) + "</b><span>" + esc(s[1]) + '</span></div><a class="btn ghost small" href="' + s[3] + '">' + esc(s[2]) + "</a></li>";
    }).join("");
    var st = { start: "new", movers: "started", diy: "started", booked: "booked", week: "booked", moved: "booked" }[k] || "new";
    cta.href = "app/?stage=" + st;
    try { localStorage.setItem("pr-guide", k); } catch (e) { /* private mode */ }
  }
  chips.addEventListener("click", function (e) { var b = e.target.closest("button[data-k]"); if (b) pick(b.dataset.k); });
  var saved = null; try { saved = localStorage.getItem("pr-guide"); } catch (e) { /* fine */ }
  pick(P[saved] ? saved : "start");
})();
