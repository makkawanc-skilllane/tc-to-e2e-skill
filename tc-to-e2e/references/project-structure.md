# โครงสร้างโปรเจกต์ Playwright E2E (ฉบับเริ่มต้น)

ไม่ผูกกับโปรเจกต์ใด ใช้เป็นแบบตั้งต้นตอนเริ่มโปรเจกต์ E2E ใหม่ หรือเทียบกับโปรเจกต์เดิมว่าขาดอะไร
ชื่อโฟลเดอร์/ไฟล์ด้านล่างสรุปมาจากโปรเจกต์ Playwright จริงที่ใช้สกิลนี้ ตัดชื่อฟีเจอร์เฉพาะโปรเจกต์ออกแล้ว
แทนที่ `<role>` ด้วยบทบาทผู้ใช้จริง (เช่น teacher, student, admin) และ `<feature>` ด้วยชื่อฟีเจอร์

## ทำไมต้องจัดแบบนี้

- สกิล tc-to-e2e และ Claude ค้นหาไฟล์ตามโครงสร้างนี้เป็นค่าเริ่มต้น ถ้าโปรเจกต์จัดต่างไป ให้ระบุ path จริงไว้ใน
  `TC_TO_E2E.md` แทนที่จะย้ายโฟลเดอร์ตามเอกสารนี้
- แยก "หน้าตาของหน้าเว็บ" (POM: หา element + กระทำ) ออกจาก "สิ่งที่ต้องเป็นจริง" (assertion ใน spec)
  ทำให้ UI เปลี่ยนแล้วแก้ locator ที่เดียว ไม่ต้องไล่แก้ spec หลายไฟล์
- login ครั้งเดียวต่อบทบาทแล้วใช้ storage state ซ้ำ กันโดน rate limit หรือเตะผู้ใช้จริงที่ใช้บัญชีเดียวกันออก

## โครงสร้างแนะนำ

```
e2e/                            ชื่อโฟลเดอร์ไม่สำคัญ ขอให้มี playwright.config.* อยู่ที่นี่
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── .env.template               รายชื่อตัวแปร env ไม่มีค่าจริง — commit ได้
├── .env                        ค่าจริง — ห้าม commit
├── auth.setup.ts               global setup: login ทีละบทบาท แล้วเซฟ storage state
├── .auth/                      storage state ต่อบทบาท (gitignore)
│   └── <role>.json
│
├── tests/                      สเปกจริง: จัดตามบทบาทก่อน แล้วตามฟีเจอร์
│   └── <role>/
│       └── <feature>/
│           └── <name>.spec.ts
│
├── shared/
│   ├── fixtures/                custom test() ที่ฉีด page ของบทบาทที่ login แล้ว
│   │   ├── <role>.fixture.ts     spec ต้อง import `test` จากตรงนี้ ไม่ใช่จาก @playwright/test
│   │   └── expect.ts             custom matcher (ถ้ามี)
│   │
│   ├── page-object-model/
│   │   ├── <role>/
│   │   │   └── <feature>.pom.ts  locator + action ของหน้านั้น ห้ามมี assertion
│   │   └── components/           ส่วนที่ใช้ซ้ำหลายหน้า เช่น navbar, modal, pagination
│   │
│   ├── types/                   type ที่ใช้ร่วมหลายไฟล์
│   ├── consts/                  ค่าคงที่ เช่น timeout, route, enum ของ UI
│   ├── translation/             ข้อความ UI กลาง — spec ห้าม hardcode ข้อความเอง
│   ├── api/                     helper เรียก API ตรง (เตรียม/ล้างข้อมูลทดสอบ)
│   └── utils/                   helper ทั่วไป (date, file, retry)
│
├── scripts/                    เครื่องมือเสริมนอก test runner เช่น seed ข้อมูล, สร้างรายงาน
└── doc/                         บันทึกที่ไม่ใช่โค้ด: ผลสำรวจ, คำถามระหว่างทำ, สรุปผลรัน
```

## กติกาที่ควรตั้งแต่ต้น (ไม่ขึ้นกับโปรเจกต์)

- locator: `getByTestId` > `getByRole` > `getByLabel` > `locator()` — ตัวหลังสุดใช้เป็นทางเลือกสุดท้ายเท่านั้น
- ห้าม `page.waitForTimeout()` ใช้ `waitForURL` หรือ auto-waiting ของ Playwright แทน
- ห้าม hardcode รหัสผ่าน/token ใช้ `process.env.X` หรือไฟล์ env รวมที่อ่านจาก env
- assertion อยู่ใน spec เท่านั้น POM ทำหน้าที่แค่หา element + กระทำ ไม่ expect ใน POM
- 1 ไฟล์ POM = 1 หน้า (หรือ 1 component ที่ใช้ร่วม) ไม่รวมหลายหน้าไว้ไฟล์เดียว
- ตั้งชื่อไฟล์บอกหน้าที่: `*.pom.ts`, `*.fixture.ts`, `*.spec.ts`

## รูปแบบ auth (login ครั้งเดียว ใช้ซ้ำ)

1. `auth.setup.ts` รันก่อน test ทั้งหมด (project แยกต่างหากใน `playwright.config.*` เช่นชื่อ `setup`)
   login ทีละบทบาทที่ต้องใช้
2. เซฟ storage state เป็น `.auth/<role>.json`
3. project อื่นที่ต้องใช้บทบาทนั้นชี้ `storageState` ไปที่ไฟล์นั้น ผ่าน fixture ใน `shared/fixtures/`
4. ห้าม login ซ้ำในแต่ละ test — ใช้ storage state ที่มีอยู่แล้วเสมอ (login ซ้ำบ่อยอาจเตะ session ผู้ใช้จริงที่ใช้บัญชีเดียวกันออก)

## เริ่มจากศูนย์ ควรทำตามลำดับนี้

1. ตั้ง `playwright.config.ts` + `.env.template` ก่อน
2. เขียน `auth.setup.ts` ให้ login ได้ 1 บทบาท แล้วเซฟ storage state
3. เขียน `shared/fixtures/<role>.fixture.ts` ฉีด page ที่ login แล้ว
4. เขียน POM ของหน้าแรกที่จะทดสอบ ใน `shared/page-object-model/<role>/`
5. เขียน spec แรกใน `tests/<role>/<feature>/` โดย import `test` จาก fixture ในข้อ 3
6. ค่อยเพิ่ม `types/`, `consts/`, `translation/`, `utils/` เมื่อมีของซ้ำเกิน 1 จุด — อย่าสร้างโฟลเดอร์ว่างไว้ล่วงหน้าทั้งหมด

## เทียบกับ TC_TO_E2E.md

ถ้าใช้สกิล tc-to-e2e ให้ใส่ path จริงของโปรเจกต์ลงตาราง "โปรเจกต์" ใน
[`TC_TO_E2E.md`](../assets/TC_TO_E2E.template.md) โครงสร้างในเอกสารนี้คือค่าเริ่มต้นที่สกิลจะเดาให้
ถ้าโปรเจกต์ยังไม่มีไฟล์นั้น
