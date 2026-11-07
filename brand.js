/* The signature on every shared answer (owner, 7 Nov 2026: every tool in the new
   format, the white and green, the bunny, the signature). The cream wordmark is
   loaded with the page, so the tap that shares stays quick, and drawn at the foot
   of the square picture. Nothing is uploaded; the picture is made on the device. */
(function () {
  var base = ((document.currentScript && document.currentScript.getAttribute("src")) || "").replace(/brand\.js.*$/, "");
  var wm = new Image(); wm.src = base + "img/wordmark-cream.png";
  window.prBrand = function (cv) {
    try {
      if (!cv || cv.__prBrand || !wm.complete || !wm.naturalWidth) return cv;
      var g = cv.getContext("2d"), W = cv.width, H = cv.height;
      var w = Math.round(W * 0.2), h = Math.round(w * wm.naturalHeight / wm.naturalWidth);
      /* make room: everything under the tape moves up a little into the empty
         band below it, and the freed strip at the foot takes the card's color */
      var top = Math.round(H * 0.13), lift = Math.round(H * 0.03);
      var bg = g.getImageData(4, H - 4, 1, 1).data;
      var tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H - top;
      tmp.getContext("2d").drawImage(cv, 0, top, W, H - top, 0, 0, W, H - top);
      g.fillStyle = "rgb(" + bg[0] + "," + bg[1] + "," + bg[2] + ")"; g.fillRect(0, top - lift, W, H - top + lift);
      g.drawImage(tmp, 0, top - lift);
      g.fillRect(0, H - lift, W, lift);
      g.save(); g.globalAlpha = 0.96; g.drawImage(wm, Math.round((W - w) / 2), H - h - Math.round(H * 0.018), w, h); g.restore();
      cv.__prBrand = 1;
    } catch (e) { /* shared without it */ }
    return cv;
  };
})();
