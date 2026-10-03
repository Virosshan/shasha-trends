/* ==========================================================================
   SHASHA — Shopify Storefront API client
   Thin GraphQL wrapper: the catalogue, one product by handle, and a cart
   that carries its own Shopify-hosted checkout URL. Everything it returns
   is normalised into the shape store.js/app.js already expect, so this
   file is the only thing that knows Shopify exists.

   Checkout itself is not implemented here: Shopify's checkout page collects
   address, shipping and payment, so the cart's checkoutUrl is the entire
   "checkout" this client needs to offer.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SHASHA_CONFIG;
  var S = CFG.shopify;

  function configured() {
    return Boolean(S && S.domain && S.storefrontAccessToken);
  }

  function endpoint() {
    return "https://" + S.domain + "/api/" + (S.apiVersion || "2024-10") + "/graphql.json";
  }

  /* ------------------------------------------------------------- transport */
  function gql(query, variables) {
    return fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": S.storefrontAccessToken
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (res) {
      return res.text().then(function (text) {
        var payload = text ? JSON.parse(text) : {};
        if (!res.ok) {
          throw new Error("Shopify returned HTTP " + res.status + ": " + text);
        }
        if (payload.errors && payload.errors.length) {
          /* Shopify answers 200 with an `errors` array for a bad query or a
             bad token — the status code alone says nothing useful. */
          throw new Error("Shopify GraphQL error: " + payload.errors[0].message);
        }
        return payload.data;
      });
    });
  }

  /* ------------------------------------------------------------ normalising */
  function money(node) { return node ? Number(node.amount) : 0; }

  /* Categories come straight from each product's Type field in Shopify —
     no fixed list to maintain here. A new Type used on any product shows up
     as a new shop filter automatically (see store.js's `categories()`).
     Products with no Type set just have no category (still shown under
     "All", never given their own filter). */
  function categoryFor(node) {
    return String(node.productType || "")
      .trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function optionValue(variant, wanted) {
    var opts = variant.selectedOptions || [];
    for (var i = 0; i < opts.length; i++) {
      var name = String(opts[i].name).toLowerCase();
      if (name === wanted || (wanted === "colour" && name === "color")) {
        return opts[i].value;
      }
    }
    return "";
  }

  function unique(list) {
    var seen = {};
    var out = [];
    list.forEach(function (v) {
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    });
    return out;
  }

  function normaliseProduct(node) {
    var images = (node.images && node.images.edges || []).map(function (e) {
      return e.node.url;
    });
    var imageAlts = (node.images && node.images.edges || []).map(function (e) {
      return e.node.altText || node.title;
    });

    var variants = (node.variants && node.variants.edges || []).map(function (e) {
      var v = e.node;
      var price = money(v.price);
      var compareAt = v.compareAtPrice ? money(v.compareAtPrice) : null;
      return {
        id: v.id,
        /* A product with no colour/size options set in Shopify has a single
           default variant whose options are "". Falling back here (rather
           than only in the display list below) keeps this value identical
           to the label shown in the UI, so the two are never compared
           unequal — which previously made an in-stock variant look sold
           out because "" !== "One size". */
        colour: optionValue(v, "colour") || "As shown",
        size: optionValue(v, "size") || "One size",
        price: price,
        compareAt: compareAt && compareAt > price ? compareAt : null,
        available: Boolean(v.availableForSale),
        /* The default Storefront API scope does not include exact stock
           counts (`unauthenticated_read_product_inventory`), only whether a
           variant can be sold. A large placeholder lets the quantity
           stepper work normally for anything in stock, capped only by
           availableForSale rather than a real count. */
        quantityAvailable: v.availableForSale ? 99 : 0,
        image: v.image ? v.image.url : null
      };
    });

    var colourNames = unique(variants.map(function (v) { return v.colour; }));
    var colours = (colourNames.length ? colourNames : ["As shown"]).map(function (name) {
      return { name: name, hex: "#d9d9d9" };
    });

    var sizeLabels = unique(variants.map(function (v) { return v.size; }));
    var sizes = (sizeLabels.length ? sizeLabels : ["One size"]).map(function (label) {
      return {
        label: label,
        available: variants.some(function (v) { return v.size === label && v.available; })
      };
    });

    var priced = variants.filter(function (v) { return v.price > 0; });
    var cheapest = priced.length
      ? priced.reduce(function (a, b) { return b.price < a.price ? b : a; })
      : { price: 0, compareAt: null };

    var tags = node.tags || [];

    return {
      id: node.handle,
      handle: node.handle,
      shopifyId: node.id,
      title: node.title,
      subtitle: "",
      price: cheapest.price,
      compareAt: cheapest.compareAt,
      currency: CFG.currency,
      category: categoryFor(node),
      fabric: "",
      craft: "",
      tag: tags.length ? tags[0] : null,
      tagStyle: "paper",
      colour: colours[0] ? colours[0].name : "",
      colours: colours,
      sizes: sizes,
      variants: variants,
      images: images.length ? images : [""],
      imageAlts: imageAlts.length ? imageAlts : [node.title],
      desc: node.description || "",
      details: [],
      care: "",
      available: variants.some(function (v) { return v.available; }),
      source: "shopify"
    };
  }

  /* -------------------------------------------------------------- catalogue */
  var PRODUCT_FIELDS =
    "id handle title description productType tags " +
    "images(first: 10) { edges { node { url altText } } } " +
    "variants(first: 100) { edges { node { " +
      "id availableForSale " +
      "price { amount } compareAtPrice { amount } " +
      "image { url } " +
      "selectedOptions { name value } " +
    "} } }";

  function fetchProducts() {
    var query =
      "query Products($first: Int!) { products(first: $first) { edges { node { " +
      PRODUCT_FIELDS +
      " } } } }";

    return gql(query, { first: S.productLimit || 60 }).then(function (data) {
      return (data.products.edges || []).map(function (e) { return normaliseProduct(e.node); });
    });
  }

  function fetchProduct(handle) {
    var query =
      "query ProductByHandle($handle: String!) { productByHandle(handle: $handle) { " +
      PRODUCT_FIELDS +
      " } }";

    return gql(query, { handle: handle }).then(function (data) {
      return data.productByHandle ? normaliseProduct(data.productByHandle) : null;
    });
  }

  /* ------------------------------------------------------------------ cart */
  var CART_FIELDS =
    "id checkoutUrl totalQuantity " +
    "cost { subtotalAmount { amount } totalAmount { amount } } " +
    "lines(first: 100) { edges { node { " +
      "id quantity cost { totalAmount { amount } } " +
      "merchandise { ... on ProductVariant { " +
        "id price { amount } image { url } " +
        "selectedOptions { name value } " +
        "product { handle title } " +
      "} } " +
    "} } }";

  function normaliseCart(cart) {
    if (!cart) return null;

    var lines = (cart.lines.edges || []).map(function (e) {
      var line = e.node;
      var m = line.merchandise;
      return {
        /* app.js renders data-line and data-remove from this and hands it
           straight back to update/remove, so it must be the CART LINE id
           rather than the variant id. */
        id: line.id,
        variantId: m.id,
        handle: m.product.handle,
        title: m.product.title,
        colour: optionValue(m, "colour"),
        size: optionValue(m, "size"),
        image: m.image ? m.image.url : "",
        quantity: line.quantity,
        /* Placeholder. store.js overwrites this from the catalogue, which
           has the real per-variant stock. */
        maxQuantity: line.quantity,
        unitAmount: money(m.price),
        lineAmount: money(line.cost.totalAmount)
      };
    });

    var subtotal = money(cart.cost.subtotalAmount);

    return {
      id: cart.id,
      checkoutUrl: cart.checkoutUrl,
      totalQuantity: cart.totalQuantity,
      currency: CFG.currency,
      subtotal: subtotal,
      /* Shopify's checkout page prices and collects delivery — this client
         never sees a shipping figure before then. */
      shippingAmount: 0,
      discountAmount: 0,
      total: money(cart.cost.totalAmount),
      lines: lines
    };
  }

  function cartCreate() {
    var query =
      "mutation CartCreate { cartCreate(input: {}) { cart { " + CART_FIELDS + " } userErrors { message } } }";
    return gql(query).then(function (data) {
      var payload = data.cartCreate;
      if (payload.userErrors && payload.userErrors.length) {
        throw new Error(payload.userErrors[0].message);
      }
      return normaliseCart(payload.cart);
    });
  }

  function cartGet(id) {
    var query = "query CartGet($id: ID!) { cart(id: $id) { " + CART_FIELDS + " } }";
    return gql(query, { id: id }).then(function (data) {
      /* An expired or already-completed cart comes back as null, same as a
         404 from Medusa — treat it as "start a fresh one", not an error. */
      return normaliseCart(data.cart);
    });
  }

  function cartLinesAdd(id, variantId, quantity) {
    var query =
      "mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { " +
      "cartLinesAdd(cartId: $cartId, lines: $lines) { cart { " + CART_FIELDS + " } userErrors { message } } }";
    return gql(query, {
      cartId: id,
      lines: [{ merchandiseId: variantId, quantity: quantity }]
    }).then(function (data) {
      var payload = data.cartLinesAdd;
      if (payload.userErrors && payload.userErrors.length) {
        throw new Error(payload.userErrors[0].message);
      }
      return normaliseCart(payload.cart);
    });
  }

  function cartLinesUpdate(id, lineId, quantity) {
    var query =
      "mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { " +
      "cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { " + CART_FIELDS + " } userErrors { message } } }";
    return gql(query, {
      cartId: id,
      lines: [{ id: lineId, quantity: quantity }]
    }).then(function (data) {
      var payload = data.cartLinesUpdate;
      if (payload.userErrors && payload.userErrors.length) {
        throw new Error(payload.userErrors[0].message);
      }
      return normaliseCart(payload.cart);
    });
  }

  function cartLinesRemove(id, lineId) {
    var query =
      "mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { " +
      "cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { " + CART_FIELDS + " } userErrors { message } } }";
    return gql(query, { cartId: id, lineIds: [lineId] }).then(function (data) {
      var payload = data.cartLinesRemove;
      if (payload.userErrors && payload.userErrors.length) {
        throw new Error(payload.userErrors[0].message);
      }
      return normaliseCart(payload.cart);
    });
  }

  window.SHASHA_SHOPIFY = {
    configured: configured,
    fetchProducts: fetchProducts,
    fetchProduct: fetchProduct,
    cartCreate: cartCreate,
    cartGet: cartGet,
    cartLinesAdd: cartLinesAdd,
    cartLinesUpdate: cartLinesUpdate,
    cartLinesRemove: cartLinesRemove,
    /* exposed for manual/console checks */
    _normaliseProduct: normaliseProduct,
    _normaliseCart: normaliseCart
  };
})();
