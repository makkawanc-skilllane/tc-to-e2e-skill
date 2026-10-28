---
name: tc-to-e2e
description: Turn manual test cases from a Google Sheet / Excel into Playwright E2E specs (1 TC = 1 test, sheet text verbatim), cross-checked against Figma frames, the ticket and the app's real code, then run them and deliver a 1:1 Step / Expected / Actual evidence report with 1920×1080 clips that have the step panel burned in, plus bug files and questions for the BA. Use when the user gives a TC sheet/tab (often with a ticket key and Figma links) and asks to automate it, "เขียน automation จากชีต", "ทำ auto TC", "แปลง TC เป็น e2e", or to run TCs and send results with video.
---

# TC → E2E

แปลง TC จากชีตเป็น spec Playwright แบบ 1 TC = 1 test โดยเทียบกับ Figma, ตั๋ว และโค้ดจริง
จากนั้นรัน แล้วส่งรายงานหลักฐานที่เทียบ Step / Expected / Actual แบบ 1:1 พร้อมคลิป

## 0. โหลดค่าของโปรเจกต์

1. หา `TC_TO_E2E.md` ในโฟลเดอร์ e2e ของโปรเจกต์ (ที่มี `playwright.config.*`) หรือที่ root ของ repo
2. ถ้าไม่มี: คัดลอก `assets/TC_TO_E2E.template.md` ไปวางเป็น `TC_TO_E2E.md` แล้วเติมค่าเท่าที่อ่านได้จากโปรเจกต์
   (`playwright.config.*`, fixtures, โฟลเดอร์ POM, `AGENTS.md`/`CLAUDE.md`) ค่าที่เดาไม่ได้ให้ถามผู้ใช้
   **แสดงไฟล์ให้ผู้ใช้ยืนยันก่อนเริ่มงาน**
3. ค่าใน `TC_TO_E2E.md` และคู่มือของโปรเจกต์ชนะค่าเริ่มต้นในสกิลนี้เสมอ

## Input — ถามให้ครบก่อนเริ่ม

| ข้อมูล | ค่าเริ่มต้น |
|---|---|
| ลิงก์ชีต TC + ชื่อแท็บ (หรือไฟล์ .xlsx/.csv) | — (ต้องมี) |
| แถวที่เลือก | ตามคอลัมน์ automation ใน `TC_TO_E2E.md` |
| ตั๋ว | — |
| บทบาทผู้ใช้ | ดูจากชีต |
| env | env ที่ติ๊กค่าเริ่มต้นใน `TC_TO_E2E.md` |

## 1. อ่านก่อนลงมือ

- คู่มือที่ `TC_TO_E2E.md` ระบุ และ spec ตัวอย่างที่ทำครบแล้ว
- โค้ดหน้าจริงด้วย `git show <branch>:<path>` (ไม่ต้อง checkout): test id, ข้อความ i18n, API contract
  **ก่อน**เขียน locator หรือข้อความ
- ถ้าโปรเจกต์ยังไม่มี `step-evidence.ts` / `clip-use.ts` ให้คัดลอกจาก `assets/` ไปวางตามที่ config ระบุ

## 2. Figma — ต้องดูก่อนเขียนเคส

รายละเอียด: [references/figma-crosscheck.md](references/figma-crosscheck.md)

- หา frame ที่ TC อ้างถึง ถ้าเปิด Figma ไม่ได้ ให้ขอ PNG จากผู้ใช้โดย**แนบลิงก์ frame เต็ม** แล้ว**หยุดรอ**
  ห้ามเดาจากชื่อ frame
- เทียบ 4 แหล่ง (ชีต ↔ ตั๋ว ↔ Figma ↔ โค้ด) แล้วจดเป็นตาราง **assert ตาม Expected ในชีตเสมอ**
  ถ้าแหล่งอื่นไม่ตรงกัน ให้ตั้งเป็นคำถาม ยังไม่ต้องเปิดบั๊ก

## 3. เขียน spec

รายละเอียดและตัวอย่าง: [references/spec-pattern.md](references/spec-pattern.md), `assets/example.spec.ts`

