// Crop a bug screenshot and draw red boxes, numbered markers and Thai labels on it.
// Rendered through Chromium because PIL cannot shape Thai vowel/tone marks.
//
// Usage (from the e2e project folder, playwright is resolved from there):
//   node ~/.claude/skills/tc-to-e2e/scripts/annotate-bug-image.mjs <spec.json>
//
// spec.json (coordinates are pixels of the ORIGINAL image; paths relative to the spec file):
// {
//   "src": "BUG-12.png",
//   "out": "BUG-12-crop.png",
//   "crop": [460, 80, 860, 480],                    // x, y, width, height
//   "boxes": [{ "rect": [505, 196, 115, 36], "n": 1 }],  // x, y, width, height; n = optional marker
//   "notes": [{ "n": 1, "text": "chip \"ปิดภาคเรียน\" ➜ ควรเป็น \"ปิดภาคเรียนแล้ว\"" }],
//   "notesAt": [516, 330],                          // where the note list starts (original coords)
//   "question": "ปุ่มนี้ต้องพาไปหน้าใด"                 // optional: a framed "ถามเรื่อง: …" band above the image
// }
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { loadChromium } from './lib/resolve.mjs'

const specPath = resolve(process.argv[2] ?? '')
const spec = JSON.parse(readFileSync(specPath, 'utf8'))
const base = dirname(specPath)
const [cx, cy, cw, ch] = spec.crop
const img = readFileSync(resolve(base, spec.src)).toString('base64')

const css = `body{margin:0}#w{position:relative;overflow:hidden;width:${cw}px;height:${ch}px}
#w img{position:absolute;left:${-cx}px;top:${-cy}px}
.b{position:absolute;border:4px solid #e53935;border-radius:6px;box-sizing:border-box}
.n{position:absolute;width:28px;height:28px;border-radius:50%;background:#e53935;color:#fff;font:700 17px Thonburi,'Noto Sans Thai',sans-serif;display:flex;align-items:center;justify-content:center}
.l{position:absolute;background:#e53935;color:#fff;font:700 18px Thonburi,'Noto Sans Thai',sans-serif;padding:4px 10px;border-radius:6px;white-space:nowrap}
#out{display:inline-block;background:#fff}
.q{box-sizing:border-box;width:${cw}px;margin:0 0 8px;padding:10px 14px;border:3px solid #1565c0;border-radius:8px;background:#e3f2fd;color:#0d2b52;font:700 19px/1.5 Thonburi,'Noto Sans Thai',sans-serif}
.q b{color:#1565c0}`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const parts = []
for (const { rect, n } of spec.boxes ?? []) {
  const [x, y, w, h] = rect
  parts.push(
    `<div class="b" style="left:${x - cx}px;top:${y - cy}px;width:${w}px;height:${h}px"></div>`,
  )
  if (n)
    parts.push(
      `<div class="n" style="left:${x - cx + w + 6}px;top:${y - cy + h / 2 - 14}px">${n}</div>`,
    )
}
const [nx, ny] = spec.notesAt ?? [
  cx + 20,
  cy + ch - 50 * (spec.notes?.length ?? 0),
]
spec.notes?.forEach(({ n, text }, i) => {
  const top = ny - cy + i * 42
  const left = nx - cx
  if (n)
    parts.push(
      `<div class="n" style="left:${left}px;top:${top + 2}px">${n}</div>`,
    )
  parts.push(
    `<div class="l" style="left:${left + (n ? 36 : 0)}px;top:${top}px">${esc(text)}</div>`,
  )
})

const question = spec.question
  ? `<div class="q"><b>ถามเรื่อง:</b> ${esc(spec.question)}</div>`
  : ''

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: cw, height: ch + 400 },
})
await page.setContent(
  `<style>${css}</style><div id="out">${question}<div id="w"><img src="data:image/png;base64,${img}">${parts.join('')}</div></div>`,
)
await page.waitForLoadState('load')
await page.locator('#out').screenshot({ path: resolve(base, spec.out) })
await browser.close()
console.log(resolve(base, spec.out))
