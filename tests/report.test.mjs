import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  caseFromEvidence,
  mergePlan,
  renderPage,
} from '../tc-to-e2e/scripts/evidence-report/merge.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPTS = path.join(ROOT, 'tc-to-e2e/scripts')
const plan = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'examples/plan.example.json'), 'utf8'),
)

const evidence = (steps) => ({
  id: 'TC-HOME-001',
  title: 'เมนูหลักพาไปหน้าวิชาของฉัน',
  pre: 'ล็อกอินเป็นครู',
  data: '-',
  source: 'ชีต',
  runAt: '2026-10-28T03:00:00.000Z',
  steps,
})
const step = (n, ok) => ({
  n,
  step: `ขั้น ${n}`,
  expected: `ผล ${n}`,
  checks: [{ label: 'ค่า', ok, got: ok ? 'ตรง' : 'ไม่ตรง' }],
  at: n * 1.23456,
  status: ok ? 'pass' : 'fail',
  shot: `step-${n}.png`,
  url: '/home',
})

test('caseFromEvidence: Pass only when every step passes, actual lists the checks', () => {
  const pass = caseFromEvidence(evidence([step(2, true), step(1, true)]))
  assert.equal(pass.status, 'Pass')
  assert.deepEqual(
    pass.steps.map((s) => s.n),
    [1, 2],
  )
  assert.equal(pass.steps[0].at, 1.235)
  assert.equal(pass.steps[0].actual, '✓ ค่า: ตรง')
  assert.equal(
    caseFromEvidence(evidence([step(1, true), step(2, false)])).status,
    'Fail',
  )
})

test('mergePlan: rows with no Expected become info, the rest of a passing case stays', () => {
  const run = caseFromEvidence(evidence([step(1, true), step(2, true)]))
  const { cases, warnings } = mergePlan([run], plan)
  const home = cases.find((c) => c.id === 'TC-HOME-001')
  assert.equal(home.status, 'Pass')
  assert.equal(home.reason, plan.cases[0].reason)
  assert.deepEqual(
    home.steps.map((s) => s.status),
    ['pass', 'pass', 'info'],
  )
  assert.equal(home.steps[2].expected, null)
  assert.deepEqual(warnings, [])
})

test('mergePlan: steps after the failing one are not-run with where it stopped', () => {
  const run = caseFromEvidence(evidence([step(1, false)]))
  const { cases } = mergePlan([run], plan)
  const home = cases.find((c) => c.id === 'TC-HOME-001')
  assert.equal(home.status, 'Fail')
  assert.deepEqual(
    home.steps.map((s) => [s.status, s.actual]),
    [
      ['fail', '✗ ค่า: ไม่ตรง'],
      ['not-run', 'ไม่ได้ตรวจ — เคสหยุดที่ขั้นตอนที่ 1'],
      ['not-run', 'ไม่ได้ตรวจ — เคสหยุดที่ขั้นตอนที่ 1'],
    ],
  )
})

test('mergePlan: a planned case that never ran keeps its status and every step', () => {
  const { cases } = mergePlan([], plan)
  const blocked = cases.find((c) => c.id === 'TC-HOME-002')
  assert.equal(blocked.status, 'Blocked')
  assert.deepEqual(
    blocked.steps.map((s) => [s.status, s.actual]),
    [['not-run', 'ไม่ได้รัน']],
  )
  assert.equal(cases.find((c) => c.id === 'TC-HOME-001').status, 'Not Run')
})

test('mergePlan: warns on missing reason, unplanned runs and passes that skipped a step', () => {
  const run = caseFromEvidence(evidence([step(1, true)]))
  const other = { ...run, id: 'TC-OTHER-001' }
  const noReason = {
    cases: [
      { ...plan.cases[0], reason: undefined },
      { id: 'TC-X', steps: [] },
    ],
  }
  const { warnings } = mergePlan([run, other], noReason)
  assert.ok(warnings.some((w) => w.startsWith('TC-HOME-001: ไม่มี reason')))
  assert.ok(warnings.some((w) => w.startsWith('TC-HOME-001: ทุกเช็กผ่าน')))
  assert.ok(warnings.some((w) => w.startsWith('TC-X: ไม่ได้รัน')))
  assert.ok(warnings.some((w) => w.startsWith('TC-OTHER-001: มีผลรัน')))
})

test('renderPage + per-tc split: data survives a "</script>" in sheet text, one file per case', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-to-e2e-'))
  const { cases } = mergePlan([], plan)
  cases[0].title = 'มี </script> ในชื่อ'
  const template = fs.readFileSync(
    path.join(SCRIPTS, 'evidence-report/template.html'),
    'utf8',
  )
  const html = renderPage(
    template,
    { title: 'ผล <ทดสอบ>', heading: 'h' },
    { meta: {}, cases },
  )
  assert.ok(html.includes('<title>ผล &lt;ทดสอบ&gt;</title>'))
  assert.ok(!/\{\{(TITLE|EYEBROW|HEADING|DATA)\}\}/.test(html))
  fs.writeFileSync(path.join(dir, 'index.html'), html)

  execFileSync(
    process.execPath,
    [path.join(SCRIPTS, 'evidence-report-per-tc.mjs'), dir],
    { stdio: 'pipe' },
  )
  const files = fs.readdirSync(path.join(dir, 'per-tc')).sort()
  assert.deepEqual(files, ['TC-HOME-001.html', 'TC-HOME-002.html'])
  const one = fs.readFileSync(path.join(dir, 'per-tc/TC-HOME-001.html'), 'utf8')
  const data = JSON.parse(
    /<script id="data" type="application\/json">([\s\S]*?)<\/script>/
      .exec(one)[1]
      .replace(/<\\\//g, '</'),
  )
  assert.equal(data.cases.length, 1)
  assert.equal(data.cases[0].title, 'มี </script> ในชื่อ')
})

test('the published skill carries no project-specific names', () => {
  const banned = /ndlp|dev2|petsri|montacha|TC-REV|DEV2-/i
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name)
      return e.isDirectory() ? walk(p) : [p]
    })
  for (const file of [
    ...walk(path.join(ROOT, 'tc-to-e2e')),
    ...walk(path.join(ROOT, 'examples')),
    path.join(ROOT, 'README.md'),
  ])
    assert.ok(
      !banned.test(fs.readFileSync(file, 'utf8')),
      `${path.relative(ROOT, file)} มีชื่อเฉพาะโปรเจกต์`,
    )
})
