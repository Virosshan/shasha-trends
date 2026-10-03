/* ==========================================================================
   SHASHA & CO. — order confirmation
   Shows the order saved by checkout.js (whatsapp mode) with a button to
   re-open the WhatsApp message in case the first window was blocked.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("orderRoot");
  if (!root) return;

  var STORE = window.SHASHA_STORE;
  var money = STORE.money;
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var saved = null;
  try { saved = JSON.parse(localStorage.getItem("shasha.lastOrder")); } catch (e) { /* private mode */ }
  var id = new URLSearchParams(location.search).get("id");

  if (!saved || !saved.order || saved.order.id !== id) {
    root.innerHTML =
      '<p class="t-eyebrow">Thank you</p><h1 class="t-h1" style="margin:10px 0 8px">We have your order</h1>' +
      '<p class="muted">If you placed an order, we will confirm it on WhatsApp shortly.</p>' +
      '<a class="btn" href="shop.html" style="margin-top:24px">Keep shopping</a>';
    return;
  }

  var o = saved.order;
  root.innerHTML =
    '<p class="t-eyebrow">Order ' + esc(o.id) + "</p>" +
    '<h1 class="t-h1" style="margin:10px 0 8px">One last step</h1>' +
    '<p class="muted">Send your order to us on WhatsApp so we can confirm it and share payment details. ' +
      "Your order is not final until we reply.</p>" +
    '<a class="btn btn--wa btn--full" style="margin-top:20px" target="_blank" rel="noopener" data-copy-order href="' + esc(saved.url) + '">Send order on WhatsApp</a>' +
    (window.SHASHA_CONFIG.whatsappNumber ? "" :
      '<div class="copybox"><p class="t-small muted">WhatsApp links from our profile cannot carry your order, so paste this into the chat:</p>' +
      '<textarea readonly rows="8" data-order-text>' + esc(saved.text || "") + '</textarea>' +
      '<button type="button" class="btn btn--sm" data-copy-btn>Copy order</button></div>') +
    '<div class="co__lines" style="margin-top:28px">' + o.lines.map(function (l) {
      return '<div class="co__line" style="grid-template-columns:1fr auto"><div><b>' + esc(l.title) + "</b><small>" +
        esc([l.colour, l.size && "Size " + l.size].filter(Boolean).join(" · ")) + " × " + l.quantity +
        '</small></div><div class="co__amt">' + money(l.lineAmount) + "</div></div>";
    }).join("") + "</div>" +
    '<div class="co__totals"><div class="co__grand"><span>Total</span><span>' + money(o.totals.total) + "</span></div></div>" +
    '<p class="t-small muted" style="margin-top:14px">Delivering to ' + esc(o.customer.name) + ", " + esc(o.customer.city) + " " + esc(o.customer.pincode) + ".</p>" +
    '<a class="link-u" href="shop.html" style="display:inline-block;margin-top:24px">Keep shopping</a>';

  var btn = root.querySelector("[data-copy-btn]");
  if (btn) {
    btn.addEventListener("click", function () {
      var box = root.querySelector("[data-order-text]");
      box.select();
      (navigator.clipboard ? navigator.clipboard.writeText(box.value) : Promise.reject()).then(
        function () { btn.textContent = "Copied"; },
        function () { document.execCommand("copy"); btn.textContent = "Copied"; });
    });
  }
})();
