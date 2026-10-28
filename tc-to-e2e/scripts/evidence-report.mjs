#!/usr/bin/env node
/**
 * Builds the 1:1 evidence page (Test Step ↔ Expected ↔ Actual ↔ screenshot ↔ clip) from the
 * `evidence.json` files that `StepEvidence` (assets/step-evidence.ts) writes, and burns a
 * caption panel into each clip: TC id + title, "Step n/N", then Step / Expected / Actual / URL,
 * switching at each Test Step's start.
 *
 * Run from the e2e project folder (playwright is resolved from there):
 *
 *   node ~/.claude/skills/tc-to-e2e/scripts/evidence-report.mjs --out evidence-home \
 *     --plan plan.json --heading 'ผลทดสอบแท็บ "หน้าแรก"' --eyebrow 'PROJ-12 · Home' \
 *     --env 'staging · app.example.com' --account 'ครู demo.teacher' \
 *     test-results-home [more test-results dirs…]
 *
 * --plan      sheet's cases and steps; completes the report 1:1 (see evidence-report/merge.mjs)
 * --timezone  for the run date shown (default Asia/Bangkok)
 * --title --eyebrow --heading --env --account --browser --source   page text
 *
 * The output folder (index.html + videos/ + shots/) is what gets published.
 * Clips need a FULL ffmpeg (overlay + libvpx), see lib/resolve.mjs.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  caseFromEvidence,
  checksLine,
  mergePlan,
  renderPage,
} from './evidence-report/merge.mjs'
import { findFfmpeg, loadChromium } from './lib/resolve.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE = path.join(HERE, 'evidence-report', 'template.html')

function parseArgs(argv) {
  const opts = { dirs: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) opts[arg.slice(2)] = argv[++i]
    else opts.dirs.push(arg)
  }
  if (!opts.out || (opts.dirs.length === 0 && !opts.plan)) {
    console.error(
      'usage: evidence-report.mjs --out <dir> [--plan plan.json] [--heading …] <test-results dir>…',
    )
    process.exit(2)
  }
  return opts
}

function findEvidence(dir) {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...findEvidence(full))
    else if (entry.name === 'evidence.json') found.push(dir)
  }
  return found
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

const PILL = {
  pass: ['ผ่าน', '#1f9d55'],
  fail: ['ไม่ผ่าน', '#d64545'],
  pending: ['Blocked', '#c9831f'],
}

const PANEL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&family=IBM+Plex+Mono:wght@400&display=swap');
html,body{margin:0;background:transparent}
#p{width:1920px;box-sizing:border-box;padding:14px 28px 16px;background:#141926;color:#f2f4f8;font:21px/1.45 'IBM Plex Sans Thai',sans-serif;display:grid;gap:4px}
.top{display:flex;align-items:center;gap:14px;margin-bottom:4px}
.id{color:#7cc4ff;font-weight:700;font-size:23px}
.t{font-size:23px;flex:1}
.step{background:#2c3448;border-radius:999px;padding:2px 16px;font-size:20px;color:#e4e8f3}
.row{display:grid;grid-template-columns:150px 1fr;gap:12px}
.row b{color:#9aa4bf;font-weight:600}
.row i{font-style:normal;font-weight:600;color:#fff;border-radius:999px;padding:1px 14px;margin-right:6px}
.mono{font-family:'IBM Plex Mono',monospace;color:#9aa4bf}`

function panelHtml(c, s, total) {
  const [word, color] = PILL[s.status] ?? PILL.pending
  return `<style>${PANEL_CSS}</style><div id="p">
  <div class="top"><span class="id">${esc(c.id)}</span><span class="t">${esc(c.title)}</span><span class="step">Step ${s.n}/${total}</span></div>
  <div class="row"><b>Step</b><span>${esc(s.step)}</span></div>
  <div class="row"><b>Expected</b><span>${esc(s.expected ?? '—')}</span></div>
  <div class="row"><b>Actual</b><span><i style="background:${color}">${word}</i> ${esc(checksLine(s.checks))}</span></div>
  <div class="row"><b>URL</b><span class="mono">${esc(s.url)}</span></div>
</div>`
}

/** Burns one panel per Test Step into the clip; step 1's shows from the start. */
async function burnPanels(page, ffmpeg, c, input, output, scratch) {
  const steps = [...c.steps].sort((a, b) => a.n - b.n)
  const pngs = []
  for (const s of steps) {
    await page.setContent(panelHtml(c, s, steps.length), {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => document.fonts.ready)
    const file = path.join(scratch, `${c.id}-panel-${s.n}.png`)
    await page.locator('#p').screenshot({ path: file, omitBackground: true })
    pngs.push(file)
  }
  let chain = '[0:v]'
  const filters = steps.map((s, i) => {
    const from = i === 0 ? 0 : s.at
    const to = i + 1 < steps.length ? steps[i + 1].at : 1e6
    const out = i === steps.length - 1 ? '[v]' : `[v${i}]`
    const f = `${chain}[${i + 1}:v]overlay=0:H-h:enable='between(t,${from.toFixed(3)},${to.toFixed(3)})'${out}`
    chain = out
    return f
  })
  execFileSync(ffmpeg, [
    '-y',
    '-loglevel',
    'error',
    '-i',
    input,
    ...pngs.flatMap((p) => ['-i', p]),
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[v]',
    '-c:v',
    'libvpx',
    '-b:v',
    '3M',
    '-crf',
    '8',
    '-auto-alt-ref',
    '0',
    '-an',
    output,
  ])
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const out = path.resolve(opts.out)
  const scratch = path.join(out, '.panels')
  for (const sub of ['videos', 'shots', '.panels'])
    fs.mkdirSync(path.join(out, sub), { recursive: true })

  const caseDirs = opts.dirs.flatMap((dir) => findEvidence(path.resolve(dir)))
  const withClip = caseDirs.some((dir) =>
    fs.existsSync(path.join(dir, 'video.webm')),
  )
  const ffmpeg = withClip ? findFfmpeg() : null
  const chromium = withClip ? await loadChromium() : null
  const browser = withClip ? await chromium.launch() : null
  const page = browser
    ? await browser.newPage({ viewport: { width: 1920, height: 400 } })
    : null

  let cases = []
  for (const dir of caseDirs) {
    const evidence = JSON.parse(
      fs.readFileSync(path.join(dir, 'evidence.json'), 'utf8'),
    )
    const c = caseFromEvidence(evidence, (e, s) => `shots/${e.id}-s${s.n}.png`)
    for (const s of evidence.steps)
      fs.copyFileSync(
        path.join(dir, s.shot),
        path.join(out, `shots/${evidence.id}-s${s.n}.png`),
      )
    const clip = path.join(dir, 'video.webm')
    if (fs.existsSync(clip)) {
      c.video = `videos/${c.id}.webm`
      await burnPanels(page, ffmpeg, c, clip, path.join(out, c.video), scratch)
    }
    cases.push(c)
    console.log(
      `${c.id}: ${c.status} · ${c.steps.length} step(s)${c.video ? ' · clip burned' : ''}`,
    )
  }
  await browser?.close()
  fs.rmSync(scratch, { recursive: true, force: true })

  if (opts.plan) {
    const plan = JSON.parse(fs.readFileSync(path.resolve(opts.plan), 'utf8'))
    const merged = mergePlan(cases, plan)
    cases = merged.cases
    for (const w of merged.warnings) console.warn(`⚠️  ${w}`)
  } else {
    cases.sort((a, b) => a.id.localeCompare(b.id))
    console.warn(
      '⚠️  ไม่ได้ใส่ --plan: รายงานมีเฉพาะขั้นที่ record ไว้ ยังไม่ครบ 1:1 กับชีต',
    )
  }

  const data = {
    meta: {
      env: opts.env ?? '',
      account: opts.account ?? '',
      browser: opts.browser ?? 'Chromium (Playwright) · หน้าจอ 1920×1080',
      date: new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
        timeZone: opts.timezone ?? 'Asia/Bangkok',
      }).format(new Date()),
      source: opts.source ?? cases[0]?.source ?? '',
    },
    cases,
  }
  fs.writeFileSync(
    path.join(out, 'index.html'),
    renderPage(fs.readFileSync(TEMPLATE, 'utf8'), opts, data),
  )
  console.log(`📄 ${path.join(out, 'index.html')} (${cases.length} เคส)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
