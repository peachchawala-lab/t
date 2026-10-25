# เที่ยวทันใจ — Backend ระยะเริ่มต้น (Cloudflare Workers)

## สถานะ

ชุดนี้ทำให้ **GET /api/health** และ **GET /api/state** ใช้งานได้จริง และยังให้บริการหน้าเว็บจาก `public/` พร้อมกัน โดยอ่านกิจกรรมสาธิตจาก `public/catalog.json` ไม่เรียก ChatGPT Sites API อีกต่อไป

**ไม่ใช่ระบบ Production เต็มรูปแบบ**: สมัครสมาชิก การจองจริง การเก็บข้อมูลถาวร แอดมิน การอนุมัติร้าน และการชำระเงินยัง *ถูกปิดโดยเจตนา* เพื่อไม่ให้เว็บยอมรับการจอง/โอนเงินจริงโดยที่ระบบยังไม่พร้อม

## วิธีนำไปใช้กับ GitHub (Repository peachchawala-lab/t)

1. สำรอง/Clone repository ก่อนแก้
2. อัปโหลดไฟล์ `wrangler.jsonc` ไปที่ root ของ repository และ `backend/index.mjs` ไปที่โฟลเดอร์ `backend/` (ไม่ต้องลบโฟลเดอร์อื่น)
3. โปรเจกต์ Cloudflare Workers ที่เชื่อม GitHub: ตั้ง Build command เป็น `exit 0`, Deploy command เป็น `npx wrangler deploy` (ไม่ใช้ `--assets` เพราะได้กำหนด assets ใน wrangler.jsonc แล้ว)
4. Push/Commit แล้วดู Build logs
5. ทดสอบ URL:
   - `https://t.peach-chawala.workers.dev/api/health` ต้องได้ JSON `{ "ok": true, ... }`
   - `https://t.peach-chawala.workers.dev/api/state` ต้องได้ JSON ที่มี `activities`
   - `https://t.peach-chawala.workers.dev/` ต้องเปิดหน้าเว็บ

## สิ่งที่ต้องทำต่อเพื่อใช้งานจริงเต็มระบบ

1. **เปลี่ยน Auth:** โค้ดเดิมใช้ `/signin-with-chatgpt` เฉพาะใน ChatGPT Sites; ย้ายเป็น Supabase Auth (Email Magic Link หรือ OTP) และตั้ง Site URL / redirect ให้ตรงโดเมน Cloudflare
2. **ย้ายฐานข้อมูลอย่างปลอดภัย:** Supabase ปัจจุบันมี `tt_profiles` และ `tt_shops` ของ Sites อยู่แล้ว (Site-scoped string IDs, ไม่ใช่ UUID `auth.users.id`) จึงต้องสร้างตารางใหม่คนละชื่อ และวางแผน map บัญชีเก่า ห้าม DROP/TRUNCATE ตารางเดิม
3. **ออกแบบ API ที่ตรวจผู้ใช้ทุกคำขอ:** `/api/profile`, `/api/bookings`, `/api/favorite`, `/api/listings`, `/api/shops/apply`, `/api/reviews`, `/api/tickets` ฯลฯ โดยอ่าน Access Token ผ่าน Authorization header และตรวจการยืนยันตัวตนกับ Supabase Auth
4. **RLS และธุรกรรม:** จำกัดข้อมูลให้เห็นเฉพาะเจ้าของบัญชี; การจองต้องล็อก/ตรวจ capacity และเขียนแบบ atomic ไม่ให้หลายคนจองเกินจำนวน; validate ราคาฝั่ง server; มี idempotency key ป้องกันจองซ้ำ
5. **ร้านค้าและสิทธิ์แอดมิน:** ไม่ยอมรับ `isAdmin` หรือ `role` จาก client; เจ้าของร้านแก้ได้เฉพาะรายการของตน; การอนุมัติร้านและการตรวจรับเงินต้องมีสิทธิ์ระดับ admin ที่ตรวจจากฐานข้อมูล
6. **การชำระเงิน:** เริ่มเป็น manual verification/demo ก่อน ห้ามตั้งสถานะ paid จากการกดปุ่ม client; ต้องใช้ข้อมูลตรวจรายการของจริง และมีขั้นตอนยกเลิก/คืนเงินอย่างถูกต้อง
7. **เปลี่ยน frontend:** `public/essentials.js`, `public/ux.js`, `public/payments.js` อิง Sites และ D1 เดิม; ต้องปรับ Auth/UI/API ใหม่ ไม่ใช่แค่เปลี่ยน backend route
8. **การทดสอบ:** ทดสอบ Login, User A ดูข้อมูล User B ไม่ได้, Capacity race, double submit, shop approval, duplicate payment reports และ logout/session expiry ก่อนเปิดรับผู้ใช้จริง

## การตั้งค่าและความปลอดภัย

- อย่าใส่ Supabase `service_role` หรือ Secret Key ใน `public/`, GitHub, or ChatGPT chat
- ใช้ Supabase **publishable key** เฉพาะใน client และเปิด RLS ให้ทุกตารางที่เปิด Data API
- Secret สำหรับ Worker ต้องตั้งใน Cloudflare > Workers & Pages > เลือก Worker > Settings > Variables and Secrets
- Repo เดิมมีการพึ่งพา ChatGPT Sites runtime; การย้ายเป็นงานพัฒนา ไม่สามารถแก้ด้วยการใส่ environment variable อย่างเดียว

เอกสาร:
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/database/postgres/row-level-security
