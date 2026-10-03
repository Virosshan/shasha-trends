/* ==========================================================================
   SHASHA TRENDS — product catalogue
   One object per product. To change a product page, edit its object here:
   name, price, copy, images, sizes and stock all live in this file.

   PLACEHOLDERS: every product, price, fabric and stock level below is a
   draft built from the Instagram feed and is NOT confirmed — replace it with
   the real range. Images are generated placeholders; drop real photos in
   assets/img/ and list them in `images` (first image is the card/hero shot).

   Fields
     id        url handle (product.html?handle=<id>)
     group     products sharing a group show each other as "Other colours"
     category  "kurtis" | "skirts" (drives the shop filter chips)
     tag       small badge on the card ("Bestseller", "New") — optional
     lowStock  show "Only N left" on the page — a number, or null
     sizes     { label, stock:true|false }
   ========================================================================== */

(function () {
  var SIZES = function (outOf, labels) {
    return (labels || ["S", "M", "L", "XL", "XXL"]).map(function (l) {
      return { label: l, stock: outOf.indexOf(l) === -1 };
    });
  };

  var KURTI = {
    group: "kurtis",
    category: "kurtis",
    fabric: "Cotton",
    desc:
      "A relaxed everyday kurti with a flattering straight cut, finished with a softly embroidered yoke. " +
      "Easy to wear to work, to family gatherings, or on a lazy weekend.",
    details: [
      "Straight cut, side slits, three-quarter sleeves",
      "Embroidered yoke and contrast hem band",
      "Breathable cotton, soft against the skin",
      "Model is 5'5\" and wears a size M"
    ],
    care: "Hand wash separately in cold water with a mild detergent. Do not bleach. Dry in shade and press on low heat."
  };

  var SKIRT = {
    group: "skirts",
    category: "skirts",
    fabric: "Cotton blend",
    desc:
      "A full, swishy tiered skirt with an elasticated waist and plenty of twirl. " +
      "Pair it with a plain top and let the skirt do the talking.",
    details: [
      "Four gathered tiers, elasticated waist",
      "Fully flared, falls below the knee",
      "Soft cotton blend with a light lining",
      "Model is 5'5\" and wears a size M"
    ],
    care: "Gentle hand wash in cold water. Dry flat in shade and press on low heat from the reverse side."
  };

  function item(base, o) {
    return {
      id: o.id,
      group: o.group || null,
      name: o.name,
      sub: o.sub,
      price: o.price,
      was: o.was === undefined ? null : o.was,
      tag: o.tag || "",
      tagStyle: o.tagStyle || "ink",
      lowStock: o.lowStock || null,
      category: base.category,
      fabric: o.fabric || base.fabric,
      craft: o.craft || "",
      colour: o.colour,
      colours: [{ name: o.colour, hex: o.hex }],
      sizes: SIZES(o.out || []),
      images: [1, 2].map(function (n) { return "assets/img/p-" + o.img + "-" + n + ".svg"; }),
      desc: o.desc || base.desc,
      details: base.details,
      care: base.care
    };
  }

  window.SHASHA_PRODUCTS = [
    item(SKIRT, { id: "patchwork-tiered-skirt", img: "patchwork", name: "Patchwork Tiered Skirt", sub: "Multicolour patchwork skirt", price: 139, was: 169, colour: "Patchwork", hex: "#c8452f", tag: "Bestseller", lowStock: 5, group: "skirts-patchwork" }),
    item(KURTI, { id: "lilac-chikankari-kurti", img: "lilac", name: "Lilac Chikankari Kurti", sub: "Embroidered cotton kurti", price: 119, was: 149, colour: "Lilac", hex: "#b9a0cc", tag: "Bestseller", craft: "Chikankari" }),
    item(KURTI, { id: "indigo-block-print-kurti", img: "indigo", name: "Indigo Block-Print Kurti", sub: "Hand block-print cotton", price: 99, was: null, colour: "Indigo", hex: "#2b3a6b", tag: "New", craft: "Block print" }),
    item(KURTI, { id: "teal-stripe-kurti", img: "teal", name: "Teal Striped Kurti", sub: "Everyday cotton kurti", price: 89, was: null, colour: "Teal", hex: "#2f7a76", out: ["S"] }),
    item(KURTI, { id: "mustard-motif-kurti", img: "mustard", name: "Mustard Motif Kurti", sub: "Printed cotton kurti", price: 95, was: 115, colour: "Mustard", hex: "#d49a2c", tag: "New", lowStock: 3, out: ["XXL"] }),
    item(KURTI, { id: "rose-dot-kurti", img: "rose", name: "Rose Dot Kurti", sub: "Soft cotton kurti", price: 99, was: null, colour: "Rose", hex: "#c4587a" }),
    item(SKIRT, { id: "rust-tiered-skirt", img: "rust", name: "Rust Tiered Skirt", sub: "Ombré tiered skirt", price: 129, was: null, colour: "Rust", hex: "#a8482b", group: "skirts-solid" }),
    item(SKIRT, { id: "jade-tiered-skirt", img: "jade", name: "Jade Tiered Skirt", sub: "Ombré tiered skirt", price: 129, was: null, colour: "Jade", hex: "#2f7a76", group: "skirts-solid", out: ["S"] })
  ];
})();
