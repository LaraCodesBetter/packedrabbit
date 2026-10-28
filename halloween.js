/* Spooktacular (owner, 28 Oct 2026): first month $1 with code BOO, then $9.99
   a month. Ends Sunday, Nov 1, 2026 at 11:59 pm Eastern. After that this file
   does nothing: the banner never shows and the rabbit takes its costume off. */
(function () {
  var END = Date.UTC(2026, 10, 2, 5, 0, 0); // Nov 2, 12:00 am EST = Nov 1 midnight Eastern
  if (Date.now() >= END) return;
  /* The $1 offer shows only once code BOO exists in Stripe. Flip to true then. */
  var OFFER = false;
  window.prSpooky = true;
  var base = ((document.currentScript && document.currentScript.getAttribute("src")) || "").replace(/halloween\.js.*$/, "");
  [].forEach.call(document.querySelectorAll('img[src$="img/rabbit.svg"]'), function (im) {
    im.src = im.getAttribute("src").replace("rabbit.svg", "rabbit-halloween.svg");
  });
  if (!OFFER) return;
  var b = document.createElement("div");
  b.className = "spook";
  b.setAttribute("role", "region");
  b.setAttribute("aria-label", "Halloween offer");
  b.innerHTML = '<div class="spook-in"><img src="' + base + 'img/rabbit-halloween.svg" alt="" width="44" height="44">' +
    '<p><strong>Spooktacular:</strong> your first month is <strong>$1 with code BOO</strong>, then $9.99 a month. Ends Sunday, Nov 1 at midnight Eastern.</p>' +
    '<a class="spook-btn" href="https://buy.stripe.com/14AaEZaqk99kgzX9Faa3u01" rel="noopener">Get it for $1</a></div>';
  document.body.insertBefore(b, document.body.firstChild);
})();
