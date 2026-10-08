// Renders the app icons (public/icons/*.png and src/app/favicon.ico) from one piece of markup,
// using the machine's Chrome and the brand display font (Fraunces, from Google Fonts).
//
//   node scripts/build-icons.mjs
//
// Needs network for the font. The PNGs are committed; rerun only when the design changes.
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from '@playwright/test'

// Brand tokens, from src/shared/styles/theme.css
const SAGE = '#3f6845'
const SAGE_DEEP = '#2e5033'
const CREAM = '#f7f4ef'
const AMBER = '#f0c48a'

const FONT_CSS =
    'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,600&display=block'

// `inset` is how much of the canvas the artwork may use (the maskable safe zone is the central
// 80%, so its content must sit well inside); `radius` rounds the corners of "any" icons only.
const markup = ({ radius, scale }) => `<!doctype html>
<html><head><link rel="stylesheet" href="${FONT_CSS}">
<style>
  html, body { margin: 0; background: transparent; }
  .icon {
    width: 512px; height: 512px; position: relative; overflow: hidden;
    border-radius: ${radius}px;
    background: radial-gradient(120% 120% at 25% 15%, #4d7d55 0%, ${SAGE} 48%, ${SAGE_DEEP} 100%);
  }
  .art { position: absolute; inset: 0; transform: scale(${scale}); transform-origin: 50% 50%; }
  .k {
    position: absolute; left: 0; right: 0; top: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Fraunces', serif; font-style: italic; font-weight: 600;
    font-variation-settings: 'opsz' 144;
    font-size: 380px; line-height: 1; color: ${CREAM};
    padding-right: 24px; padding-bottom: 30px; box-sizing: border-box;
  }
  .star { position: absolute; left: 394px; top: 58px; width: 76px; height: 76px; }
</style></head>
<body><div class="icon"><div class="art">
  <div class="k">K</div>
  <svg class="star" viewBox="-50 -50 100 100">
    <path d="M0 -48 C4 -16 16 -4 48 0 C16 4 4 16 0 48 C-4 16 -16 4 -48 0 C-16 -4 -4 -16 0 -48Z" fill="${AMBER}"/>
  </svg>
</div></div></body></html>`

const targets = [
    // "any" icons: rounded corners over transparency, artwork fills the tile.
    { file: 'public/icons/icon-512x512.png', size: 512, radius: 112, scale: 1, transparent: true },
    { file: 'public/icons/icon-192x192.png', size: 192, radius: 112, scale: 1, transparent: true },
    // Maskable: full bleed (the OS applies its own mask); artwork inside the 80% safe zone.
    { file: 'public/icons/icon-maskable-512x512.png', size: 512, radius: 0, scale: 0.78 },
    // iOS adds its own corners and rejects transparency: full bleed, opaque.
    { file: 'public/icons/apple-touch-icon.png', size: 180, radius: 0, scale: 0.92 },
    { file: null, size: 48, radius: 10, scale: 1, transparent: true },
]

const browser = await chromium.launch({ channel: 'chrome' })
try {
    mkdirSync('public/icons', { recursive: true })
    let favicon
    for (const { file, size, radius, scale, transparent = false } of targets) {
        const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 })
        await page.setContent(markup({ radius, scale }), { waitUntil: 'networkidle' })
        await page.evaluate(() => document.fonts.ready)
        const png = await page.locator('.icon').screenshot({ omitBackground: transparent })
        if (file) writeFileSync(file, png)
        else favicon = png // only embedded in favicon.ico
        await page.close()
        console.log(`wrote ${file ?? 'favicon image'}`)
    }

    // A one-image .ico: a PNG inside the ICO container (supported by every current browser).
    const header = Buffer.alloc(22)
    header.writeUInt16LE(0, 0) // reserved
    header.writeUInt16LE(1, 2) // type: icon
    header.writeUInt16LE(1, 4) // image count
    header.writeUInt8(48, 6) // width
    header.writeUInt8(48, 7) // height
    header.writeUInt16LE(1, 10) // colour planes
    header.writeUInt16LE(32, 12) // bits per pixel
    header.writeUInt32LE(favicon.length, 14) // image size
    header.writeUInt32LE(22, 18) // image offset
    writeFileSync('src/app/favicon.ico', Buffer.concat([header, favicon]))
    console.log('wrote src/app/favicon.ico')
} finally {
    await browser.close()
}
