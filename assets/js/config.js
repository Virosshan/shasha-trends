/* ==========================================================================
   SHASHA TRENDS — configuration
   The one file to edit for contact details, shipping, offers and checkout.
   Nothing here is secret. Never put a payment secret key or a Shopify Admin
   API token in this file — it ships to every visitor's browser.
   ========================================================================== */

window.SHASHA_CONFIG = {
  /* ---------------------------------------------------------------- brand */
  brand: "Shasha Trends",
  instagram: "https://www.instagram.com/shasha.trends/",
  supportEmail: "hello@shashatrends.com",          // TODO: replace with the real address

  /* ------------------------------------------------------------- checkout
     "whatsapp"  — checkout collects delivery details and opens a pre-filled
                   WhatsApp message to the number below. No backend needed.
     "shopify"   — real Shopify checkout (fill in the shopify block below).
     "razorpay"  — placeholder: wire it into assets/js/checkout.js when ready. */
  checkout: "whatsapp",

  /* Digits only, with country code, no + or spaces. e.g. 60123456789
     TODO: replace this placeholder before going live. */
  whatsappNumber: "",

  /* The WhatsApp link from the Instagram bio. Message links cannot carry a
     pre-filled message, so while whatsappNumber is empty the site opens this
     chat and copies the order text for the customer to paste. Add the number
     above (digits, country code) to get pre-filled messages instead. */
  whatsappMessageLink: "https://wa.me/message/3EEBRD56P226H1",

  /* Showrooms. Addresses and hours are not on Instagram — fill these in. */
  showrooms: [
    { name: "Shasha's KL Showroom", area: "Kuala Lumpur", address: "", hours: "" },
    { name: "Shasha | Modern & Traditional", area: "Rawang, Selangor", address: "", hours: "" }
  ],

  /* ------------------------------------------------------------- shopify
     Leave `domain` empty to run off the catalogue in data.js. */
  shopify: {
    domain: "",
    storefrontAccessToken: "",
    apiVersion: "2024-10",
    productLimit: 60
  },

  /* ------------------------------------------------------------ commerce */
  currency: "MYR",
  locale: "en-MY",
  freeShippingThreshold: 200,
  shippingFlat: 8,                          // charged below the free-shipping line
  dispatchDays: "2–3 working days",
  deliveryDays: "2–4 working days in West Malaysia, 4–7 in Sabah & Sarawak",

  /* First-order offer shown on the home page, in the cart and at checkout. */
  offer: { code: "SHASHA10", percent: 10, label: "10% off your first order" },

  /* ---------------------------------------------------------------- proof
     The reviews in assets/js/extras.js are SAMPLES so you can see the layout.
     While this is true they carry a visible "Sample" label. Replace them with
     real ones, then set this to false — or set `reviews: []` to drop the
     section entirely. */
  sampleContent: true,

  accountUrl: "",
  newsletterEndpoint: ""                    // POST {email} — Klaviyo, Mailchimp, your own API
};
