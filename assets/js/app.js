/* ==========================================================================
   SHASHA — interface
   Talks only to SHASHA_STORE, so it behaves identically whether the catalogue
   and cart come from Shopify or from the bundled demo data.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SHASHA_CONFIG;
  var STORE = window.SHASHA_STORE;
  var money = STORE.money;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---------------------------------------------------------------- toast */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add("is-on"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2800);
  }

  /* ------------------------------------------------------------- wishlist */
  var wish = [];
  try { wish = JSON.parse(localStorage.getItem("shasha.wish")) || []; } catch (e) { wish = []; }

  function saveWish() {
    try { localStorage.setItem("shasha.wish", JSON.stringify(wish)); } catch (e) { /* private mode */ }
    paintWish();
  }

  function toggleWish(handle) {
    if (wish.indexOf(handle) > -1) {
      wish = wish.filter(function (w) { return w !== handle; });
      toast("Removed from wishlist");
    } else {
      wish.push(handle);
      toast("Saved to wishlist");
    }
    saveWish();
  }

  function paintWish() {
    $$("[data-wish]").forEach(function (el) {
      var on = wish.indexOf(el.getAttribute("data-wish")) > -1;
      el.classList.toggle("is-on", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ------------------------------------------------------------ cart view */
  var busy = false;

  function setBusy(on) {
    busy = on;
    var drawer = $("[data-drawer]");
    if (drawer) drawer.classList.toggle("is-busy", on);
  }

  function renderCart(state) {
    $$("[data-cart-count]").forEach(function (el) {
      el.textContent = state.totalQuantity;
      el.classList.toggle("is-on", state.totalQuantity > 0);
    });

    var body = $("[data-cart-body]");
    if (!body) return;

    if (!state.lines.length) {
      body.innerHTML =
        '<div class="cart-empty">' +
          '<p class="t-body">Your bag is empty.</p>' +
          '<p class="t-small" style="margin-top:8px">New pieces arrive often. Take a look at what is in store.</p>' +
          '<a class="btn btn--sm" href="shop.html" style="margin-top:24px">Shop now</a>' +
        "</div>";
    } else {
      body.innerHTML = state.lines.map(function (l) {
        var atMax = l.maxQuantity != null && l.quantity >= l.maxQuantity;
        return (
          '<div class="cart-line">' +
            '<a href="product.html?handle=' + esc(l.handle) + '">' +
              '<img src="' + esc(l.image) + '" alt="' + esc(l.title) + '" loading="lazy">' +
            "</a>" +
            "<div>" +
              '<div class="cart-line__top">' +
                "<div>" +
                  '<a class="cart-line__name" href="product.html?handle=' + esc(l.handle) + '">' + esc(l.title) + "</a>" +
                  '<div class="cart-line__meta">' +
                    (l.colour ? esc(l.colour) + " &middot; " : "") +
                    (l.size ? "Size " + esc(l.size) : "") +
                  "</div>" +
                "</div>" +
                '<div class="t-small">' + money(l.lineAmount, state.currency) + "</div>" +
              "</div>" +
              '<div style="display:flex;align-items:center">' +
                '<div class="qty">' +
                  '<button type="button" data-qty="-1" data-line="' + esc(l.id) + '" aria-label="Decrease quantity">&minus;</button>' +
                  "<span>" + l.quantity + "</span>" +
                  '<button type="button" data-qty="1" data-line="' + esc(l.id) + '"' +
                    (atMax ? " disabled" : "") + ' aria-label="Increase quantity">+</button>' +
                "</div>" +
                '<button type="button" class="cart-line__rm" data-remove="' + esc(l.id) + '">Remove</button>' +
              "</div>" +
              (atMax ? '<p class="cart-line__note">Only ' + l.maxQuantity + " left</p>" : "") +
            "</div>" +
          "</div>"
        );
      }).join("");
    }

    var totalEl = $("[data-cart-total]");
    if (totalEl) totalEl.textContent = money(state.subtotal, state.currency);

    var bar = $("[data-ship-bar]");
    var note = $("[data-ship-note]");
    var threshold = CFG.freeShippingThreshold;
    if (bar && note) {
      bar.style.width = Math.min(100, (state.subtotal / threshold) * 100) + "%";
      note.textContent = state.subtotal === 0
        ? "Free shipping over " + money(threshold, state.currency)
        : state.subtotal >= threshold
          ? "You have earned free shipping."
          : money(threshold - state.subtotal, state.currency) + " away from free shipping.";
    }

    var checkout = $("[data-checkout]");
    if (checkout) checkout.disabled = !state.lines.length;
  }

  function guard(promise, failMsg) {
    setBusy(true);
    return promise
      .catch(function (err) {
        console.error("[SHASHA]", err);
        toast(failMsg || err.message || "Something went wrong");
      })
      .then(function (v) { setBusy(false); return v; });
  }

  function addVariant(variantId, label) {
    return guard(
      STORE.cart.add(variantId, 1).then(function () {
        openDrawer();
        toast((label || "Added") + " added to bag");
      }),
      "Could not add that to your bag"
    );
  }

  /* --------------------------------------------------------------- drawer */
  var overlay, drawer, mnav, searchPanel;

  function closeAll() { closeDrawer(); closeMenu(); closeSearch(); }

  function lock(on) {
    document.body.classList.toggle("is-locked", on);
    overlay.classList.toggle("is-open", on);
  }

  function anyOpen() {
    return [drawer, mnav, searchPanel].some(function (el) {
      return el && el.classList.contains("is-open");
    });
  }

  function openDrawer() { if (drawer) { closeMenu(); closeSearch(); drawer.classList.add("is-open"); lock(true); } }
  function closeDrawer() { if (drawer) { drawer.classList.remove("is-open"); lock(anyOpen()); } }
  function openMenu() { if (mnav) { closeDrawer(); closeSearch(); mnav.classList.add("is-open"); lock(true); } }
  function closeMenu() { if (mnav) { mnav.classList.remove("is-open"); lock(anyOpen()); } }

  function openSearch() {
    if (!searchPanel) return;
    closeDrawer(); closeMenu();
    searchPanel.classList.add("is-open");
    lock(true);
    var input = $("[data-search-input]", searchPanel);
    if (input) setTimeout(function () { input.focus(); }, 80);
  }

  function closeSearch() { if (searchPanel) { searchPanel.classList.remove("is-open"); lock(anyOpen()); } }

  /* ----------------------------------------------------------- card markup */
  function cardHTML(p) {
    var tag = p.tag
      ? '<span class="card__tag' + (p.tagStyle === "ink" ? " card__tag--ink" : "") + '">' + esc(p.tag) + "</span>"
      : "";

    var price = p.compareAt && p.compareAt > p.price
      ? "<s>" + money(p.compareAt, p.currency) + "</s>" + money(p.price, p.currency)
      : money(p.price, p.currency);

    var swatches = p.colours.map(function (c, i) {
      return '<span class="swatch' + (i === 0 ? " is-active" : "") +
        '" style="background:' + esc(c.hex) + '" title="' + esc(c.name) + '"></span>';
    }).join("");

    /* Quick add reveals the size row in place rather than guessing a size. */
    var sizeButtons = p.sizes.map(function (s) {
      var v = STORE.variantExact(p, p.colours[0] ? p.colours[0].name : "", s.label);
      var can = s.available && v && v.available;
      return '<button type="button" class="card__size' + (can ? "" : " is-out") + '"' +
        (can ? ' data-add-variant="' + esc(v.id) + '" data-add-label="' + esc(p.title) + '"' : " disabled") +
        ' aria-label="Add size ' + esc(s.label) + '">' + esc(s.label) + "</button>";
    }).join("");

    var soldOut = !p.available;

    return (
      '<article class="card reveal' + (soldOut ? " is-sold-out" : "") + '"' +
        ' data-cat="' + esc(p.category) + '" data-price="' + p.price + '" data-name="' + esc(p.title) + '">' +
        '<div class="card__media">' +
          (soldOut ? '<span class="card__tag">Sold out</span>' : tag) +
          '<button type="button" class="card__wish" data-wish="' + esc(p.handle) + '"' +
            ' aria-label="Save ' + esc(p.title) + ' to wishlist">' +
            '<svg viewBox="0 0 24 24"><path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 8.5 2.1c0 6.1-8.5 11.6-8.5 11.6Z"/></svg>' +
          "</button>" +
          '<a href="product.html?handle=' + esc(p.handle) + '" aria-label="' + esc(p.title) + '">' +
            '<img src="' + esc(p.images[0] || "") + '" alt="' + esc(p.imageAlts[0] || p.title) + '" loading="lazy">' +
          "</a>" +
          (soldOut
            ? '<a class="card__quick" href="product.html?handle=' + esc(p.handle) + '">View</a>'
            : '<button type="button" class="card__quick" data-quick>Quick add</button>' +
              '<div class="card__sizes">' + sizeButtons +
                '<button type="button" class="card__sizes-close" data-quick-close aria-label="Close sizes">&times;</button>' +
              "</div>") +
        "</div>" +
        '<div class="card__body">' +
          "<div>" +
            '<a class="card__name" href="product.html?handle=' + esc(p.handle) + '">' + esc(p.title) + "</a>" +
            '<div class="card__sub">' + esc(p.subtitle) + "</div>" +
            '<div class="card__swatches">' + swatches + "</div>" +
          "</div>" +
          '<div class="card__price">' + price + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function skeletons(n) {
    var one = '<div class="card skel"><div class="skel__media"></div>' +
      '<div class="skel__line"></div><div class="skel__line skel__line--short"></div></div>';
    return new Array(n + 1).join(one);
  }

  function renderGrid(target, list) {
    target.innerHTML = list.map(cardHTML).join("");
    paintWish();
    observe(target);
  }

  /* -------------------------------------------------------------- reveals */
  var io;
  function observe(scope) {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal", scope).forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    }
    $$(".reveal", scope).forEach(function (el) { io.observe(el); });

    /* Safety net: anything already on screen must never stay hidden, even if
       the observer is slow to deliver its first batch. */
    setTimeout(function () {
      $$(".reveal", scope).forEach(function (el) {
        if (el.classList.contains("is-in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) {
          el.classList.add("is-in");
          io.unobserve(el);
        }
      });
    }, 900);
  }

  /* ------------------------------------------------------ announcement bar */
  function initStrip() {
    var items = $$(".strip__item");
    if (items.length < 2) return;
    var i = 0;
    setInterval(function () {
      items[i].classList.remove("is-active");
      i = (i + 1) % items.length;
      items[i].classList.add("is-active");
    }, 4200);
  }

  /* ------------------------------------------------------------- home page */
  function initHome() {
    var grid = $("[data-home-grid]");
    if (!grid) return;
    grid.innerHTML = skeletons(4);
    STORE.products().then(function (list) {
      renderGrid(grid, list.slice(0, 4));
    });
  }

  /* ------------------------------------------------------------- shop page */
  function initShop() {
    var grid = $("[data-shop-grid]");
    if (!grid) return;

    grid.innerHTML = skeletons(8);

    var params = new URLSearchParams(location.search);
    var state = {
      cat: params.get("category") || "all",
      sort: params.get("sort") || "featured"
    };

    function syncControls() {
      $$("[data-filter]").forEach(function (b) {
        b.classList.toggle("is-on", b.getAttribute("data-filter") === state.cat);
      });
      var sel = $("[data-sort]");
      if (sel) sel.value = state.sort;
    }

    function syncUrl() {
      var q = new URLSearchParams();
      if (state.cat !== "all") q.set("category", state.cat);
      if (state.sort !== "featured") q.set("sort", state.sort);
      var qs = q.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    }

    function apply(all) {
      var list = all.filter(function (p) {
        return state.cat === "all" || p.category === state.cat;
      });

      if (state.sort === "low") list = list.slice().sort(function (a, b) { return a.price - b.price; });
      if (state.sort === "high") list = list.slice().sort(function (a, b) { return b.price - a.price; });
      if (state.sort === "name") list = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });

      renderGrid(grid, list);

      if (list.length) {
        observe(grid);
      } else {
        grid.innerHTML =
          '<div class="cart-empty" style="grid-column:1/-1">' +
          '<p class="t-body">Nothing in this category yet.</p></div>';
      }

      var counter = $("[data-count]");
      if (counter) counter.textContent = list.length + (list.length === 1 ? " piece" : " pieces");
      syncUrl();
    }

    STORE.products().then(function (all) {
      var chips = $(".filters__chips");
      if (chips) {
        STORE.categories().forEach(function (c) {
          /* Some category chips (e.g. Dresses, Ethnic Wear) are already in
             the page's HTML ahead of any matching products existing in
             Shopify — skip those so assigning that Type later doesn't
             duplicate the chip. */
          if (chips.querySelector('[data-filter="' + c.slug + '"]')) return;
          var btn = document.createElement("button");
          btn.className = "chip";
          btn.setAttribute("data-filter", c.slug);
          btn.textContent = c.label;
          chips.appendChild(btn);
        });
      }

      syncControls();
      apply(all);

      $$("[data-filter]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.cat = btn.getAttribute("data-filter");
          syncControls();
          apply(all);
        });
      });

      var sortEl = $("[data-sort]");
      if (sortEl) {
        sortEl.addEventListener("change", function () {
          state.sort = sortEl.value;
          apply(all);
        });
      }
    });
  }

  /* ---------------------------------------------------------- product page */
  function initPDP() {
    var root = $("[data-pdp]");
    if (!root) return;

    var params = new URLSearchParams(location.search);
    var handle = params.get("handle") || params.get("id");

    root.innerHTML = '<div class="pdp__gallery"><div class="skel__media"></div></div>' +
      '<div class="pdp__info"><div class="skel__line"></div><div class="skel__line skel__line--short"></div></div>';

    STORE.products()
      .then(function () { return handle ? STORE.product(handle) : null; })
      .then(function (p) {
        if (!p) return renderMissing(root);
        renderPDP(root, p);
      })
      .catch(function (err) {
        console.error("[SHASHA]", err);
        renderMissing(root);
      });
  }

  function renderMissing(root) {
    root.innerHTML =
      '<div style="grid-column:1/-1;padding-block:80px;text-align:center">' +
        '<p class="t-eyebrow">404</p>' +
        '<h1 class="t-h1" style="margin:12px 0 16px">We cannot find that piece</h1>' +
        '<p class="muted" style="max-width:44ch;margin:0 auto 28px">It may have sold out and been retired — our runs are small and we do not restock everything.</p>' +
        '<a class="btn" href="shop.html">Shop now</a>' +
      "</div>";
  }

  function renderPDP(root, p) {
    document.title = p.title + " — Shasha Trends";

    var X = window.SHASHA_EXTRAS;
    var firstAvailable = p.sizes.filter(function (s) { return s.available; })[0] || p.sizes[0];
    var chosen = {
      colour: p.colours[0] ? p.colours[0].name : "",
      size: firstAvailable ? firstAvailable.label : ""
    };

    function accItem(title, html, open, key) {
      return (
        '<div class="acc__item' + (open ? " is-open" : "") + '"' + (key ? ' data-acc="' + key + '"' : "") + ">" +
          '<button type="button" class="acc__btn">' + title + " <i></i></button>" +
          '<div class="acc__panel"><div>' + html + "</div></div>" +
        "</div>"
      );
    }

    var details = p.details && p.details.length
      ? "<ul>" + p.details.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>"
      : "<p>" + esc(p.desc) + "</p>";

    /* Sibling colourways: other products in the same group. */
    var siblings = STORE.cached().filter(function (x) {
      return p.group && x.group === p.group && x.handle !== p.handle;
    });

    var save = p.compareAt && p.compareAt > p.price
      ? Math.round((1 - p.price / p.compareAt) * 100) : 0;

    var rating = X && X.ratingSummary();

    root.innerHTML =
      '<div class="pdp__gallery">' +
        '<div class="pdp__thumbs">' +
          p.images.map(function (src, i) {
            return '<button type="button" class="' + (i === 0 ? "is-on" : "") + '" data-thumb="' + i + '">' +
              '<img src="' + esc(src) + '" alt="' + esc(p.title) + " view " + (i + 1) + '" loading="lazy"></button>';
          }).join("") +
        "</div>" +
        '<div class="pdp__main">' +
          '<img data-main src="' + esc(p.images[0] || "") + '" alt="' + esc(p.imageAlts[0] || p.title) + '">' +
          '<div class="pdp__dots" data-dots>' + p.images.map(function (_, i) {
            return "<i" + (i === 0 ? ' class="is-on"' : "") + "></i>";
          }).join("") + "</div>" +
        "</div>" +
      "</div>" +

      '<div class="pdp__info">' +
        '<p class="crumbs"><a href="index.html">Home</a> / <a href="shop.html">Shop</a> / ' + esc(p.title) + "</p>" +
        '<h1 class="t-h2">' + esc(p.title) + "</h1>" +
        (rating
          ? '<a class="pdp__rating" href="#reviews" aria-label="' + rating.avg + ' out of 5 stars">' +
              '<span class="stars">' + X.stars(rating.avg) + "</span> " + rating.avg + " · " + rating.count + " reviews" +
              (CFG.sampleContent ? ' <em class="sample-pill">Sample</em>' : "") + "</a>"
          : "") +
        '<p class="pdp__price" data-price-slot></p>' +
        (CFG.offer
          ? '<p class="pdp__offer"><b>' + esc(CFG.offer.code) + "</b> &mdash; " + esc(CFG.offer.label) + ", applied at checkout</p>"
          : "") +
        '<p class="pdp__desc">' + esc(p.desc) + "</p>" +

        '<div class="opt">' +
          '<div class="opt__label"><span>Colour — <b data-colour-name style="font-weight:500">' + esc(chosen.colour) + "</b></span></div>" +
          '<div class="colors">' +
            '<span class="color-dot is-on" style="background:' + esc(p.colours[0].hex) + '" aria-label="' + esc(chosen.colour) + '"></span>' +
            siblings.map(function (s) {
              return '<a class="color-dot" href="product.html?handle=' + esc(s.handle) + '" style="background:' + esc(s.colours[0].hex) +
                '" title="' + esc(s.colour) + '" aria-label="' + esc(s.colour) + '"></a>';
            }).join("") +
          "</div>" +
        "</div>" +

        '<div class="opt">' +
          '<div class="opt__label"><span>Size</span><a href="#size-guide" data-open-size-guide>Size guide</a></div>' +
          '<div class="sizes" data-sizes></div>' +
        "</div>" +

        '<div class="pdp__actions">' +
          '<button type="button" class="btn btn--solid" data-pdp-add>Add to bag</button>' +
          '<button type="button" class="icon-square" data-wish="' + esc(p.handle) + '" aria-label="Save to wishlist">' +
            '<svg viewBox="0 0 24 24"><path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 8.5 2.1c0 6.1-8.5 11.6-8.5 11.6Z"/></svg>' +
          "</button>" +
        "</div>" +
        '<a class="btn btn--wa btn--full" data-pdp-wa target="_blank" rel="noopener">' +
          '<svg viewBox="0 0 24 24"><path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.7l4.5-1.2A8.7 8.7 0 1 0 12 3.2Z"/><path d="M9.2 8.6c.2-.4.5-.4.8-.4.2 0 .4.2.5.4l.6 1.4c0 .2 0 .4-.2.6l-.5.6c.7 1.3 1.6 2.1 3 2.7l.6-.7c.2-.2.4-.3.6-.2l1.4.7c.3.1.4.3.3.7-.2.9-1.1 1.5-2 1.4-3-.5-5.2-2.8-5.6-5.4 0-.4.1-.9.4-1.5Z"/></svg>' +
          "Order on WhatsApp</a>" +
        '<p class="pdp__stock" data-stock></p>' +
        '<p class="pdp__eta"><svg viewBox="0 0 24 24"><path d="M3 7h13v10H3zM16 10h3.5L21 13v4h-5"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>' +
          "Ships in " + esc(CFG.dispatchDays) + " &middot; " + esc(CFG.deliveryDays) + "</p>" +

        '<div class="usp">' +
          '<div><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/></svg><span>Free size exchange</span></div>' +
          '<div><svg viewBox="0 0 24 24"><path d="M3 7h13v10H3zM16 10h3.5L21 13v4h-5"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg><span>Free shipping over ' + money(CFG.freeShippingThreshold, p.currency) + "</span></div>" +
          '<div><svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z"/><path d="M9.2 12.2l2 2 3.6-4"/></svg><span>Secure ordering</span></div>' +
        "</div>" +

        '<div class="acc">' +
          accItem("The piece", details, true) +
          accItem("Fabric &amp; care", "<p>" + esc(p.fabric || "") + ".</p><p>" + esc(p.care || "") + "</p>") +
          accItem("Shipping &amp; exchange",
            "<p>Dispatched in " + esc(CFG.dispatchDays) + ". Delivery in " + esc(CFG.deliveryDays) + ". " +
            "Shipping is free on orders over " + money(CFG.freeShippingThreshold, p.currency) +
            ", otherwise " + money(CFG.shippingFlat, p.currency) + ".</p>" +
            "<p>Not the right fit? Exchange your size once, free, within 7 days of delivery on unworn pieces with tags intact.</p>") +
        "</div>" +
      "</div>" +

      /* sticky bar (mobile) */
      '<div class="stickybar" data-sticky aria-hidden="true">' +
        '<div><b>' + esc(p.title) + '</b><span data-sticky-price></span></div>' +
        '<button type="button" class="btn btn--solid" data-sticky-add>Add to bag</button>' +
      "</div>";

    /* ---- variant-aware state ------------------------------------------- */
    function currentVariant() {
      return STORE.variantExact(p, chosen.colour, chosen.size);
    }

    function paintVariant() {
      var v = currentVariant();

      $("[data-sizes]", root).innerHTML = p.sizes.map(function (s) {
        var sv = STORE.variantExact(p, chosen.colour, s.label);
        var can = Boolean(sv && sv.available);
        return '<button type="button" class="size' + (can ? "" : " is-out") +
          (s.label === chosen.size ? " is-on" : "") + '" data-size="' + esc(s.label) + '"' +
          (can ? "" : " disabled") + ">" + esc(s.label) + "</button>";
      }).join("");

      $$("[data-size]", root).forEach(function (btn) {
        btn.addEventListener("click", function () {
          chosen.size = btn.getAttribute("data-size");
          paintVariant();
        });
      });

      var price = v ? v.price : p.price;
      var compare = v ? v.compareAt : p.compareAt;
      var priceHTML =
        (compare && compare > price ? "<s>" + money(compare, p.currency) + "</s>" : "") +
        money(price, p.currency);
      $("[data-price-slot]", root).innerHTML = priceHTML +
        (save ? '<span class="save-pill">Save ' + save + "%</span>" : "") +
        '<span class="t-small muted" style="margin-left:8px">incl. taxes</span>';
      $("[data-sticky-price]", root).innerHTML = priceHTML;

      var add = $("[data-pdp-add]", root);
      var sAdd = $("[data-sticky-add]", root);
      var stock = $("[data-stock]", root);
      var wa = $("[data-pdp-wa]", root);
      var sellable = v && v.available;

      add.disabled = !sellable;
      add.textContent = sellable ? "Add to bag" : "Sold out";
      sAdd.disabled = !sellable;
      sAdd.textContent = sellable ? "Add to bag" : "Sold out";

      if (X) {
        var msg = "Hi Shasha Trends! I'd like to order:\n" +
          "• " + p.title + "\n• Colour: " + chosen.colour + "\n• Size: " + chosen.size +
          "\n• Price: " + money(price, p.currency) + "\n" + location.href.split("#")[0];
        wa.href = X.whatsappLink(msg);
        wa.setAttribute("data-wa-copy", msg);
      }

      if (sellable && v.quantityAvailable != null && v.quantityAvailable <= 5) {
        stock.textContent = "Only " + v.quantityAvailable + " left in this colour";
        stock.hidden = false;
      } else if (!sellable) {
        stock.innerHTML = 'This size is sold out. <a href="' + esc(X ? X.whatsappLink("Hi! Is " + p.title + " in size " + chosen.size + " coming back?") : "#") +
          '" target="_blank" rel="noopener">Ask us on WhatsApp</a> about the next batch.';
        stock.hidden = false;
      } else {
        stock.hidden = true;
      }
    }

    paintVariant();

    /* ---- gallery (thumbs + swipe) --------------------------------------- */
    var main = $("[data-main]", root);
    var dots = $$("[data-dots] i", root);
    var at = 0;
    main.style.transition = "opacity 240ms ease";

    function show(i) {
      at = (i + p.images.length) % p.images.length;
      $$("[data-thumb]", root).forEach(function (b, n) { b.classList.toggle("is-on", n === at); });
      dots.forEach(function (d, n) { d.classList.toggle("is-on", n === at); });
      main.style.opacity = "0";
      setTimeout(function () { main.src = p.images[at]; main.style.opacity = "1"; }, 140);
    }

    $$("[data-thumb]", root).forEach(function (btn) {
      btn.addEventListener("click", function () { show(+btn.getAttribute("data-thumb")); });
    });

    var x0 = null;
    main.parentNode.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    main.parentNode.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1));
    }, { passive: true });

    /* ---- add ------------------------------------------------------------ */
    function addCurrent() {
      var v = currentVariant();
      if (v && v.available) addVariant(v.id, p.title);
    }
    $("[data-pdp-add]", root).addEventListener("click", addCurrent);
    $("[data-sticky-add]", root).addEventListener("click", addCurrent);

    /* ---- sticky bar: only once the main Add button has scrolled away ----- */
    var bar = $("[data-sticky]", root);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var gone = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
        bar.classList.toggle("is-on", gone);
      }).observe($("[data-pdp-add]", root));
    }

    /* ---- accordions ----------------------------------------------------- */
    $$(".acc__btn", root).forEach(function (btn) {
      btn.addEventListener("click", function () { btn.parentElement.classList.toggle("is-open"); });
    });

    /* ---- related -------------------------------------------------------- */
    var rel = $("[data-related]");
    if (rel) {
      renderGrid(rel, STORE.cached().filter(function (x) { return x.handle !== p.handle; }).slice(0, 4));
    }

    if (X) X.afterPDP(p);
    paintWish();
  }

  /* --------------------------------------------------------------- search */
  function initSearch() {
    if (!searchPanel) return;
    var input = $("[data-search-input]", searchPanel);
    var results = $("[data-search-results]", searchPanel);
    if (!input || !results) return;

    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var term = input.value.trim();
        if (!term) {
          results.innerHTML = '<p class="muted t-small">Try “kurti”, “skirt” or a colour — “teal”, “lilac”.</p>';
          return;
        }
        var hits = STORE.search(term);
        results.innerHTML = hits.length
          ? '<div class="search__grid">' + hits.slice(0, 6).map(function (p) {
              return '<a class="search__hit" href="product.html?handle=' + esc(p.handle) + '">' +
                '<img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" loading="lazy">' +
                "<div><b>" + esc(p.title) + "</b><span>" + esc(p.subtitle) + "</span>" +
                "<span>" + money(p.price, p.currency) + "</span></div></a>";
            }).join("") + "</div>"
          : '<p class="muted t-small">Nothing matches “' + esc(term) + '”.</p>';
      }, 140);
    });
  }

  /* ------------------------------------------------------- global wiring */
  function initGlobal() {
    overlay = $("[data-overlay]");
    drawer = $("[data-drawer]");
    mnav = $("[data-mnav]");
    searchPanel = $("[data-search]");

    /* Account only exists once a Shopify shop is attached. */
    var account = $("[data-account]");
    if (account) {
      if (CFG.accountUrl) account.setAttribute("href", CFG.accountUrl);
      else account.remove();
    }

    document.addEventListener("click", function (e) {
      var t = e.target;

      var quick = t.closest("[data-quick]");
      if (quick) {
        quick.closest(".card").classList.add("is-picking");
        return;
      }

      if (t.closest("[data-quick-close]")) {
        t.closest(".card").classList.remove("is-picking");
        return;
      }

      var addBtn = t.closest("[data-add-variant]");
      if (addBtn) {
        var card = addBtn.closest(".card");
        if (card) card.classList.remove("is-picking");
        addVariant(addBtn.getAttribute("data-add-variant"), addBtn.getAttribute("data-add-label"));
        return;
      }

      var w = t.closest("[data-wish]");
      if (w) { toggleWish(w.getAttribute("data-wish")); return; }

      var q = t.closest("[data-qty]");
      if (q && !busy) {
        var line = STORE.cart.state().lines.filter(function (l) {
          return l.id === q.getAttribute("data-line");
        })[0];
        if (line) {
          guard(STORE.cart.update(line.id, line.quantity + Number(q.getAttribute("data-qty"))),
            "Could not update your bag");
        }
        return;
      }

      var rm = t.closest("[data-remove]");
      if (rm && !busy) {
        guard(STORE.cart.remove(rm.getAttribute("data-remove")).then(function () { toast("Removed"); }),
          "Could not remove that item");
        return;
      }

      if (t.closest("[data-open-cart]")) { openDrawer(); return; }
      if (t.closest("[data-close-cart]")) { closeDrawer(); return; }
      if (t.closest("[data-open-menu]")) { openMenu(); return; }
      if (t.closest("[data-close-menu]")) { closeMenu(); return; }
      if (t.closest("[data-open-search]")) { openSearch(); return; }
      if (t.closest("[data-close-search]")) { closeSearch(); return; }

      if (t === overlay) { closeAll(); return; }

      if (t.closest("[data-checkout]")) {
        var url = STORE.cart.state().checkoutUrl;
        window.location.href = url || "checkout.html";
        return;
      }

      /* A click anywhere else closes an open quick-add size row. */
      if (!t.closest(".card__sizes")) {
        $$(".card.is-picking").forEach(function (c) { c.classList.remove("is-picking"); });
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
      if (e.key === "/" && !/input|textarea|select/i.test(e.target.tagName)) {
        e.preventDefault();
        openSearch();
      }
    });

    $$("[data-news]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = $("input", form);
        if (!input || !input.value || !input.checkValidity()) {
          toast("Enter a valid email address");
          return;
        }
        var btn = $("button", form);
        if (btn) btn.disabled = true;
        STORE.subscribe(input.value)
          .then(function () { toast("Welcome to Shasha Trends"); form.reset(); })
          .catch(function () { toast("Could not sign you up just now"); })
          .then(function () { if (btn) btn.disabled = false; });
      });
    });

    /* No backend to receive this, so submitting opens WhatsApp with the
       enquiry pre-filled rather than pretending to send something. */
    $$("[data-contact]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var note = $("[data-contact-note]", form);
        if (!form.checkValidity()) {
          if (note) {
            note.textContent = "Please fill in your name and phone number.";
            note.style.display = "block";
          }
          return;
        }
        var msg = "Hi Shasha Trends! I'm " + $("#contactName", form).value +
          " (" + $("#contactPhone", form).value + ").\n" + $("#contactMessage", form).value;
        window.open(window.SHASHA_EXTRAS.whatsappLink(msg), "_blank", "noopener");
        if (note) {
          note.textContent = "Opening WhatsApp so you can send this to us…";
          note.style.display = "block";
        }
      });
    });

    STORE.cart.onChange(renderCart);
    STORE.cart.load();

    initStrip();
    initSearch();
    observe(document);

    if (STORE.mode === "local") {
      console.info("[SHASHA] Running on the local catalogue. Add your shop domain and Storefront token to assets/js/config.js to go live.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGlobal();
    initHome();
    initShop();
    initPDP();
    paintWish();
  });
})();
