/* ==========================================================================
   SHASHA & CO. — conversion layer
   Reviews, FAQ, size guide, colour strip, offer capture and the WhatsApp
   button. Content lives in the objects at the top so it can be edited without
   touching any logic below.

   EVERYTHING MARKED "SAMPLE" IS PLACEHOLDER COPY — replace it with real
   reviews and your real size chart before launch.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SHASHA_CONFIG;
  var STORE = window.SHASHA_STORE;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ------------------------------------------------------------- content */
  /* SAMPLE reviews. Replace with real ones: { name, city, rating, title, text, product } */
  var REVIEWS = [
    { name: "Nadia A.", city: "Kuala Lumpur", rating: 5, title: "Perfect for everyday", text: "The kurti fits true to size and the cotton is so soft. Wore it to work and got compliments all day.", product: "Lilac Chikankari Kurti" },
    { name: "Priya S.", city: "Rawang", rating: 5, title: "Loved the showroom", text: "Tried a few sizes at the showroom and the team was so helpful. I left with two kurtis and a skirt.", product: "Indigo Block-Print Kurti" },
    { name: "Meera K.", city: "Petaling Jaya", rating: 5, title: "So twirly!", text: "The patchwork skirt is gorgeous in person. So many colours, and it swishes beautifully.", product: "Patchwork Tiered Skirt" },
    { name: "Divya T.", city: "Johor Bahru", rating: 4, title: "Easy exchange", text: "Needed a size up and they swapped it without any fuss. Great service.", product: "Teal Striped Kurti" }
  ];

  /* SAMPLE measurements in inches — replace with the real size chart. */
  var SIZE_CHART = {
    head: ["Size", "Bust", "Waist", "Hip", "Kurti length"],
    rows: [
      ["S", "36", "32", "38", "42"],
      ["M", "38", "34", "40", "42"],
      ["L", "40", "36", "42", "43"],
      ["XL", "42", "38", "44", "43"],
      ["XXL", "44", "40", "46", "44"]
    ],
    note: "Measurements are of the garment, in inches, and may differ slightly by style. Between sizes? Take the larger for an easier fit. Skirts have an elasticated waist."
  };

  var FAQ = [
    ["Can I try before I buy?", "Yes. Visit us at Shasha's KL showroom or our Rawang showroom to see and try the pieces in person. Message us on WhatsApp for the address and opening hours."],
    ["What size should I order?", "Check the size guide on any product page. Still unsure? Message us on WhatsApp with your bust and waist and we'll tell you which size to take."],
    ["What are the clothes made of?", "Most of our kurtis are soft, breathable cotton, and our skirts are a light cotton blend. The fabric is listed on every product page."],
    ["How long does delivery take?", "Orders ship in " + CFG.dispatchDays + " and arrive in " + CFG.deliveryDays + ". We'll send tracking details on WhatsApp once it ships."],
    ["Can I exchange for a different size?", "Yes: one free size exchange within 7 days of delivery, on unworn pieces with tags intact. Message us on WhatsApp to start it."],
    ["How do I pay?", "Place your order here and we'll confirm it on WhatsApp, with payment options (online banking, DuitNow or card link)."],
    ["Do you ship outside Malaysia?", "Not yet. Message us on WhatsApp if you're overseas and we'll see what we can do."]
  ];

  /* --------------------------------------------------------------- helpers */
  /* With a number we can pre-fill the message. The bio's message link
     (wa.me/message/...) cannot, so callers also copy the text — see copyText. */
  function whatsappLink(msg) {
    if (CFG.whatsappNumber) return "https://wa.me/" + CFG.whatsappNumber + "?text=" + encodeURIComponent(msg);
    return CFG.whatsappMessageLink;
  }

  function copyText(text) {
    if (CFG.whatsappNumber) return Promise.resolve(false);
    var done = function () { toastMsg("Order details copied. Paste them in the chat."); return true; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(done, function () { return false; });
    }
    return Promise.resolve(false);
  }

  var toastEl, toastTimer;
  function toastMsg(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add("is-on"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 3200);
  }

  function stars(n) {
    var out = "";
    for (var i = 1; i <= 5; i++) out += '<i class="star' + (i <= Math.round(n) ? " is-on" : "") + '">★</i>';
    return out;
  }

  function ratingSummary() {
    if (!REVIEWS.length) return null;
    var sum = REVIEWS.reduce(function (s, r) { return s + r.rating; }, 0);
    return { avg: (sum / REVIEWS.length).toFixed(1), count: REVIEWS.length };
  }

  function sampleTag() {
    return CFG.sampleContent ? ' <em class="sample-pill">Sample</em>' : "";
  }

  /* --------------------------------------------------------------- reviews */
  function renderReviews(scope, heading) {
    var el = $("[data-reviews]", scope);
    if (!el || !REVIEWS.length) return;
    var s = ratingSummary();
    el.innerHTML =
      '<div class="wrap">' +
        '<div class="section-head reveal"><div>' +
          '<p class="t-eyebrow">' + esc(heading || "Loved by our customers") + sampleTag() + "</p>" +
          '<h2 class="t-h1" style="margin-top:8px">' + s.avg + " <span class=\"stars\">" + stars(s.avg) + "</span>" +
            ' <small class="muted t-body">from ' + s.count + " reviews</small></h2>" +
        "</div></div>" +
        '<div class="reviews">' + REVIEWS.map(function (r) {
          return '<figure class="review reveal">' +
            '<div class="stars">' + stars(r.rating) + "</div>" +
            "<h3>" + esc(r.title) + "</h3>" +
            "<blockquote>" + esc(r.text) + "</blockquote>" +
            "<figcaption><b>" + esc(r.name) + "</b> · " + esc(r.city) +
              '<span class="verified">Verified buyer</span>' +
              '<span class="rev-prod">' + esc(r.product) + "</span></figcaption>" +
          "</figure>";
        }).join("") + "</div>" +
      "</div>";
    /* Injected after the page's scroll-reveal observer ran, so show it now. */
    $$(".reveal", el).forEach(function (n) { n.classList.add("is-in"); });
  }

  /* ------------------------------------------------------------------- FAQ */
  function renderFAQ() {
    var el = $("[data-faq]");
    if (!el) return;
    el.innerHTML = FAQ.map(function (f, i) {
      return '<div class="acc__item' + (i === 0 ? " is-open" : "") + '">' +
        '<button type="button" class="acc__btn">' + esc(f[0]) + " <i></i></button>" +
        '<div class="acc__panel"><div><p>' + esc(f[1]) + "</p></div></div></div>";
    }).join("");
    $$(".acc__btn", el).forEach(function (btn) {
      btn.addEventListener("click", function () { btn.parentElement.classList.toggle("is-open"); });
    });

    /* FAQ rich result */
    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(function (f) {
        return { "@type": "Question", name: f[0], acceptedAnswer: { "@type": "Answer", text: f[1] } };
      })
    });
    document.head.appendChild(ld);
  }

  /* ------------------------------------------------------------ size guide */
  function ensureSizeGuide() {
    if ($("[data-size-modal]")) return;
    var m = document.createElement("div");
    m.className = "modal";
    m.setAttribute("data-size-modal", "");
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-label", "Size guide");
    m.innerHTML =
      '<div class="modal__card">' +
        '<button type="button" class="icon-btn modal__x" data-close-modal aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button>' +
        '<p class="t-eyebrow">Size guide' + sampleTag() + "</p>" +
        '<h2 class="t-h2" style="margin:6px 0 16px">Find your fit</h2>' +
        '<div class="table-wrap"><table class="sizetable"><thead><tr>' +
          SIZE_CHART.head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          SIZE_CHART.rows.map(function (r) {
            return "<tr>" + r.map(function (c, i) { return (i ? "<td>" : "<th>") + esc(c) + (i ? "</td>" : "</th>"); }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>" +
        '<p class="t-small muted" style="margin-top:14px">' + esc(SIZE_CHART.note) + "</p>" +
        '<a class="btn btn--wa btn--full" style="margin-top:18px" target="_blank" rel="noopener" href="' +
          esc(whatsappLink("Hi Shasha Trends! Could you help me pick a size? My bust is ___ and waist is ___.")) + '">Not sure? Ask us on WhatsApp</a>' +
      "</div>";
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      if (e.target === m || e.target.closest("[data-close-modal]")) m.classList.remove("is-open");
    });
  }

  function renderSizeTable() {
    var t = $("[data-sizetable]");
    if (!t) return;
    t.innerHTML = "<thead><tr>" + SIZE_CHART.head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + SIZE_CHART.rows.map(function (r) {
        return "<tr>" + r.map(function (c, i) { return (i ? "<td>" : "<th>") + esc(c) + (i ? "</td>" : "</th>"); }).join("") + "</tr>";
      }).join("") + "</tbody>";
    $$("[data-sample-pill]").forEach(function (p) { if (!CFG.sampleContent) p.remove(); });
  }

  /* ---------------------------------------------------- home colour strip */
  function renderSwatchStrip() {
    var el = $("[data-swatch-strip]");
    if (!el) return;
    STORE.products().then(function (list) {
      el.innerHTML = list.map(function (p) {
        return '<a class="swatch-tile reveal" href="product.html?handle=' + esc(p.handle) + '">' +
          '<span class="swatch-tile__img"><img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" loading="lazy"></span>' +
          '<span class="swatch-tile__name"><i style="background:' + esc(p.colours[0].hex) + '"></i>' + esc(p.colour) + "</span></a>";
      }).join("");
      $$(".reveal", el).forEach(function (n) { n.classList.add("is-in"); });
    });
  }

  /* -------------------------------------------------------------- showrooms */
  function renderShowrooms() {
    var el = $("[data-showrooms]");
    if (!el) return;
    el.innerHTML = (CFG.showrooms || []).map(function (r) {
      var ask = "Hi Shasha Trends! Could you share the address and opening hours of " + r.name + "?";
      return '<div class="showroom reveal is-in">' +
        '<p class="area">' + esc(r.area) + "</p>" +
        "<h3>" + esc(r.name) + "</h3>" +
        "<p>" + (r.address ? esc(r.address) : "Message us for the address and opening hours.") + "</p>" +
        (r.hours ? "<p>" + esc(r.hours) + "</p>" : "") +
        '<a class="btn btn--wa" target="_blank" rel="noopener" data-wa-copy="' + esc(ask) + '" href="' + esc(whatsappLink(ask)) + '">Get directions &amp; hours</a>' +
      "</div>";
    }).join("");
  }

  /* -------------------------------------------------------- floating button */
  function renderFab() {
    if ($("[data-fab]") || /checkout|order/.test(location.pathname)) return;
    var a = document.createElement("a");
    a.className = "fab";
    a.setAttribute("data-fab", "");
    a.target = "_blank";
    a.rel = "noopener";
    a.href = whatsappLink("Hi Shasha Trends! I have a question.");
    a.setAttribute("aria-label", "Chat with us on WhatsApp");
    a.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.7l4.5-1.2A8.7 8.7 0 1 0 12 3.2Z"/><path d="M9.2 8.6c.2-.4.5-.4.8-.4.2 0 .4.2.5.4l.6 1.4c0 .2 0 .4-.2.6l-.5.6c.7 1.3 1.6 2.1 3 2.7l.6-.7c.2-.2.4-.3.6-.2l1.4.7c.3.1.4.3.3.7-.2.9-1.1 1.5-2 1.4-3-.5-5.2-2.8-5.6-5.4 0-.4.1-.9.4-1.5Z"/></svg><span>Chat</span>';
    document.body.appendChild(a);
  }

  /* ------------------------------------------------------------ offer popup */
  var SEEN = "shasha.offerSeen";
  function seen() { try { return localStorage.getItem(SEEN); } catch (e) { return null; } }
  function markSeen() { try { localStorage.setItem(SEEN, "1"); } catch (e) { /* private mode */ } }

  function renderOffer() {
    if (!CFG.offer || seen() || /checkout|order/.test(location.pathname)) return;

    var m = document.createElement("div");
    m.className = "modal modal--offer";
    m.innerHTML =
      '<div class="modal__card modal__card--offer">' +
        '<button type="button" class="icon-btn modal__x" data-close-modal aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button>' +
        '<p class="t-eyebrow">Welcome to Shasha Trends</p>' +
        '<h2 class="t-h1" style="margin:8px 0 10px">' + esc(CFG.offer.label) + "</h2>" +
        '<p class="muted t-body">Join the list for new arrivals and showroom news before anyone else, and take your code.</p>' +
        '<form data-offer-form novalidate>' +
          '<input class="field" type="email" name="email" placeholder="Your email address" required aria-label="Email address">' +
          '<button class="btn btn--solid btn--full" type="submit" style="margin-top:10px">Get my code</button>' +
        "</form>" +
        '<div data-offer-done hidden><p class="offer-code">' + esc(CFG.offer.code) + '</p><p class="t-small muted">Applied at checkout. Happy shopping.</p></div>' +
        '<button type="button" class="link-u t-small" data-close-modal style="margin-top:14px">No thanks</button>' +
      "</div>";
    document.body.appendChild(m);

    function open() {
      if (seen() || $(".modal.is-open")) return;
      m.classList.add("is-open");
    }
    function close() { m.classList.remove("is-open"); markSeen(); }

    m.addEventListener("click", function (e) {
      if (e.target === m || e.target.closest("[data-close-modal]")) close();
    });
    $("[data-offer-form]", m).addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("input", e.target);
      if (!input.value || !input.checkValidity()) { input.focus(); return; }
      STORE.subscribe(input.value).then(function () {
        e.target.hidden = true;
        $("[data-offer-done]", m).hidden = false;
        markSeen();
      });
    });

    /* After 25s, or on desktop exit intent — whichever comes first. */
    var t = setTimeout(open, 25000);
    document.addEventListener("mouseout", function onOut(e) {
      if (e.clientY <= 0 && !e.relatedTarget) { clearTimeout(t); open(); document.removeEventListener("mouseout", onOut); }
    });
  }

  /* ------------------------------------------------------------------ hooks */
  window.SHASHA_EXTRAS = {
    whatsappLink: whatsappLink,
    copyText: copyText,
    stars: stars,
    ratingSummary: ratingSummary,
    reviews: REVIEWS,
    afterPDP: function () {
      ensureSizeGuide();
      renderReviews(document, "Reviews");
    }
  };

  document.addEventListener("click", function (e) {
    var wa = e.target.closest("[data-wa-copy]");
    if (wa) copyText(wa.getAttribute("data-wa-copy"));
    var t = e.target.closest("[data-open-size-guide]");
    if (!t) return;
    e.preventDefault();
    ensureSizeGuide();
    $("[data-size-modal]").classList.add("is-open");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") $$(".modal.is-open").forEach(function (m) { m.classList.remove("is-open"); });
  });

  document.addEventListener("DOMContentLoaded", function () {
    if (!$("[data-pdp]")) renderReviews(document);
    renderFAQ();
    renderSizeTable();
    renderShowrooms();
    renderSwatchStrip();
    renderFab();
    renderOffer();
    $$("[data-wa-link]").forEach(function (a) {
      a.href = whatsappLink(a.getAttribute("data-wa-link") || "Hi Shasha Trends!");
      a.target = "_blank";
      a.rel = "noopener";
    });
    $$("[data-offer-code]").forEach(function (el) { el.textContent = CFG.offer.code; });
    $$("[data-offer-label]").forEach(function (el) { el.textContent = CFG.offer.label; });
    $$("[data-free-ship]").forEach(function (el) { el.textContent = STORE.money(CFG.freeShippingThreshold); });
  });
})();
