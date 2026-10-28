# TC_TO_E2E — ค่าของโปรเจกต์สำหรับสกิล tc-to-e2e

> วางไฟล์นี้ไว้ที่ root ของโปรเจกต์ e2e (โฟลเดอร์ที่มี `playwright.config.*`) แล้ว commit ให้ทีมใช้ร่วมกัน
> สกิลจะอ่านไฟล์นี้ทุกครั้งก่อนเริ่ม ค่าที่ว่างไว้สกิลจะถามคุณ
> **ห้ามใส่รหัสผ่านหรือ token** ให้ใส่แค่ชื่อตัวแปร env ที่เก็บค่านั้น

## โปรเจกต์

| หัวข้อ | ค่า |
|---|---|
| โฟลเดอร์ e2e | `packages/e2e` |
| คู่มือที่ต้องอ่านก่อน | `AGENTS.md`, `CONTRIBUTING.md` |
| import `test` จาก | `@playwright/test` หรือ `shared/fixtures/<role>.fixture.ts` |
| โฟลเดอร์ POM | `shared/page-object-model/<role>/` (POM ไม่มี assertion) |
| ข้อความ UI | `shared/translation/` (ห้ามพิมพ์ข้อความในสเปกตรง ๆ) |
| ค่า timeout | `TIMEOUTS` จาก `shared/consts/timeouts.ts` |
| วาง `step-evidence.ts`, `clip-use.ts` ไว้ที่ | `shared/utils/` |
| เวลา/ภาษา ของคลิป | `{ timezoneId: 'Asia/Bangkok', locale: 'th-TH' }` |
| ตัวอย่าง spec ที่ทำครบแล้ว | `tests/<role>/<feature>/<name>.spec.ts` |
| lint / typecheck ก่อนรัน | `npx tsc --noEmit` · `npx biome check <files>` |

## โค้ดหน้าจริง (ไว้ดู test id, ข้อความ, API)

| หัวข้อ | ค่า |
|---|---|
| repo / package | `packages/web` |
| branch ที่ใช้ดู | `origin/main` (ดูด้วย `git show <branch>:<path>` ไม่ต้อง checkout) |
| ข้อความ i18n | `src/i18n/th/*.ts` |
| API contract | `libs/contracts` |

## Env

| env | URL ตัวแปร | ค่า | ค่าเริ่มต้น? |
|---|---|---|---|
| staging | `BASE_URL` | `https://staging.example.com` | ✓ |

- auth: `<คำสั่ง setup ที่ login ครั้งเดียวแล้วบันทึก storage state เช่น E2E_AUTH_ROLES=<ROLE> pnpm test:setup>`
- บัญชีทดสอบต่อบทบาท: `<บทบาท → ชื่อบัญชี (ไม่ใส่รหัส)>`
- session อยู่ได้ประมาณ: `1 ชม.`

## รัน

```sh
E2E_VIDEO=all npx playwright test <spec> --project=<project> --workers=1 --retries=0
```

- โฟลเดอร์ผลรัน: `test-results/` (ใส่เป็นอาร์กิวเมนต์ของ evidence-report.mjs)
- คำสั่งที่ห้ามใช้: `--reporter=line` อย่างเดียว (ไม่ได้รายงานกับคลิป)

## ชีต TC

| คอลัมน์ | ชื่อในชีต |
|---|---|
| รหัส TC | `TC ID` |
| ชื่อเคส | `Test Title` |
| Precondition | `Precondition` |
| Test Data | `Test Data` |
| Test Step / Expected | `Test Step` / `Expected Result` (แยกบรรทัดด้วยเลข 1., 2., …) |
| เลือกแถว automation | `Automation status` = `Auto Candidate` |
| อ้าง Figma | `Comments` / `Notes` |
| ผลรัน | `Test Status` (`PASSED` / `FAILED` / `BLOCKED` / `NOT RUN`) |
| ลิงก์ผล | `Test Result Link` (หลายลิงก์ ขึ้นบรรทัดใหม่ในช่องเดียว) |

## บั๊กและคำถาม

| หัวข้อ | ค่า |
|---|---|
| ที่เก็บไฟล์บั๊ก | `bugs/<batch>/BUG-xx <ชื่อสั้น>.md` (เลขต่อจากเลขล่าสุด) |
| ระบบตั๋ว | Jira project `PROJ` |
| ส่งคำถามถึง | ชีต `คำถามถึง BA` (ชื่อผู้รับ: `<ชื่อ>`) |
| คำที่ห้ามใช้ | `<เช่น ห้ามเรียกผู้รับว่า PO>` |
| prefix ข้อมูลที่ automation สร้าง | `[QA-AUTO]` |

## ส่งผล

- เผยแพร่: `claude.ai artifact 1 อันต่อแท็บ` หรือ `<Drive/โฟลเดอร์ที่ทีมใช้>`
- ตัวอย่างรายงานที่ส่งแล้ว: `<ลิงก์>`

## กฎเพิ่มของโปรเจกต์

- `<กฎที่ผ่านมาเคยพลาด เช่น ไฟล์ที่ห้ามแก้, บัญชีที่ห้าม login ซ้ำ>`
