/**
 * Pure helpers behind evidence-report.mjs: turn the evidence.json files a run wrote into report
 * cases, and complete them 1:1 against the sheet with a plan file (every Test Step gets a row,
 * cases that never ran still appear, each case carries its reason).
 *
 * plan.json:
 * {
 *   "cases": [{
 *     "id": "TC-HOME-001", "title": "…", "pre": "…", "data": "…", "source": "ชีต … แท็บ …",
 *     "status": "Blocked",            // only for cases that did not run: "Blocked" | "Not Run" (default)
 *     "reason": "…", "notes": "…", "testData": "…",
 *     "steps": [{ "n": 1, "step": "…", "expected": "…" }]   // every Test Step of the sheet; "" or "—" = no Expected
 *   }]
 * }
 */

const NO_EXPECTED = new Set(['', '-', '—'])

export const mark = (ok) => (ok === true ? '✓' : ok === 'pending' ? '⏸' : '✗')

export const checksLine = (checks = []) =>
  checks.map((c) => `${mark(c.ok)} ${c.label}: ${c.got}`).join(' · ')

const hasExpected = (expected) =>
  expected != null && !NO_EXPECTED.has(String(expected).trim())

/** One evidence.json → one report case. `shot` is the path the report will serve the screenshot from. */
export function caseFromEvidence(evidence, shot = (c, s) => s.shot) {
  const steps = [...evidence.steps]
    .sort((a, b) => a.n - b.n)
    .map((s) => ({
      ...s,
      shot: shot(evidence, s),
      at: Math.round(s.at * 1000) / 1000,
      actual: checksLine(s.checks),
    }))
  return {
    id: evidence.id,
    title: evidence.title,
    pre: evidence.pre,
    data: evidence.data,
    source: evidence.source,
    runAt: evidence.runAt,
    status: steps.every((s) => s.status === 'pass') ? 'Pass' : 'Fail',
    reason: evidence.reason ?? null,
    notes: evidence.notes ?? null,
    testData: evidence.testData ?? null,
    video: null,
    steps,
  }
}

function completeSteps(run, planned) {
  const byN = new Map(run.steps.map((s) => [s.n, s]))
  const failedAt = run.steps.find((s) => s.status === 'fail')?.n
  const rows = planned.map((p) => {
    const got = byN.get(p.n)
    if (got) return got
    const expected = hasExpected(p.expected) ? p.expected : null
    if (failedAt != null && p.n > failedAt)
      return {
        n: p.n,
        step: p.step,
        expected,
        status: 'not-run',
        actual: `ไม่ได้ตรวจ — เคสหยุดที่ขั้นตอนที่ ${failedAt}`,
      }
    if (!expected)
      return {
        n: p.n,
        step: p.step,
        expected,
        status: 'info',
        actual: 'ทำตามขั้นตอนแล้ว',
      }
    return {
      n: p.n,
      step: p.step,
      expected,
      status: 'not-run',
      actual: 'ไม่ได้ตรวจในรอบรันนี้',
    }
  })
  // Evidence for a step the plan does not list still belongs in the report.
  for (const s of run.steps)
    if (!planned.some((p) => p.n === s.n)) rows.push(s)
  return rows.sort((a, b) => a.n - b.n)
}

/**
 * Completes `cases` (from caseFromEvidence) against the plan. Returns the merged cases and
 * warnings worth showing before the report is sent.
 */
export function mergePlan(cases, plan) {
  const warnings = []
  const ran = new Map(cases.map((c) => [c.id, c]))
  const merged = []

  for (const p of plan.cases ?? []) {
    const planned = p.steps ?? []
    const run = ran.get(p.id)
    ran.delete(p.id)
    if (!run) {
      merged.push({
        id: p.id,
        title: p.title ?? '',
        pre: p.pre ?? '',
        data: p.data ?? '',
        source: p.source ?? '',
        runAt: null,
        status: p.status ?? 'Not Run',
        reason: p.reason ?? null,
        notes: p.notes ?? null,
        testData: p.testData ?? null,
        video: null,
        steps: planned.map((s) => ({
          n: s.n,
          step: s.step,
          expected: hasExpected(s.expected) ? s.expected : null,
          status: 'not-run',
          actual: 'ไม่ได้รัน',
        })),
      })
      if (!p.reason) warnings.push(`${p.id}: ไม่ได้รัน แต่ไม่มี reason`)
      continue
    }
    const steps = planned.length ? completeSteps(run, planned) : run.steps
    const c = {
      ...run,
      title: p.title ?? run.title,
      pre: p.pre ?? run.pre,
      data: p.data ?? run.data,
      source: p.source ?? run.source,
      reason: p.reason ?? run.reason,
      notes: p.notes ?? run.notes,
      testData: p.testData ?? run.testData,
      steps,
    }
    if (!c.reason) warnings.push(`${c.id}: ไม่มี reason`)
    if (c.status === 'Pass' && steps.some((s) => s.status === 'not-run'))
      warnings.push(
        `${c.id}: ทุกเช็กผ่าน แต่มีขั้นตอนที่ไม่ได้ตรวจ — ตรวจว่า spec record ครบทุก Step`,
      )
    merged.push(c)
  }

  for (const c of ran.values()) {
    warnings.push(`${c.id}: มีผลรัน แต่ไม่อยู่ใน plan`)
    merged.push(c)
  }
  return {
    cases: merged.sort((a, b) => a.id.localeCompare(b.id)),
    warnings,
  }
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

/** Fills template.html with the report data. */
export function renderPage(template, opts, data) {
  return template
    .replace('{{TITLE}}', esc(opts.title ?? 'ผลทดสอบ'))
    .replace('{{EYEBROW}}', esc(opts.eyebrow ?? ''))
    .replace('{{HEADING}}', esc(opts.heading ?? 'ผลทดสอบ'))
    .replace('{{DATA}}', () => JSON.stringify(data).replace(/<\//g, '<\\/'))
}
