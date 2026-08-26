import sharp from "sharp";
import fs from "fs";
import path from "path";

const publicDir = path.resolve("public");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="512"
  height="512"
  viewBox="0 0 512 512"
>
  <rect
    width="512"
    height="512"
    rx="96"
    fill="#1f2937"
  />

  <circle
    cx="256"
    cy="256"
    r="190"
    fill="#ffffff"
  />

  <g
    fill="#1f2937"
    transform="translate(0 10)"
  >
    <path
      d="
        M190 145
        C190 115 215 92 256 92
        C297 92 322 115 322 145
        C322 165 311 181 296 191
        L296 218
        L326 250
        L326 278
        L186 278
        L186 250
        L216 218
        L216 191
        C201 181 190 165 190 145
        Z
      "
    />

    <rect
      x="175"
      y="278"
      width="162"
      height="38"
      rx="10"
    />

    <path
      d="
        M160 316
        L352 316
        L375 365
        L137 365
        Z
      "
    />

    <rect
      x="120"
      y="365"
      width="272"
      height="42"
      rx="12"
    />
  </g>
</svg>
`;

async function generateIcon(size, filename) {
  const outputPath = path.join(publicDir, filename);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`✓ ${filename} créé (${size}x${size})`);
}

await generateIcon(
  192,
  "pwa-192x192.png"
);

await generateIcon(
  512,
  "pwa-512x512.png"
);

console.log("");
console.log("🎨 Icônes PWA générées avec succès !");