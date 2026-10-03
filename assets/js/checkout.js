/* ==========================================================================
   SHASHA & CO. — checkout page
   Collects delivery details, then hands the order to a *payment adapter*
   chosen by `checkout` in config.js:

     whatsapp  save the order locally + open a pre-filled WhatsApp message
     shopify   send the shopper to the Shopify checkout URL (needs a store)
     razorpay  not wired yet — see the stub below

   To add Razorpay later, implement ADAPTERS.razorpay and set
   checkout: "razorpay" in config.js. Nothing else on the page changes.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SHASHA_CONFIG;
  var STORE = window.SHASHA_STORE;
  var X = window.SHASHA_EXTRAS;
  var money = STORE.money;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  if (!$("[data-checkout-page]")) return;

  var cart = null;
  var discountCode = "";

  /* -------------------------------------------------------------- pricing */
  function totals() {
    var subtotal = cart.subtotal;
    var off = discountCode && CFG.offer ? Math.round(subtotal * CFG.offer.percent / 100) : 0;
    var after = subtotal - off;
    var shipping = after >= CFG.freeShippingThreshold ? 0 : CFG.shippingFlat;
    return { subtotal: subtotal, discount: off, shipping: shipping, total: after + shipping };
  }

  function renderSummary() {
    var t = totals();
    var html = cart.lines.map(function (l) {
      return '<div class="co__line">' +
        '<div class="co__thumb"><img src="' + esc(l.image) + '" alt=""><span>' + l.quantity + "</span></div>" +
        "<div><b>" + esc(l.title) + "</b><small>" + esc([l.colour, l.size && "Size " + l.size].filter(Boolean).join(" · ")) + "</small></div>" +
        '<div class="co__amt">' + money(l.lineAmount) + "</div></div>";
    }).join("");
    $("#summaryLines").innerHTML = html;
    $("#summaryTotals").innerHTML =
      "<div><span>Subtotal</span><span>" + money(t.subtotal) + "</span></div>" +
      (t.discount ? '<div class="co__disc"><span>Discount (' + esc(discountCode) + ")</span><span>&minus;" + money(t.discount) + "</span></div>" : "") +
      "<div><span>Shipping</span><span>" + (t.shipping ? money(t.shipping) : "Free") + "</span></div>" +
      '<div class="co__grand"><span>Total</span><span>' + money(t.total) + "</span></div>" +
      (t.shipping
        ? '<p class="co__hint">Add ' + money(CFG.freeShippingThreshold - (t.subtotal - t.discount)) + " more for free shipping.</p>"
        : "");
  }

  /* ------------------------------------------------------------- adapters */
  function orderText(order) {
    var lines = order.lines.map(function (l) {
      return "• " + l.title + " — " + [l.colour, l.size && "Size " + l.size].filter(Boolean).join(", ") +
        " × " + l.quantity + " — " + money(l.lineAmount);
    }).join("\n");
    var d = order.customer;
    return [
      "Hi Shasha Trends! I'd like to place an order (" + order.id + ").",
      "",
      lines,
      "",
      "Subtotal: " + money(order.totals.subtotal),
      order.totals.discount ? "Discount (" + order.code + "): -" + money(order.totals.discount) : null,
      "Shipping: " + (order.totals.shipping ? money(order.totals.shipping) : "Free"),
      "Total: " + money(order.totals.total),
      "",
      "Deliver to:",
      d.name + " · " + d.phone,
      d.address + ", " + d.city + ", " + d.state + " " + d.pincode,
      d.note ? "Note: " + d.note : null,
      "",
      "Please share payment details. Thank you!"
    ].filter(function (x) { return x !== null; }).join("\n");
  }

  var ADAPTERS = {
    whatsapp: function (order) {
      var text = orderText(order);
      var url = X.whatsappLink(text);
      X.copyText(text);
      try { localStorage.setItem("shasha.lastOrder", JSON.stringify({ order: order, url: url, text: text })); } catch (e) { /* private mode */ }
      window.open(url, "_blank", "noopener");
      return STORE.cart.clear().then(function () {
        window.location.href = "order.html?id=" + encodeURIComponent(order.id);
      });
    },

    shopify: function () {
      var url = STORE.cart.state().checkoutUrl;
      if (!url) throw new Error("Shopify checkout is not available right now.");
      window.location.href = url;
      return Promise.resolve();
    },

    /* TODO: create the order server-side, open Razorpay Checkout with the
       returned order_id, then redirect to order.html on success. The secret
       key must live on a server (e.g. a Cloudflare Worker), never here. */
    razorpay: function () {
      throw new Error("Razorpay is not connected yet.");
    }
  };

  /* ---------------------------------------------------------------- form */
  function field(name) { return $('[name="' + name + '"]').value.trim(); }

  function validate() {
    var errors = {};
    if (field("name").length < 2) errors.name = "Enter your full name";
    if (!/^(?:60|0)1\d{8,9}$/.test(field("phone").replace(/[\s+\-]/g, ""))) errors.phone = "Enter a Malaysian mobile number, e.g. 012 345 6789";
    if (field("address").length < 6) errors.address = "Enter your full address";
    if (field("city").length < 2) errors.city = "Enter your city";
    if (field("state").length < 2) errors.state = "Enter your state";
    if (!/^\d{5}$/.test(field("pincode"))) errors.pincode = "Enter a 5-digit postcode";

    ["name", "phone", "address", "city", "state", "pincode"].forEach(function (k) {
      var el = $('[data-err="' + k + '"]');
      el.textContent = errors[k] || "";
      $('[name="' + k + '"]').classList.toggle("is-bad", Boolean(errors[k]));
    });
    var first = Object.keys(errors)[0];
    if (first) $('[name="' + first + '"]').focus();
    return !first;
  }

  function halt(message) {
    $("#checkoutLines").innerHTML = '<p class="co__error-banner">' + esc(message) + "</p>" +
      '<a class="btn btn--solid btn--full" href="shop.html" style="margin-top:16px">Shop now</a>';
    $("#checkoutForm").hidden = true;
  }

  function wire() {
    $("#applyCode").addEventListener("click", function () {
      var v = $("#codeInput").value.trim().toUpperCase();
      var msg = $("#codeMsg");
      if (CFG.offer && v === CFG.offer.code) {
        discountCode = v;
        msg.textContent = CFG.offer.label + " applied.";
        msg.className = "co__ok";
      } else {
        discountCode = "";
        msg.textContent = v ? "That code isn't valid." : "";
        msg.className = "co__err";
      }
      renderSummary();
    });

    $("#checkoutForm").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;

      var btn = $("#place");
      btn.disabled = true;
      btn.textContent = "Placing order…";

      var t = totals();
      var order = {
        id: "ST-" + Date.now().toString(36).toUpperCase().slice(-6),
        placedAt: new Date().toISOString(),
        code: discountCode || null,
        totals: t,
        lines: cart.lines.map(function (l) {
          return { title: l.title, colour: l.colour, size: l.size, quantity: l.quantity, lineAmount: l.lineAmount };
        }),
        customer: {
          name: field("name"), phone: field("phone"), email: field("email"),
          address: field("address"), city: field("city"), state: field("state"),
          pincode: field("pincode"), note: field("note")
        }
      };

      var run = ADAPTERS[CFG.checkout];
      try {
        if (!run) throw new Error("Unknown checkout method: " + CFG.checkout);
        Promise.resolve(run(order)).catch(fail);
      } catch (err) { fail(err); }

      function fail(err) {
        btn.disabled = false;
        btn.textContent = "Place order";
        $("#formError").textContent = err.message || "Something went wrong. Please try again.";
        $("#formError").hidden = false;
      }
    });
  }

  /* ----------------------------------------------------------------- boot */
  STORE.cart.load().then(function (c) {
    cart = c;
    if (!c.lines.length) return halt("Your bag is empty.");
    $("#codeInput").placeholder = CFG.offer ? CFG.offer.code : "Discount code";
    $("#placeNote").textContent = CFG.checkout === "whatsapp"
      ? "Next, we'll open WhatsApp with your order so we can confirm it and share payment options (online banking, DuitNow or card link)."
      : "You'll continue to our secure payment page.";
    renderSummary();
    wire();
  }).catch(function (err) {
    halt("The shop isn't reachable right now. " + err.message);
  });
})();
