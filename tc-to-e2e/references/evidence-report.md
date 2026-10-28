# รายงานหลักฐาน 1:1

## ได้อะไร

- `<out>/index.html`: หน้ารวม มีหัวรายงาน (Env, บัญชี, เบราว์เซอร์, วันที่, ที่มาของ TC) และตัวนับ Pass / Fail / Blocked / Not Run ที่คลิกกรองได้
  ด้านซ้ายเป็นรายการ TC ส่วนด้านขวาแสดงทีละ TC ดังนี้: กล่องเหตุผล → notes → Precondition / Test Data → คลิป + ปุ่มกระโดดไปแต่ละ Step
  → ตาราง `# | TEST STEP | EXPECTED | ACTUAL | ผล | ภาพหน้าจอ` · ลิงก์ไปที่ TC ได้ด้วย `index.html#<TC-ID>`
- `<out>/videos/*.webm`: คลิป 1920×1080 ที่ฝังแผง TC / Step n/N / Step / Expected / Actual / URL ไว้ด้านล่าง
- `<out>/per-tc/<TC-ID>.html`: หน้าเดียวกันแต่มีเคสเดียว ฝังคลิปและภาพไว้ในไฟล์ (ประมาณ 2–8 MB) แนบอีเมลหรือแชตได้ และเปิดแบบออฟไลน์ได้

## plan.json

รายงานต้องครบ 1:1 กับชีต แต่ evidence.json มีเฉพาะขั้นที่ record ไว้ plan.json จึงเป็นตัวเติมส่วนที่ขาด:

```json
{
  "cases": [
    {
      "id": "TC-HOME-001",
      "title": "เมนูหลักพาไปหน้าวิชาของฉัน",
      "pre": "…", "data": "-", "source": "ชีต … แท็บ \"หน้าแรก\"",
      "reason": "ผ่าน: เมนูพาไปหน้าวิชาและแสดง 3 วิชา",
      "steps": [
        { "n": 1, "step": "เปิดหน้าแรก", "expected": "แสดงหัวข้อ \"หน้าแรก\"" },
        { "n": 2, "step": "กดเมนู \"วิชาของฉัน\"", "expected": "ไปหน้า \"วิชาของฉัน\"" }
      ]
    },
    {
      "id": "TC-HOME-007",
      "title": "…",
      "status": "Blocked",
      "reason": "ยังไม่พัฒนา: ไม่มีปุ่ม \"ส่งออก\" ในโค้ด branch main",
      "steps": [{ "n": 1, "step": "…", "expected": "…" }]
    }
  ]
}
```

ตัวอย่างเต็มอยู่ที่ `examples/plan.example.json` ใน repo ของสกิล

### กติกาที่สคริปต์ใช้

| แถวในชีต | สถานะในรายงาน | ช่อง Actual |
|---|---|---|
| มี evidence และทุกเช็กผ่าน | `pass` ผ่าน | ✓ รายการเช็กพร้อมค่าที่หน้าจอแสดง |
| มี evidence และมีเช็กที่ไม่ผ่าน | `fail` ไม่ผ่าน | ✗ เช็กนั้นพร้อมค่าที่หน้าจอแสดง |
| ไม่มี Expected ("—") | `info` บันทึก | "ทำตามขั้นตอนแล้ว" |
| อยู่หลังขั้นที่ตก | `not-run` | "ไม่ได้ตรวจ — เคสหยุดที่ขั้นตอนที่ n" |
| เคสไม่ได้รัน (fixme) | `not-run` ทุกแถว · สถานะเคสเป็น `Blocked` / `Not Run` | "ไม่ได้รัน" |

สคริปต์จะเตือน (⚠️) ในกรณีต่อไปนี้ ต้องแก้ให้หมดก่อนส่ง:
- เคสที่ไม่มี `reason`
- เคสที่มีผลรันแต่ไม่อยู่ใน plan
- เคสที่ผ่านทุกเช็ก แต่มีขั้นที่ไม่ได้ตรวจ (แปลว่า spec record ไม่ครบ)

### reason

เขียน 1–3 บรรทัด บอกว่าผ่านหรือไม่ผ่านเพราะอะไร และจัดอยู่ในกลุ่มไหน: **บั๊ก `<เลขไฟล์บั๊ก>`** / **ยังไม่พัฒนา** / **แก้ TC** / **คำถาม BA `<ข้อ>`**
ถ้าตรวจข้อที่รอบรันไปไม่ถึงด้วยวิธีอื่น ให้เขียนไว้ใน reason ห้ามเปลี่ยนสถานะแถวเป็น `pass`

## คำสั่ง

ต้องรันจากโฟลเดอร์ e2e เพราะสคริปต์หา `playwright` และ ffmpeg จากที่นั่น:

```sh
SKILL=~/.claude/skills/tc-to-e2e   # หรือ .claude/skills/tc-to-e2e ของโปรเจกต์
node $SKILL/scripts/evidence-report.mjs --out evidence-home --plan plan.json \
  --title 'ผลทดสอบหน้าแรก' --eyebrow 'PROJ-12 · Home' --heading 'ผลทดสอบแท็บ "หน้าแรก"' \
  --env 'staging · app.example.com' --account 'ครู demo.teacher' test-results
node $SKILL/scripts/evidence-report-per-tc.mjs evidence-home                 # ทุกข้อ
node $SKILL/scripts/evidence-report-per-tc.mjs evidence-home --status Fail   # เฉพาะข้อที่ไม่ผ่าน
```

ต้องใช้ ffmpeg ตัวเต็มที่มี overlay filter + libvpx หาตามลำดับนี้: `FFMPEG_PATH` → `@ffmpeg-installer/ffmpeg` ของโปรเจกต์ → `ffmpeg` ใน PATH
ffmpeg ที่มากับ Playwright ใช้ไม่ได้ เพราะไม่มี filter

## ตรวจคลิปก่อนส่ง (ห้ามข้าม)

```sh
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 evidence-home/videos/TC-HOME-001.webm
ffmpeg -v error -sseof -1 -i evidence-home/videos/TC-HOME-001.webm -frames:v 1 /tmp/last.png
```

เปิดภาพดูเองอย่างน้อย 1 เฟรมต่อเคส และต้องผ่านทั้ง 3 ข้อ:
- ขนาด 1920×1080
- แผง Step / Expected / Actual อ่านออก และเป็นภาษาไทยที่ไม่แตก
- เฟรมสุดท้ายไม่ใช่หน้าขาว (เคสที่เปิดหน้าหรือ context ใหม่มักได้คลิปว่าง)

## เผยแพร่

- claude.ai artifact: 1 artifact ต่อแท็บ จำกัดไฟล์ละไม่เกิน 15 MB, รอบละไม่เกิน 64 MB และไม่เกิน 511 ไฟล์
  ถ้าอัปโหลดค้าง ให้ส่งครั้งละไม่เกิน 10 ไฟล์ไปที่ URL เดิม
- ลิงก์ต่อเคสใช้รูปแบบ `<artifact url>#<TC-ID>` · **ถามผู้ใช้ก่อนเขียนลงชีต**
