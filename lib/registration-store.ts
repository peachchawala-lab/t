import { env } from 'cloudflare:workers';
export const REGISTRATION_URL='https://lhjqvcealdonhatunmhu.supabase.co/functions/v1/tt-registration';
// This is a narrowly scoped server credential, never a browser API key.
export async function registration(action:string,data:Record<string,unknown>={}){
 const key=(env as any).REGISTRATION_BRIDGE_KEY;
 if(!key)throw Object.assign(new Error('ระบบลงทะเบียน Supabase ยังไม่พร้อม'),{status:503});
 let response:Response;try{response=await fetch(REGISTRATION_URL,{method:'POST',headers:{'Content-Type':'application/json','x-tt-server-key':key},body:JSON.stringify({...data,action}),signal:AbortSignal.timeout(12000)});}catch{throw Object.assign(new Error('เชื่อมระบบลงทะเบียนไม่สำเร็จ กรุณาลองใหม่'),{status:503});}
 let result:any;try{result=await response.json();}catch{throw Object.assign(new Error('ระบบลงทะเบียนไม่พร้อม กรุณาลองใหม่'),{status:503});}
 if(!response.ok)throw Object.assign(new Error(response.status===401?'ระบบลงทะเบียนยังไม่พร้อม กรุณาติดต่อผู้ดูแล':result.error||'บันทึกไม่สำเร็จ'),{status:response.status===401?503:response.status});
 return result;
}
