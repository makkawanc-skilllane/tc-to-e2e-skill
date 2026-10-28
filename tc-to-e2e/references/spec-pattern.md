# รูปแบบ spec (1:1 กับชีต)

ตัวอย่างเต็มอยู่ที่ `assets/example.spec.ts`

## โครง

```
test('<TC-ID> <Test Title>')
  test.step('เงื่อนไขก่อนทดสอบ: <Precondition>')
  test.step('1. <Test Step 1 ตรงตัว>')
    test.step('ผลที่คาดหวัง 1: <Expected 1 ตรงตัว>')   ← assertion ของข้อนี้อยู่ตรงนี้
  test.step('2. <Test Step 2 ตรงตัว>')
    test.step('ผลที่คาดหวัง 2: …')
```

- เก็บข้อความ Step / Expected / Precondition / Test Data ของชีตเป็นค่าคงที่ใน spec **แบบตรงตัว** เพราะรายงานและแผงในคลิปจะแสดงข้อความนี้
- Test Step ที่ชีตไม่มี Expected ("—") ไม่ต้องมี step ย่อย และไม่ต้อง record
  (รายงานจะแสดงเป็น "บันทึก" เพราะ plan.json ระบุไว้)

## StepEvidence

```ts
const evidence = new StepEvidence(page, testInfo, { pre, data, source, notes })
const at = evidence.now()                         // ตอน Test Step เริ่ม
// …ทำตาม step แล้วอ่านค่าจากหน้าจอ…
await evidence.record(n, at, { step, expected, checks: [{ label, ok, got }] })
await expect(...)                                 // assert หลัง record เสมอ
```

- `got` คือ**ค่าที่หน้าจอแสดงจริง** ไม่ใช่ค่าที่คาดไว้ ตัวอย่างที่ถูกคือ `got: '3 วิชา'` ส่วน `got: 'ตรงตามที่คาด'` ใช้ไม่ได้
- 1 Expected มีได้หลาย check
- ถ้าต้องรอให้หน้าจอนิ่งก่อนจึงจะอ่านค่าได้ ให้ assert ก่อนใน `try` แล้ว record ทั้งใน `catch` และหลัง `try` จากนั้น throw error เดิมซ้ำ
- `StepEvidence` ทำงานเฉพาะตอนมี `E2E_VIDEO` และเขียน `evidence.json` กับ `step-N.png` ไว้ในโฟลเดอร์ผลของ test

## mock

- mock เฉพาะ state ที่ขึ้นกับเวลา หรือข้อมูลที่สร้างบน env ไม่ได้ โดยใช้ `page.route` (เฉพาะ API ของส่วนนั้น) + `page.clock`
- ใส่ `notes` ของเคสว่าผลนี้ยืนยันได้เฉพาะการแสดงผล
- ส่วนที่ต้องเทียบกับข้อมูลจริง (เช่นเทียบกับตารางที่ผู้ใช้ตั้งไว้) **ห้าม mock**

## precondition ทำไม่ได้

```ts
test.fixme(true, 'ไม่มีบัญชีที่มีห้องสอบในภาคเรียนนี้ — คำถาม BA ข้อ 12')
```

แล้วใส่เคสนั้นใน plan.json ด้วย `status: "Not Run"` (ไม่มีข้อมูลหรือบัญชี) หรือ `"Blocked"` (ฟีเจอร์ยังไม่พัฒนา)

## convention

ทำตาม `TC_TO_E2E.md` และคู่มือของโปรเจกต์ ถ้าไม่ได้ระบุไว้ ให้ใช้ค่าเริ่มต้นต่อไปนี้:
- POM ไม่มี assertion
- เลือก locator ตามลำดับ `getByTestId` → `getByRole` → `getByLabel` → `locator()`
- ห้ามใช้ `waitForTimeout`
- ห้ามฝังรหัสผ่านใน spec
