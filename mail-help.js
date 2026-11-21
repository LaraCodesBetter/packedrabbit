/* Under every email button (panel review, 21 Nov 2026): what happens after you write, and a way
   through for a phone with no mail app, the address and the message ready to copy. Nothing is sent
   from this page; copying only puts the words on your own clipboard. */
(function () {
  "use strict";
  function run() {
    var css = document.createElement("style");
    css.textContent = ".mhelp{margin:10px 0 0;font-size:.97rem;line-height:1.45;color:var(--ink2);flex-basis:100%}" +
      ".mhelp .mrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}" +
      ".mhelp button{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:inherit;font-weight:700;cursor:pointer}" +
      ".mhelp .mdone{font-weight:700;color:var(--ok,#23673C);align-self:center}";
    document.head.appendChild(css);
    var main = document.querySelector("main") || document.body, seen = [];
    [].forEach.call(main.querySelectorAll('a.btn[href^="mailto:"]'), function (a) {
      var host = a.parentElement; if (seen.indexOf(host) >= 0) return; seen.push(host);
      var group = [].filter.call(host.querySelectorAll('a.btn[href^="mailto:"]'), function () { return true; });
      var lastBtn = group[group.length - 1];
      var box = document.createElement("div"); box.className = "mhelp";
      box.innerHTML = "<p style=\"margin:0\"><strong>What happens next:</strong> a person reads every email and replies in writing from hello@packedrabbit.com.</p>" +
        "<p style=\"margin:6px 0 0\">No mail app opened? Copy what you need and send it from any email account.</p>" +
        '<div class="mrow"><button type="button" data-cp="addr">Copy the address</button>' + (lastBtn ? '<button type="button" data-cp="msg">Copy the message</button>' : "") + '<span class="mdone" role="status" aria-live="polite"></span></div>';
      var spot = document.getElementById("nomail");
      if (spot && host.contains(spot)) spot.replaceWith(box);
      else if (lastBtn.nextSibling) host.insertBefore(box, lastBtn.nextSibling); else host.appendChild(box);
      var done = box.querySelector(".mdone");
      function text(kind) {
        if (kind === "addr") return "hello@packedrabbit.com";
        var u = lastBtn.getAttribute("href") || "", q = u.indexOf("?") >= 0 ? u.slice(u.indexOf("?") + 1) : "", p = new URLSearchParams(q.replace(/\+/g, "%2B"));
        return "To: hello@packedrabbit.com\nSubject: " + (p.get("subject") || "") + "\n\n" + (p.get("body") || "");
      }
      function copy(t, ok) {
        function fallback() { var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); var r = false; try { r = document.execCommand("copy"); } catch (e) {} ta.remove(); done.textContent = r ? ok : "Select and copy: " + t.split("\n")[0]; }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done.textContent = ok; }, fallback); else fallback();
      }
      [].forEach.call(box.querySelectorAll("[data-cp]"), function (b) {
        b.addEventListener("click", function () { var k = b.getAttribute("data-cp"); copy(text(k), k === "addr" ? "Address copied." : "Message copied, with the subject."); });
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
