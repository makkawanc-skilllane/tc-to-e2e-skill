/**
 * Shape of a spec written by tc-to-e2e: 1 test() per TC, 1 test.step per Test Step, 1 nested
 * test.step per Expected, the sheet's text kept verbatim, evidence recorded before asserting.
 * Replace the imports with the project's own fixture, POM and constants (see TC_TO_E2E.md).
 */
import { expect, test } from '@playwright/test' // ← the project's fixture file, if it has one
import { clipUse } from '../utils/clip-use'
import { StepEvidence } from '../utils/step-evidence'

test.use(clipUse({ timezoneId: 'Asia/Bangkok', locale: 'th-TH' }))

// The sheet's text, verbatim. The report and the clip panel show exactly this.
const TC_HOME_001 = {
  pre: 'ล็อกอินเป็นครู มีวิชาที่สอนอย่างน้อย 1 วิชา',
  data: '-',
  source: 'ชีต TC แท็บ "หน้าแรก"',
  steps: [
    { step: 'เปิดหน้าแรก', expected: 'แสดงหัวข้อ "หน้าแรก"' },
    { step: 'กดเมนู "วิชาของฉัน"', expected: 'ไปหน้า "วิชาของฉัน" และแสดงรายการวิชา' },
  ],
}

test('TC-HOME-001 เมนูหลักพาไปหน้าวิชาของฉัน', async ({ page }, testInfo) => {
  const { pre, data, source, steps } = TC_HOME_001
  const evidence = new StepEvidence(page, testInfo, { pre, data, source })

  await test.step(`เงื่อนไขก่อนทดสอบ: ${pre}`, async () => {
    // storage state from the project's auth setup — no login here
  })

  await test.step(`1. ${steps[0].step}`, async () => {
    const at = evidence.now()
    await page.goto('/')
    await test.step(`ผลที่คาดหวัง 1: ${steps[0].expected}`, async () => {
      const heading = page.getByRole('heading', { level: 1 })
      const text = (await heading.textContent())?.trim() ?? '(ไม่มี)'
      // Record what the screen showed BEFORE asserting, so a failure still carries it.
      await evidence.record(1, at, {
        ...steps[0],
        checks: [{ label: 'หัวข้อหน้า', ok: text === 'หน้าแรก', got: text }],
      })
      await expect(heading).toHaveText('หน้าแรก')
    })
  })

  await test.step(`2. ${steps[1].step}`, async () => {
    const at = evidence.now()
    await page.getByRole('link', { name: 'วิชาของฉัน' }).click()
    await test.step(`ผลที่คาดหวัง 2: ${steps[1].expected}`, async () => {
      const rows = page.getByTestId('course-row')
      const count = await rows.count()
      const path = new URL(page.url()).pathname
      await evidence.record(2, at, {
        ...steps[1],
        checks: [
          { label: 'URL', ok: path === '/my-courses', got: path },
          { label: 'จำนวนวิชา', ok: count > 0, got: `${count} วิชา` },
        ],
      })
      await expect(page).toHaveURL(/\/my-courses$/)
      await expect(rows.first()).toBeVisible()
    })
  })
})
