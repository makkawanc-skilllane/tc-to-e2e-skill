/**
 * The skill's scripts live outside the project (e.g. ~/.claude/skills/tc-to-e2e), so Node
 * would look for `playwright` beside the script. Resolve it, and ffmpeg, from the project
 * the command is run in instead.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const fromProject = createRequire(path.join(process.cwd(), 'noop.js'))

/** `chromium` from the project's `playwright` (or `@playwright/test`). Run the script from the e2e project folder. */
export async function loadChromium() {
  for (const name of ['playwright', '@playwright/test']) {
    let file
    try {
      file = fromProject.resolve(name)
    } catch {
      continue
    }
    const mod = await import(pathToFileURL(file).href)
    return mod.chromium ?? mod.default?.chromium
  }
  console.error(
    `ไม่พบ playwright จาก ${process.cwd()} — รันคำสั่งจากโฟลเดอร์โปรเจกต์ e2e ที่ติดตั้ง playwright แล้ว`,
  )
  process.exit(1)
}

const hasOverlay = (bin) => {
  try {
    const out = execFileSync(bin, ['-hide_banner', '-filters'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return /\boverlay\b/.test(out)
  } catch {
    return false
  }
}

/** pnpm keeps `@ffmpeg-installer/<platform>` in node_modules/.pnpm without hoisting it; look there too. */
function pnpmFfmpeg() {
  const platform = `${process.platform}-${process.arch}`
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const store = path.join(dir, 'node_modules', '.pnpm')
    const pkg =
      fs.existsSync(store) &&
      fs
        .readdirSync(store)
        .find((d) => d.startsWith(`@ffmpeg-installer+${platform}@`))
    if (pkg)
      return path.join(
        store,
        pkg,
        'node_modules/@ffmpeg-installer',
        platform,
        'ffmpeg',
      )
    if (path.dirname(dir) === dir) return null
  }
}

/**
 * A full ffmpeg (overlay filter + libvpx): FFMPEG_PATH, then the project's
 * `@ffmpeg-installer/ffmpeg`, then `ffmpeg` on PATH. Playwright's bundled ffmpeg has no filters.
 */
export function findFfmpeg() {
  const candidates = []
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH)
  try {
    const installer = fromProject('@ffmpeg-installer/ffmpeg')
    if (installer?.path) candidates.push(installer.path)
  } catch {}
  const pnpm = pnpmFfmpeg()
  if (pnpm) candidates.push(pnpm)
  candidates.push('ffmpeg')
  const bin = candidates.find(
    (c) => (c === 'ffmpeg' || fs.existsSync(c)) && hasOverlay(c),
  )
  if (bin) return bin
  console.error(
    'ไม่พบ ffmpeg ที่มี overlay filter + libvpx — ติดตั้ง ffmpeg (brew install ffmpeg) หรือตั้ง FFMPEG_PATH',
  )
  process.exit(1)
}
