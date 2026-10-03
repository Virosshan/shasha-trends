# Shasha Trends — storefront

Static HTML, CSS and vanilla JS. No build step, no dependencies. Forked from the
Brahmi storefront (itself from Hamsa) and re-themed: lotus pink, leaf teal, cream, script wordmark.

## Run it

    node tools/serve.mjs 4331

Open http://localhost:4331.

## Before going live (placeholders to replace)

| What | Where |
|---|---|
| WhatsApp number (digits, country code, no `+`) | `assets/js/config.js` -> `whatsappNumber`. Empty = uses the bio's message link and copies the order text for the customer to paste |
| Showroom addresses and opening hours | `config.js` -> `showrooms` |
| Support email | `config.js` -> `supportEmail` |
| Products, prices, fabrics, stock | `assets/js/data.js` (all drafted from Instagram, none confirmed) |
| Product photos (generated `.svg` placeholders) | drop files in `assets/img/`, list them in each product's `images` |
| Hero, story and showroom images | `assets/img/hero.svg`, `story.svg`, `showroom.svg` |
| Size chart (sample) | `SIZE_CHART` in `assets/js/extras.js` |
| Reviews (sample) | `REVIEWS` in `extras.js`; then set `sampleContent: false` in `config.js` |
| Offer code, free-shipping line, shipping fee | `config.js` |

Anything still marked **Sample** on the page is placeholder copy.

## Editing a product page

Everything comes from one object in `assets/js/data.js`. Layout lives in `renderPDP()` in
`assets/js/app.js`; styling in `assets/css/shasha.css`. Products sharing a `group` show each other
as "other colours". Shop filter chips are generated from each product's `category`.

## Checkout

`checkout` in `config.js` picks the adapter used by `assets/js/checkout.js`: `whatsapp` (default),
`shopify` (fill in the shopify block), or a `razorpay` stub (needs a server for the order; never put a
secret key in client code).

## Deploy

Any static host. Cloudflare Pages: no build command, output directory `/`.
