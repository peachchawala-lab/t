// Static receiver is supplied by the site owner; no bank API or automatic verification.
export const RECEIVER_VERSION='owner-qr-2026-10-24-v1';
export const QR_IMAGE='/images/payment-qr.jpg';
type DB=any;
type Actor={userId:string;isAdmin:boolean};
type Booking=Record<string,any>;
const stop=(message:string,status=400):never=>{throw Object.assign(new Error(message),{status});};
const field=(v:unknown,min:number,max:number)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)stop(`กรุณากรอกข้อมูล ${min}–${max} ตัวอักษร`);return (v as string).trim();};
export function amountMinor(value:unknown){
 if(typeof value!=='string'||!/^\d{1,7}(?:\.\d{1,2})?$/.test(value))stop('ยอดเงินต้องเป็นบาทและสตางค์ที่ถูกต้อง');
 const [whole,fraction='']=String(value).split('.');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n<1)stop('ยอดเงินไม่ถูกต้อง');return n;
}
export function expectedMinor(b:Booking){const n=Number(b.unit_price)*Number(b.people)*100;if(!Number.isInteger(b.unit_price)||b.unit_price<1||!Number.isInteger(b.people)||b.people<1||!Number.isSafeInteger(n))stop('ยอดรายการไม่ถูกต้อง กรุณาติดต่อผู้ดูแล',409);return n;}
export async function paymentBooking(db:DB,id:unknown,actor:Actor,ownerOnly=false){
 const b=await db.prepare('SELECT * FROM bookings WHERE id=?').bind(field(id,1,80)).first();
 if(!b||b.user_id!==actor.userId&&(ownerOnly||!actor.isAdmin))stop('ไม่พบรายการจองที่คุณเข้าถึงได้',403);
 return b;
}
export async function checkout(db:DB,b:Booking,isDemo:boolean){
 const reports=(await db.prepare('SELECT id,amount_minor,bank_name,bank_reference,transferred_at,status,review_note,created_at,reviewed_at FROM payment_reports WHERE booking_id=? ORDER BY created_at DESC').bind(b.id).all()).results;
 const future=Date.parse(b.event_date+'T'+b.slot+':00+07:00')>Date.now();
 return {bookingId:b.id,status:b.status,amountMinor:expectedMinor(b),currency:'THB',demo:isDemo,receiverVersion:RECEIVER_VERSION,
  canPay:!isDemo&&b.status==='awaiting_payment'&&future,qrImage:!isDemo&&b.status==='awaiting_payment'&&future?QR_IMAGE:null,
  canReport:!isDemo&&b.status==='awaiting_payment',reports};
}
export async function reportPayment(db:DB,b:Booking,isDemo:boolean,actor:Actor,data:any){
 if(b.user_id!==actor.userId)stop('แจ้งโอนได้เฉพาะรายการของคุณ',403);
 if(isDemo)stop('กิจกรรมสาธิตไม่รับเงินจริง',409);
 const amount=amountMinor(data.amount),expected=expectedMinor(b),key=field(data.idempotency,10,100);
 if(amount!==expected)stop('ยอดแจ้งโอนไม่ตรงยอดจอง กรุณาส่งเรื่องช่วยเหลือหากโอนต่างจากยอดนี้',409);
 if(data.receiverVersion!==RECEIVER_VERSION||data.acknowledged!==true)stop('กรุณาตรวจบัญชีรับเงินและเงื่อนไขการชำระ');
 const bank=field(data.bankName,2,60),reference=field(data.bankReference,5,100);
 const date=field(data.transferredAt,22,32),at=Date.parse(date),now=Date.now();
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/.test(date)||!Number.isFinite(at)||new Date(at+7*3600000).toISOString().slice(0,16)!==date.slice(0,16)||at>now+300000||at<Number(b.created_at)-300000)stop('วันเวลาโอนไม่ถูกต้อง ใช้เวลาประเทศไทยและต้องไม่ก่อนสร้างรายการ');
 const same=(p:any)=>p&&p.booking_id===b.id&&p.amount_minor===amount&&p.bank_name===bank&&p.bank_reference===reference&&p.transferred_at===at;
 const existing=await db.prepare('SELECT * FROM payment_reports WHERE user_id=? AND idempotency=?').bind(actor.userId,key).first();
 if(existing){if(!same(existing))stop('รหัสคำขอถูกใช้กับข้อมูลอื่นแล้ว',409);return {ok:true,id:existing.id};}
 if(b.status!=='awaiting_payment')stop('รายการไม่ได้อยู่ในขั้นตอนแจ้งโอน กรุณาอัปเดตข้อมูล',409);
 const id=crypto.randomUUID();
 try{
  const result=await db.batch([
   db.prepare(`INSERT INTO payment_reports(id,booking_id,user_id,amount_minor,currency,bank_name,bank_reference,transferred_at,receiver_version,idempotency,status,created_at)
    SELECT ?,?,?,?,'THB',?,?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM bookings WHERE id=? AND user_id=? AND status='awaiting_payment' AND unit_price*people*100=?)`).bind(id,b.id,actor.userId,amount,bank,reference,at,RECEIVER_VERSION,key,now,b.id,actor.userId,amount),
   db.prepare("UPDATE bookings SET status='payment_review' WHERE id=? AND status='awaiting_payment' AND EXISTS(SELECT 1 FROM payment_reports WHERE id=? AND status='pending')").bind(b.id,id)
  ]);
  if(!result[0].meta.changes)stop('สถานะเปลี่ยนไปแล้ว กรุณาอัปเดตข้อมูล',409);
 }catch(e:any){
  const retry=await db.prepare('SELECT * FROM payment_reports WHERE user_id=? AND idempotency=?').bind(actor.userId,key).first();
  if(same(retry))return {ok:true,id:retry.id};
  if(String(e.message).includes('UNIQUE'))stop('มีรายการแจ้งโอนรอตรวจแล้ว กรุณาอัปเดตข้อมูล',409);throw e;
 }
 return {ok:true,id};
}
export async function reviewPayment(db:DB,actor:Actor,data:any){
 if(!actor.isAdmin)stop('ผู้ดูแลบัญชีรับเงินเท่านั้นที่ตรวจรับยอดได้',403);
 const report=await db.prepare('SELECT * FROM payment_reports WHERE id=?').bind(field(data.reportId,1,80)).first();
 if(!report)stop('ไม่พบรายการแจ้งโอน',404);
 if(!['verified','rejected'].includes(data.decision))stop('ผลตรวจไม่ถูกต้อง');
 const note=field(data.note,5,500);let entry=null;
 if(data.decision==='verified'){
  if(data.bankChecked!==true)stop('ต้องตรวจยอดเข้าจริงในบัญชีธนาคารก่อน');
  if(amountMinor(data.amount)!==report.amount_minor)stop('ยอดที่ตรวจพบไม่ตรงรายการ ห้ามยืนยันรับเงิน',409);
  entry=field(data.bankEntry,5,100).replace(/\s+/g,'').toUpperCase();if(entry.length<5)stop('ระบุเลขอ้างอิงรายการเข้าจริงให้ครบ');
 }
 if(report.status!=='pending'){
  if(report.status===data.decision&&report.verified_reference===entry&&report.review_note===note&&report.reviewed_by===actor.userId)return {ok:true};
  stop('รายการนี้มีผลตรวจแล้ว กรุณาอัปเดตข้อมูล',409);
 }
 const now=Date.now(),next=data.decision==='verified'?'confirmed':'awaiting_payment';
 try{
  const result=await db.batch([
   db.prepare(`UPDATE payment_reports SET status=?,verified_reference=?,review_note=?,reviewed_by=?,reviewed_at=? WHERE id=? AND status='pending'
    AND EXISTS(SELECT 1 FROM bookings b WHERE b.id=payment_reports.booking_id AND b.status='payment_review' AND b.unit_price*b.people*100=payment_reports.amount_minor)`).bind(data.decision,entry,note,actor.userId,now,report.id),
   db.prepare(`UPDATE bookings SET status=? WHERE id=? AND status='payment_review' AND EXISTS(SELECT 1 FROM payment_reports WHERE id=? AND status=? AND reviewed_by=? AND reviewed_at=?)`).bind(next,report.booking_id,report.id,data.decision,actor.userId,now)
  ]);
  if(!result[0].meta.changes)stop('สถานะเปลี่ยนไปแล้ว กรุณาอัปเดตข้อมูล',409);
 }catch(e:any){if(String(e.message).includes('UNIQUE'))stop('เลขรายการเข้าบัญชีนี้เคยยืนยันรับเงินแล้ว ห้ามใช้ซ้ำ',409);throw e;}
 return {ok:true};
}
export function guardRealTransition(isDemo:boolean,current:string,next:string){
 if(isDemo)return;
 if(next==='payment_review'||next==='confirmed')stop('รายการจริงต้องผ่านขั้นตอนแจ้งโอนและตรวจยอดจากบัญชีกลาง',409);
 if(next==='cancelled'&&current!=='requested')stop('ร้านรับจองแล้ว กรุณาส่งเรื่องช่วยเหลือเพื่อตรวจยอดและเงื่อนไขคืนเงินก่อนยกเลิก',409);
}
