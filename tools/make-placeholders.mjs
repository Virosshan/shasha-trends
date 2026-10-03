/* Generates the placeholder product art in assets/img/.
   Run:  node tools/make-placeholders.mjs
   Every file says "photo placeholder" so none can be mistaken for a real
   photo. Replace them by dropping real JPG/WebP files in assets/img/ and
   pointing each product's `images` in assets/js/data.js at them. */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "assets", "img");
mkdirSync(OUT, { recursive: true });

const KURTIS = [
  { id: "lilac",  body: "#b9a0cc", accent: "#ffffff", trim: "#7d5a99", pat: "dots" },
  { id: "indigo", body: "#2b3a6b", accent: "#f1e6d2", trim: "#d9a441", pat: "motif" },
  { id: "teal",   body: "#2f7a76", accent: "#f4e3c1", trim: "#c93f7c", pat: "stripe" },
  { id: "mustard",body: "#d49a2c", accent: "#fff4d6", trim: "#8a3b2a", pat: "motif" },
  { id: "rose",   body: "#c4587a", accent: "#ffe7ee", trim: "#f2b94e", pat: "dots" }
];
const SKIRTS = [
  { id: "patchwork", tiers: ["#c8452f", "#e8a23a", "#3b6fa8", "#c93f7c"], trim: "#1f4a47" },
  { id: "rust",      tiers: ["#a8482b", "#b9593a", "#c86d49", "#d98660"], trim: "#f2d9b6" },
  { id: "jade",      tiers: ["#1f6a66", "#2f7a76", "#43918c", "#5aa8a2"], trim: "#f2b94e" }
];

const svg = (inner, w = 800, h = 1000) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Placeholder product image">${inner}</svg>`;

const bg = (k) => `
  <defs>
    <linearGradient id="w${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4e8d8"/><stop offset="1" stop-color="#e6d3bd"/></linearGradient>
    <radialGradient id="g${k}" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#w${k})"/><rect width="800" height="1000" fill="url(#g${k})"/>
  <ellipse cx="400" cy="945" rx="230" ry="18" fill="#000" opacity=".08"/>`;

const tag = (t = "PHOTO PLACEHOLDER") => `
  <g font-family="Arial, Helvetica, sans-serif"><rect x="496" y="42" width="260" height="30" rx="2" fill="#000" opacity=".55"/>
  <text x="626" y="62" text-anchor="middle" font-size="12" letter-spacing="2.2" fill="#fff">${t}</text></g>
  <text x="44" y="950" font-family="Georgia, serif" font-style="italic" font-size="44" fill="#1f4a47" opacity=".75">Shasha</text>`;

const pattern = (id, c) => {
  if (c.pat === "dots")
    return `<pattern id="${id}" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="${c.body}"/>
      <circle cx="9" cy="9" r="3" fill="${c.accent}" opacity=".85"/><circle cx="26" cy="26" r="3" fill="${c.accent}" opacity=".85"/><circle cx="26" cy="9" r="1.6" fill="${c.accent}" opacity=".6"/><circle cx="9" cy="26" r="1.6" fill="${c.accent}" opacity=".6"/></pattern>`;
  if (c.pat === "motif")
    return `<pattern id="${id}" width="46" height="46" patternUnits="userSpaceOnUse"><rect width="46" height="46" fill="${c.body}"/>
      <path d="M23 8c4 5 4 9 0 14-4-5-4-9 0-14zM23 26c4 5 4 9 0 14-4-5-4-9 0-14z" fill="${c.accent}" opacity=".8"/><circle cx="2" cy="23" r="2" fill="${c.accent}" opacity=".6"/><circle cx="44" cy="23" r="2" fill="${c.accent}" opacity=".6"/></pattern>`;
  return `<pattern id="${id}" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="${c.body}"/>
      <path d="M0 4H28" stroke="${c.accent}" stroke-width="2" opacity=".75"/><path d="M0 18H28" stroke="${c.accent}" stroke-width="1" opacity=".5"/></pattern>`;
};

