#!/usr/bin/env node
/**
 * Splits an evidence report (`evidence-report.mjs` → index.html) into one
 * self-contained HTML per TC: same page, only that case, its screenshots and burned-in
 * clip inlined as data: URIs — a file that can be attached or sent on its own.
 *
 *   node ~/.claude/skills/tc-to-e2e/scripts/evidence-report-per-tc.mjs evidence-home \
 *     [--out <dir>] [--status Fail] [TC-HOME-002 …]
 *
 * --out     where the files go (default <report>/per-tc)
 * --status  only cases with this status (Pass / Fail / Blocked / Not Run)
 * ids       only these cases; none = every case
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opts = { ids: [] }
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) opts[args[i].slice(2)] = args[++i]
  else if (!opts.report) opts.report = args[i]
  else opts.ids.push(args[i])
}
if (!opts.report) {
  console.error(
    'usage: evidence-report-per-tc.mjs <report dir> [--out <dir>] [--status <s>] [TC id…]',
  )
  process.exit(2)
}

const report = path.resolve(opts.report)
const out = path.resolve(opts.out ?? path.join(report, 'per-tc'))
const html = fs.readFileSync(path.join(report, 'index.html'), 'utf8')
const DATA =
  /(<script id="data" type="application\/json">)([\s\S]*?)(<\/script>)/
const match = DATA.exec(html)
if (!match) throw new Error(`no data block in ${report}/index.html`)
const data = JSON.parse(match[2].replace(/<\\\//g, '</'))

const MIME = {
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}
const inline = (rel) =>
  `data:${MIME[path.extname(rel)] ?? 'application/octet-stream'};base64,${fs
    .readFileSync(path.join(report, rel))
    .toString('base64')}`

fs.mkdirSync(out, { recursive: true })
const picked = data.cases.filter(
  (c) =>
    (!opts.ids.length || opts.ids.includes(c.id)) &&
    (!opts.status || c.status === opts.status),
)
if (!picked.length) {
  console.error('no case matched')
  process.exit(1)
}
for (const original of picked) {
  const c = structuredClone(original)
  if (c.video) c.video = inline(c.video)
  for (const s of c.steps) if (s.shot) s.shot = inline(s.shot)
  const json = JSON.stringify({ ...data, cases: [c] }).replace(/<\//g, '<\\/')
  const page = html
    .replace(DATA, (_, open, _body, close) => `${open}${json}${close}`)
    .replace(/<title>[^<]*<\/title>/, `<title>${c.id}</title>`)
  const file = path.join(out, `${c.id}.html`)
  fs.writeFileSync(file, page)
  console.log(
    `${c.id}: ${c.status} · ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`,
  )
}
