import fs from 'node:fs'
import type { Page, TestInfo } from '@playwright/test'

/** One observed fact behind an Expected Result: what was checked and what the screen showed. */
export type EvidenceCheck = { label: string; ok: boolean; got: string }

/** The run list's own text for the case, copied from the sheet, shown beside the result. */
export type EvidenceCase = {
  /** Precondition, as in the sheet. */
  pre: string
  /** Test Data, as in the sheet. */
  data: string
  /** Where the Step / Expected text was copied from, e.g. the sheet and tab. */
  source: string
  /** The Test Data this run actually used, when the sheet leaves it open. */
  testData?: string
  /** Anything a reader needs to weigh the result, e.g. that the data was mocked. */
  notes?: string
}

export type EvidenceStepInput = {
  /** Test Step text, as in the sheet (without its number). */
  step: string
  /** Expected Result text, as in the sheet (without its number). */
  expected: string
  checks: EvidenceCheck[]
}

type EvidenceStep = EvidenceStepInput & {
  n: number
  /** Seconds into the clip; the video starts with the page, just before the test body. */
  at: number
  status: 'pass' | 'fail'
  shot: string
  /** Path and query of the page when the Expected Result was checked. */
  url: string
}

export const EVIDENCE_FILE = 'evidence.json'

const startedAt = new WeakMap<TestInfo, number>()

/**
 * Collects a case's evidence for the 1:1 result page and the panel burned into its clip
 * (tc-to-e2e `scripts/evidence-report.mjs`): per Test Step, the sheet's Step and Expected text, the
 * checks with what the screen showed, a screenshot, the URL and the clip time. Written as
 * `evidence.json` + `step-N.png` beside the test's other output.
 *
 * Only active when the run records video (`E2E_VIDEO`, see clip-use.ts) — the page is built around the clip.
 * Record BEFORE asserting, so a failing step still carries what the screen showed:
 *
 *   const at = evidence.now()                // when the Test Step starts
 *   ...read the screen...
 *   await evidence.record(1, at, { step, expected, checks })
 *   await expect(...)
 */
export class StepEvidence {
  private readonly enabled = Boolean(process.env.E2E_VIDEO)

  constructor(
    private readonly page: Page,
    private readonly info: TestInfo,
    private readonly testCase: EvidenceCase,
  ) {
    if (!startedAt.has(info)) startedAt.set(info, Date.now())
  }

  /** Seconds since the test started — call when a Test Step begins. */
  now(): number {
    return (Date.now() - (startedAt.get(this.info) ?? Date.now())) / 1000
  }

  async record(n: number, at: number, input: EvidenceStepInput): Promise<void> {
    if (!this.enabled) return
    const shot = `step-${n}.png`
    await this.page.screenshot({ path: this.info.outputPath(shot) })
    const { pathname, search } = new URL(this.page.url())

    const file = this.info.outputPath(EVIDENCE_FILE)
    const steps: EvidenceStep[] = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8')).steps
      : []
    steps.push({
      ...input,
      n,
      at,
      status: input.checks.every((check) => check.ok) ? 'pass' : 'fail',
      shot,
      url: `${pathname}${search}`,
    })

    // The test title leads with its TC id: "TC-HOME-003 แสดงเมนูหลักครบ".
    const [, id = this.info.title, title = this.info.title] =
      /^(\S+)\s+(.*)$/.exec(this.info.title) ?? []
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          id,
          title,
          ...this.testCase,
          runAt: new Date(Date.now() - this.now() * 1000).toISOString(),
          steps,
        },
        null,
        2,
      ),
    )
  }
}