const kurti = (c, k) => `
  <defs>${pattern("p" + k, c)}</defs>
  <g>
    <!-- sleeves -->
    <path d="M300 205 L228 262 L206 470 L262 478 L300 330 Z" fill="url(#p${k})"/>
    <path d="M500 205 L572 262 L594 470 L538 478 L500 330 Z" fill="url(#p${k})"/>
    <!-- body -->
    <path d="M336 162 Q400 232 464 162 L506 192 L520 330 L538 800 L262 800 L280 330 L294 192 Z" fill="url(#p${k})"/>
    <path d="M336 162 Q400 232 464 162" fill="none" stroke="${c.trim}" stroke-width="6"/>
    <!-- yoke -->
    <path d="M300 250 Q400 330 500 250 L506 292 Q400 372 294 292 Z" fill="${c.trim}" opacity=".9"/>
    <g fill="${c.accent}" opacity=".9">${Array.from({ length: 9 }, (_, i) => `<circle cx="${318 + i * 20.5}" cy="${298 + Math.sin(i / 8 * Math.PI) * 38}" r="3.2"/>`).join("")}</g>
    <!-- placket + hem -->
    <path d="M400 232 L400 520" stroke="${c.trim}" stroke-width="3" opacity=".7"/>
    ${[270, 330, 390, 450].map((y) => `<circle cx="400" cy="${y}" r="3.5" fill="${c.trim}"/>`).join("")}
    <rect x="262" y="760" width="276" height="40" fill="${c.trim}"/>
    <path d="M262 770H538M262 790H538" stroke="${c.accent}" stroke-width="2" opacity=".7"/>
    <path d="M262 590 L280 600 M538 590 L520 600" stroke="#000" stroke-opacity=".1" stroke-width="3"/>
    <path d="M300 205 L300 330 M500 205 L500 330" stroke="#000" stroke-opacity=".08" stroke-width="3"/>
  </g>`;

const skirt = (c, k) => {
  const tiers = [
    [300, 410, 262, 538, 232, 568],
    [405, 540, 232, 568, 190, 610],
    [535, 690, 190, 610, 140, 660],
    [685, 860, 140, 660, 80, 720]
  ];
  return `<g>
    <rect x="262" y="262" width="276" height="48" fill="${c.trim}"/>
    ${tiers.map((t, i) => {
      const col = c.tiers[i];
      const ruffle = Array.from({ length: 7 }, (_, n) => {
        const x0 = t[4] + ((t[5] - t[4]) / 7) * n;
        const x1 = t[4] + ((t[5] - t[4]) / 7) * (n + 1);
        return `Q${(x0 + x1) / 2} ${t[1] + 14} ${x1} ${t[1]}`;
      }).join(" ");
      return `<path d="M${t[2]} ${t[0]} L${t[3]} ${t[0]} L${t[5]} ${t[1]} ${ruffle.split(" ").length ? "" : ""}L${t[4]} ${t[1]} Z" fill="${col}"/>
        <path d="M${t[2]} ${t[0]} L${t[4]} ${t[1]} M${t[3]} ${t[0]} L${t[5]} ${t[1]}" stroke="#000" stroke-opacity=".08"/>
        ${Array.from({ length: 8 }, (_, n) => {
          const a = n / 7;
          const x0 = t[2] + (t[3] - t[2]) * a, x1 = t[4] + (t[5] - t[4]) * a;
          return `<path d="M${x0} ${t[0]} L${x1} ${t[1]}" stroke="#fff" stroke-opacity=".16" stroke-width="3"/>`;
        }).join("")}
        <path d="M${t[4]} ${t[1]} L${t[5]} ${t[1]}" stroke="${c.trim}" stroke-width="5" opacity=".85"/>`;
    }).join("")}
  </g>`;
};

