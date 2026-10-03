/* ==========================================================================
   SHASHA — store
   One API over two catalogues. When Shopify is configured every read goes
   to its Storefront API; otherwise the same calls are served from the local
   catalogue in data.js. The UI in app.js never knows which it is talking to.

   The cart follows the same split: a real Shopify cart (with its own
   checkoutUrl) when Shopify is configured, localStorage otherwise. Either
   way app.js sees one shape and one API.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SHASHA_CONFIG;
  var API = window.SHASHA_SHOPIFY;
  var LOCAL = window.SHASHA_PRODUCTS || [];

  var MODE = API.configured() ? "shopify" : "local";
  var CART_KEY = "shasha.cart";
  var CART_ID_KEY = "shasha.cartId";

  /* --------------------------------------------------------------- storage */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function drop(key) {
    try { localStorage.removeItem(key); } catch (e) { /* private mode */ }
  }

  /* ----------------------------------------------------------------- money */
  var formatters = {};
  function money(amount, currency) {
    var code = currency || CFG.currency;
    var whole = Math.abs(amount % 1) < 0.005;
    var digits = whole ? 0 : 2;
    var key = code + ":" + digits;
    try {
      if (!formatters[key]) {
        formatters[key] = new Intl.NumberFormat(CFG.locale, {
          style: "currency",
          currency: code,
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        });
      }
      return formatters[key].format(amount).replace(/([^\d\s])[\s ]+(?=\d)/, "$1");
    } catch (e) {
      return code + " " + (whole ? Math.round(amount) : amount.toFixed(2));
    }
  }

  /* ------------------------------------------------------ local normalising */
  function localVariantId(handle, colour, size) {
    return "local:" + handle + ":" + colour + ":" + size;
  }

  function normaliseLocal(p) {
    var variants = [];
    p.colours.forEach(function (c) {
      p.sizes.forEach(function (s) {
        variants.push({
          id: localVariantId(p.id, c.name, s.label),
          colour: c.name,
          size: s.label,
          price: p.price,
          compareAt: p.was || null,
          available: Boolean(s.stock),
          quantityAvailable: s.stock ? (p.lowStock || 12) : 0,
          image: null
        });
      });
    });

    return {
      id: p.id,
      handle: p.id,
      title: p.name,
      subtitle: p.sub,
      price: p.price,
      compareAt: p.was || null,
      currency: CFG.currency,
      category: p.category,
      group: p.group || null,
      lowStock: p.lowStock || null,
      fabric: p.fabric,
      craft: p.craft,
      tag: p.tag,
      tagStyle: p.tagStyle,
      colour: p.colour,
      colours: p.colours,
      sizes: p.sizes.map(function (s) { return { label: s.label, available: Boolean(s.stock) }; }),
      variants: variants,
      images: p.images,
      imageAlts: p.images.map(function () { return p.name; }),
      desc: p.desc,
      details: p.details,
      care: p.care,
      available: p.sizes.some(function (s) { return s.stock; }),
      source: "local"
    };
  }

  /* ------------------------------------------------------------- catalogue */
  var catalogue = null;
  var cataloguePromise = null;

  function products() {
    if (cataloguePromise) return cataloguePromise;

    if (MODE === "shopify") {
      cataloguePromise = API.fetchProducts()
        .then(function (list) { catalogue = list; return list; })
        .catch(function (err) {
          console.error("[SHASHA] Shopify catalogue failed, using local data:", err.message);
          catalogue = LOCAL.map(normaliseLocal);
          return catalogue;
        });
    } else {
      catalogue = LOCAL.map(normaliseLocal);
      cataloguePromise = Promise.resolve(catalogue);
    }

    return cataloguePromise;
  }

  function product(handle) {
    if (MODE === "shopify") {
      return API.fetchProduct(handle).catch(function (err) {
        console.error("[SHASHA] Shopify product failed, using local data:", err.message);
        return null;
      }).then(function (found) {
        if (found) return found;
        return products().then(function (list) {
          return list.filter(function (p) { return p.handle === handle; })[0] || null;
        });
      });
    }

    return products().then(function (list) {
      return list.filter(function (p) { return p.handle === handle; })[0] || null;
    });
  }

  function cached() { return catalogue || []; }

  /* Every distinct category present in the current catalogue, as
     {slug, label} pairs, alphabetical by label. Drives the shop page's
     filter chips — a category only appears here (and so only gets a chip)
     once at least one product uses it. */
  function categories() {
    var seen = {};
    cached().forEach(function (p) {
      if (p.category) seen[p.category] = true;
    });
    return Object.keys(seen).map(function (slug) {
      var label = slug.split("-").map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join(" ");
      return { slug: slug, label: label };
    }).sort(function (a, b) { return a.label.localeCompare(b.label); });
  }

  function variantExact(p, colour, size) {
    return p.variants.filter(function (v) {
      return (!colour || v.colour === colour) && (!size || v.size === size);
    })[0] || null;
  }

  function variantFor(p, colour, size) {
    return variantExact(p, colour, size) ||
      p.variants.filter(function (v) { return v.available; })[0] ||
      p.variants[0] || null;
  }

  /* ------------------------------------------------------------------ cart */
  var state = { id: null, lines: [], subtotal: 0, total: 0, totalQuantity: 0, currency: CFG.currency, checkoutUrl: null };
  var listeners = [];

  function emit() {
    listeners.forEach(function (fn) { fn(state); });
  }

  function onChange(fn) {
    listeners.push(fn);
    fn(state);
  }

  /* -- local cart -------------------------------------------------------- */
  function localLines() { return read(CART_KEY, []); }

  function buildLocalState() {
    return products().then(function (list) {
      var byVariant = {};
      list.forEach(function (p) {
        p.variants.forEach(function (v) { byVariant[v.id] = { product: p, variant: v }; });
      });

      var lines = [];
      localLines().forEach(function (l) {
        var hit = byVariant[l.variantId];
        if (!hit) return;
        lines.push({
          id: l.variantId,
          variantId: l.variantId,
          handle: hit.product.handle,
          title: hit.product.title,
          colour: hit.variant.colour,
          size: hit.variant.size,
          image: hit.product.images[0],
          quantity: l.quantity,
          maxQuantity: hit.variant.quantityAvailable,
          unitAmount: hit.variant.price,
          lineAmount: hit.variant.price * l.quantity
        });
      });

      var localSubtotal = lines.reduce(function (s, l) { return s + l.lineAmount; }, 0);
      state = {
        id: null,
        lines: lines,
        subtotal: localSubtotal,
        /* Local mode has no shipping step, so the total is just the goods. */
        total: localSubtotal,
        totalQuantity: lines.reduce(function (n, l) { return n + l.quantity; }, 0),
        currency: CFG.currency,
        checkoutUrl: null
      };
      emit();
      return state;
    });
  }

  function localAdd(variantId, quantity) {
    var lines = localLines();
    var hit = lines.filter(function (l) { return l.variantId === variantId; })[0];
    if (hit) hit.quantity += quantity;
    else lines.push({ variantId: variantId, quantity: quantity });
    write(CART_KEY, lines);
    return buildLocalState();
  }

  function localUpdate(variantId, quantity) {
    var lines = localLines()
      .map(function (l) { return l.variantId === variantId ? { variantId: l.variantId, quantity: quantity } : l; })
      .filter(function (l) { return l.quantity > 0; });
    write(CART_KEY, lines);
    return buildLocalState();
  }

  function localRemove(variantId) {
    write(CART_KEY, localLines().filter(function (l) { return l.variantId !== variantId; }));
    return buildLocalState();
  }

  /* -- shopify cart --------------------------------------------------------
     Shopify's Storefront API does not report per-line stock on a cart line,
     so the quantity cap is composed here from the catalogue, which does. */
  function capQuantities(cart) {
    if (!cart || !cart.lines.length) return cart;

    var byVariant = {};
    cached().forEach(function (p) {
      p.variants.forEach(function (v) { byVariant[v.id] = v; });
    });

    cart.lines.forEach(function (l) {
      var v = byVariant[l.variantId];
      if (v) l.maxQuantity = v.quantityAvailable;
    });

    return cart;
  }

  function adopt(cart) {
    if (!cart) {
      drop(CART_ID_KEY);
      state = {
        id: null, lines: [], subtotal: 0, total: 0, totalQuantity: 0,
        currency: CFG.currency, checkoutUrl: null
      };
    } else {
      write(CART_ID_KEY, cart.id);
      state = capQuantities(cart);
    }
    emit();
    return state;
  }

  function withCatalogue(promise) {
    return products().then(function () { return promise; });
  }

  function ensureCart() {
    var id = read(CART_ID_KEY, null);
    if (!id) return API.cartCreate().then(adopt);

    /* A cart id can outlive its cart (completed order, or an id from a
       previous store) — a null response means: start a fresh one. */
    return API.cartGet(id).then(function (cart) {
      if (cart) return adopt(cart);
      drop(CART_ID_KEY);
      return API.cartCreate().then(adopt);
    });
  }

  function shopifyAdd(variantId, quantity) {
    return withCatalogue(
      ensureCart().then(function (s) {
        return API.cartLinesAdd(s.id, variantId, quantity).then(adopt);
      })
    );
  }

  function shopifyUpdate(lineId, quantity) {
    if (quantity < 1) return shopifyRemove(lineId);
    return API.cartLinesUpdate(state.id, lineId, quantity).then(adopt);
  }

  function shopifyRemove(lineId) {
    return API.cartLinesRemove(state.id, lineId).then(adopt);
  }

  /* -- public cart api --------------------------------------------------- */
  var cart = {
    load: function () {
      if (MODE === "shopify") {
        return read(CART_ID_KEY, null)
          ? withCatalogue(
              ensureCart().catch(function (err) {
                console.error("[SHASHA] Could not restore your bag:", err.message);
                drop(CART_ID_KEY);
                return adopt(null);
              })
            )
          : Promise.resolve(adopt(null));
      }
      return buildLocalState();
    },
    add: function (variantId, quantity) {
      quantity = quantity || 1;
      return MODE === "shopify"
        ? shopifyAdd(variantId, quantity)
        : localAdd(variantId, quantity);
    },
    update: function (lineId, quantity) {
      return MODE === "shopify"
        ? shopifyUpdate(lineId, quantity)
        : localUpdate(lineId, quantity);
    },
    remove: function (lineId) {
      return MODE === "shopify" ? shopifyRemove(lineId) : localRemove(lineId);
    },
    clear: function () {
      if (MODE === "shopify") {
        drop(CART_ID_KEY);
        return adopt(null);
      }
      write(CART_KEY, []);
      return buildLocalState();
    },
    state: function () { return state; },
    onChange: onChange
  };

  /* ------------------------------------------------------------- newsletter */
  function subscribe(email) {
    if (!CFG.newsletterEndpoint) {
      return Promise.resolve({ ok: true, simulated: true });
    }
    return fetch(CFG.newsletterEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return { ok: true, simulated: false };
    });
  }

  /* ----------------------------------------------------------------- search */
  function search(term) {
    var q = term.trim().toLowerCase();
    if (!q) return [];
    return cached().filter(function (p) {
      return [p.title, p.subtitle, p.fabric, p.craft, p.colour, p.category]
        .join(" ").toLowerCase().indexOf(q) > -1;
    });
  }

  window.SHASHA_STORE = {
    mode: MODE,
    money: money,
    products: products,
    product: product,
    cached: cached,
    categories: categories,
    variantFor: variantFor,
    variantExact: variantExact,
    search: search,
    subscribe: subscribe,
    cart: cart
  };
})();
