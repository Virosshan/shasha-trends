/* ==========================================================================
   SHASHA & CO. — shared page chrome
   Announcement strip, header, footer, search, menu and bag drawer are written
   once here and injected on every page, so a nav or footer change is a
   one-file edit. Pages carry <div data-chrome="top|bottom|plain"></div>.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SHASHA_CONFIG;
  var money = function (n) {
    try {
      return new Intl.NumberFormat(CFG.locale, { style: "currency", currency: CFG.currency, maximumFractionDigits: 0 }).format(n).replace(/\s/g, "");
    } catch (e) { return "RM" + n; }
  };
  var free = money(CFG.freeShippingThreshold);
  var wa = CFG.whatsappNumber ? "https://wa.me/" + CFG.whatsappNumber : CFG.whatsappMessageLink;

  var BRAND =
    '<a class="brand" href="index.html" aria-label="Shasha Trends home">Shasha<small>Trends</small></a>';

  var ICON = {
    arrow: '<svg viewBox="0 0 24 24"><path d="M4 12h15m-5.5-5.5L19.5 12l-6 5.5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 7h14l-1.1 13H6.1z"/><path d="M9 7V5.6A3 3 0 0 1 15 5.6V7"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    burger: '<svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c0-4 3.4-6.2 7.5-6.2S19.5 16 19.5 20"/></svg>'
  };

  var TOP =
    '<div class="strip"><div class="strip__track">' +
      '<p class="strip__item is-active">' + CFG.offer.label + " · code <b>" + CFG.offer.code + "</b></p>" +
      '<p class="strip__item">Free shipping across Malaysia over ' + free + "</p>" +
      '<p class="strip__item">Modern &amp; traditional · Showrooms in KL &amp; Rawang</p>' +
    "</div></div>" +

    '<header class="header"><div class="wrap header__inner">' +
      '<nav class="nav" aria-label="Primary">' +
        '<a href="index.html">Home</a><a href="shop.html">Shop</a>' +
        '<a href="index.html#showrooms">Showrooms</a><a href="size-guide.html">Size guide</a><a href="contact.html">Contact</a>' +
      "</nav>" +
      '<button class="icon-btn burger" data-open-menu aria-label="Open menu">' + ICON.burger + "</button>" +
      BRAND +
      '<div class="header__tools">' +
        '<button class="icon-btn" data-open-search aria-label="Search">' + ICON.search + "</button>" +
        '<a class="icon-btn" href="#" data-account aria-label="Account">' + ICON.user + "</a>" +
        '<button class="icon-btn" data-open-cart aria-label="Open bag">' + ICON.bag +
          '<span class="badge" data-cart-count>0</span></button>' +
      "</div>" +
    "</div></header>";

  var PLAIN =
    '<header class="header"><div class="wrap header__inner header__inner--plain">' +
      '<a class="link-u" href="shop.html">&larr; Keep shopping</a>' + BRAND +
      '<span class="t-micro muted" style="text-align:right">Secure ordering</span>' +
    "</div></header>";

  var BOTTOM =
    '<footer class="footer"><div class="wrap">' +
      '<div class="footer__grid">' +
        "<div><h4>Shasha Trends</h4>" +
          '<p class="t-body muted" style="max-width:34ch">Modern and traditional Indian wear.<br>Visit us in KL and Rawang.</p>' +
          '<div style="margin-top:20px;display:flex;gap:16px">' +
            '<a class="t-micro" href="' + CFG.instagram + '" target="_blank" rel="noopener">Instagram</a>' +
            '<a class="t-micro" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' +
          "</div></div>" +
        '<div><h4>Shop</h4><ul><li><a href="shop.html">All pieces</a></li><li><a href="shop.html?category=kurtis">Kurtis</a></li><li><a href="shop.html?category=skirts">Skirts</a></li><li><a href="index.html#showrooms">Showrooms</a></li>' +
          '' +
          '<li><a href="size-guide.html">Size guide</a></li></ul></div>' +
        '<div><h4>Help</h4><ul>' +
          '<li><a href="contact.html">Contact</a></li>' +
          '<li><a href="index.html#faq">FAQ</a></li>' +
          '<li><a href="' + wa + '" target="_blank" rel="noopener">Order on WhatsApp</a></li></ul></div>' +
      "</div>" +
      '<div class="footer__mark" aria-hidden="true">Shasha</div>' +
      '<div class="footer__base"><span>© 2026 Shasha Trends</span></div>' +
    "</div></footer>" +

    '<div class="overlay" data-overlay></div>' +

    '<div class="search" data-search role="dialog" aria-label="Search"><div class="wrap search__inner">' +
      '<form class="search__bar" onsubmit="return false">' +
        '<span class="search__icon">' + ICON.search + "</span>" +
        '<input type="search" data-search-input placeholder="Search by colour or style" aria-label="Search products" autocomplete="off">' +
        '<button type="button" class="icon-btn" data-close-search aria-label="Close search">' + ICON.close + "</button>" +
      "</form>" +
      '<div class="search__results" data-search-results><p class="muted t-small">Try a colour — “olive”, “royal blue”, “rosewood”.</p></div>' +
    "</div></div>" +

    '<nav class="mnav" data-mnav aria-label="Mobile">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><span class="t-micro">Menu</span>' +
        '<button class="icon-btn" data-close-menu aria-label="Close menu">' + ICON.close + "</button></div>" +
      '<div><a href="index.html">Home</a><a href="shop.html">Shop</a><a href="index.html#showrooms">Showrooms</a><a href="size-guide.html">Size guide</a><a href="contact.html">Contact</a></div>' +
    "</nav>" +

    '<aside class="drawer" data-drawer aria-label="Shopping bag">' +
      '<div class="drawer__head"><span class="drawer__title">Your bag</span>' +
        '<button class="icon-btn" data-close-cart aria-label="Close bag">' + ICON.close + "</button></div>" +
      '<div class="drawer__body" data-cart-body></div>' +
      '<div class="drawer__foot">' +
        '<div class="ship-bar"><i data-ship-bar></i></div>' +
        '<p class="cart-note" data-ship-note>Free shipping over ' + free + "</p>" +
        '<div class="cart-total"><span>Subtotal</span><b data-cart-total>' + money(0) + "</b></div>" +
        '<p class="cart-note">' + CFG.offer.code + " (" + CFG.offer.percent + "% off) is applied at checkout.</p>" +
        '<button class="btn btn--solid btn--full" data-checkout disabled>Checkout</button>' +
      "</div>" +
    "</aside>";

  var parts = { top: TOP, bottom: BOTTOM, plain: PLAIN };
  Array.prototype.slice.call(document.querySelectorAll("[data-chrome]")).forEach(function (el) {
    el.outerHTML = parts[el.getAttribute("data-chrome")] || "";
  });

  /* Highlight the current page in the nav. */
  var here = location.pathname.split("/").pop() || "index.html";
  Array.prototype.slice.call(document.querySelectorAll(".nav a")).forEach(function (a) {
    if (a.getAttribute("href") === here) a.setAttribute("aria-current", "page");
  });
})();