const detail = (c, k, isSkirt) =>
  isSkirt
    ? `<rect width="800" height="1000" fill="#f4e8d8"/>${c.tiers.map((col, i) => `<rect y="${i * 250}" width="800" height="250" fill="${col}"/><path d="M0 ${i * 250 + 18}H800" stroke="${c.trim}" stroke-width="8" opacity=".8"/>${Array.from({ length: 12 }, (_, n) => `<path d="M${n * 70 - 20} ${i * 250} L${n * 70 + 40} ${i * 250 + 250}" stroke="#fff" stroke-opacity=".14" stroke-width="8"/>`).join("")}`).join("")}`
    : `<defs>${pattern("d" + k, { ...c, pat: c.pat })}</defs><rect width="800" height="1000" fill="url(#d${k})" transform="scale(2.4)" style="transform-origin:0 0"/>
       <rect y="700" width="800" height="300" fill="${c.trim}"/><path d="M0 740H800M0 800H800M0 960H800" stroke="${c.accent}" stroke-width="5" opacity=".7"/>
       ${Array.from({ length: 10 }, (_, n) => `<circle cx="${40 + n * 80}" cy="880" r="14" fill="${c.accent}" opacity=".85"/>`).join("")}`;

KURTIS.forEach((c) => {
  writeFileSync(join(OUT, `p-${c.id}-1.svg`), svg(bg(c.id) + kurti(c, c.id) + tag()));
  writeFileSync(join(OUT, `p-${c.id}-2.svg`), svg(detail(c, c.id, false) + tag()));
});
SKIRTS.forEach((c) => {
  writeFileSync(join(OUT, `p-${c.id}-1.svg`), svg(bg(c.id) + skirt(c, c.id) + tag()));
  writeFileSync(join(OUT, `p-${c.id}-2.svg`), svg(detail(c, c.id, true) + tag()));
});

// hero (wide) + showroom/story panels
writeFileSync(
  join(OUT, "hero.svg"),
  svg(
    `<defs><linearGradient id="hw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9d2b8"/><stop offset="1" stop-color="#d9b9a4"/></linearGradient></defs>
     <rect width="1600" height="900" fill="url(#hw)"/>
     <circle cx="1230" cy="430" r="380" fill="#c93f7c" opacity=".12"/>
     <g transform="translate(780,10) scale(.84)">${kurti(KURTIS[1], "hk")}</g>
     <g transform="translate(1060,40) scale(.82)">${skirt(SKIRTS[0], "hs")}</g>
     <g font-family="Arial"><rect x="1300" y="840" width="260" height="30" rx="2" fill="#000" opacity=".55"/><text x="1430" y="860" text-anchor="middle" font-size="12" letter-spacing="2.2" fill="#fff">PHOTO PLACEHOLDER</text></g>`,
    1600,
    900
  )
);
const panel = (name, label) =>
  writeFileSync(
    join(OUT, name),
    svg(
      `<rect width="800" height="1000" fill="#f4e8d8"/>
       <rect x="60" y="60" width="680" height="880" fill="none" stroke="#1f4a47" stroke-width="2"/>
       <rect x="80" y="80" width="640" height="840" fill="none" stroke="#c93f7c" stroke-width="1.5"/>
       <g transform="translate(400,380)" fill="#c93f7c" opacity=".85">${Array.from({ length: 10 }, (_, i) => `<ellipse rx="26" ry="86" transform="rotate(${i * 36}) translate(0,-96)"/>`).join("")}</g>
       <circle cx="400" cy="380" r="26" fill="#f2b94e"/>
       <text x="400" y="640" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="92" fill="#1f4a47">Shasha</text>
       <text x="400" y="690" text-anchor="middle" font-family="Arial" font-size="18" letter-spacing="9" fill="#1f4a47">${label}</text>
       <g font-family="Arial" text-anchor="middle"><text x="400" y="800" font-size="12" letter-spacing="2.2" fill="#1f4a47" opacity=".6">PHOTO PLACEHOLDER</text></g>`
    )
  );
panel("story.svg", "MODERN &amp; TRADITIONAL");
panel("showroom.svg", "VISIT THE SHOWROOM");

console.log("placeholders written to", OUT);