- 1 `test()` = 1 TC ชื่อ `"<TC-ID> <Test Title>"` · Precondition เป็น step แรก
- 1 `test.step` = 1 Test Step (ข้อความชีตตรงตัว) โดยข้างในมี 1 `test.step` ต่อ 1 Expected
- `StepEvidence.record(...)` **ก่อน** `expect` ทุกครั้ง
- assert ตามชีตตรงตัว ถ้าโค้ดทำต่างไปก็ปล่อยให้เคสตก แล้วจดเหตุผลไว้
- mock เฉพาะ state ที่ขึ้นกับเวลา หรือข้อมูลที่สร้างไม่ได้ · precondition ทำไม่ได้ให้ใช้ `test.fixme(true, '<เหตุผล>')`
- ทำตาม convention ใน `TC_TO_E2E.md` และต้องผ่าน lint + typecheck ก่อนรัน

## 4. รัน

- **ห้ามเปิด อ่าน หรือพิมพ์ค่าในไฟล์ `.env*`** ส่งค่าผ่านตัวแปรในคำสั่งรันเท่านั้น
- **login ครั้งเดียวต่อรอบ แล้วใช้ storage state ซ้ำ** ถ้า login ไม่ผ่านให้หยุดถามผู้ใช้ ห้ามลองซ้ำ (บัญชีอาจถูกล็อก)
- ใช้คำสั่งรันจาก `TC_TO_E2E.md` และต้องเปิด `E2E_VIDEO=all` เพื่อให้ได้คลิปกับ evidence

## 5. รายงานหลักฐาน

รายละเอียด: [references/evidence-report.md](references/evidence-report.md)

1. เขียน `plan.json` จากชีต ให้มีทุก TC ที่เลือกและทุก Test Step พร้อม `reason` ต่อเคส
2. รันคำสั่งต่อไปนี้จากโฟลเดอร์ e2e:
   ```sh
   node <skill>/scripts/evidence-report.mjs --out <dir> --plan plan.json --heading … --env … --account … <test-results>
   node <skill>/scripts/evidence-report-per-tc.mjs <dir>
   ```
3. แก้ทุกคำเตือน ⚠️ ที่สคริปต์พิมพ์ออกมา
4. **ดึงเฟรมจากคลิปทุกเคสมาเปิดดูเอง** ต้องเป็น 1920×1080, แผงอ่านออก และเฟรมสุดท้ายไม่ใช่หน้าขาว ถ้าไม่ผ่านห้ามส่ง
5. เผยแพร่ตามที่ `TC_TO_E2E.md` กำหนด · **ถามผู้ใช้ก่อนเขียนผลหรือลิงก์ลงชีต**

## 6. บั๊กและคำถาม

รายละเอียด: [references/bug-report.md](references/bug-report.md)

- แยก **ยังไม่พัฒนา** / **บั๊ก** / **ต้องถาม BA** ออกจากกัน
- ไฟล์บั๊กต้องมีภาพเต็มและภาพ crop ที่ตีกรอบแดงพร้อมเลข สร้างด้วย `scripts/annotate-bug-image.mjs`
  **ห้ามใช้ PIL เขียนข้อความไทย** เพราะสระและวรรณยุกต์จะกลายเป็นกล่อง
- คำถามถึง BA ให้ส่งไปที่และใช้ถ้อยคำตามที่ `TC_TO_E2E.md` กำหนด

## ห้าม

- commit หรือ push จนกว่าผู้ใช้จะสั่ง
- แก้ `playwright.config.*` หรือไฟล์ที่ session อื่นแก้ค้างไว้โดยยังไม่ commit
- สร้างข้อมูลบน env โดยไม่ถามก่อน (ถ้าจำเป็นต้องสร้าง ให้ขึ้นต้นชื่อด้วย prefix ที่ config กำหนด)
- เปลี่ยน Expected ให้ตรงกับระบบ, ใส่ผลที่ดูด้วยตาเป็น pass, หรือตัดแถวของชีตออกเพราะไม่ได้รัน

## สรุปท้ายงาน

- ตาราง TC → Pass / Fail / Blocked / Not Run พร้อมเหตุผลสั้น ๆ
- ลิงก์รายงาน, รายการไฟล์ที่เพิ่ม/แก้, บั๊กและคำถามที่ตั้งไว้
- สิ่งที่ยังไม่ได้ทำ และสิ่งที่ยืนยันได้เฉพาะการแสดงผลเพราะใช้ mock
