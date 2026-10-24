// The digest is public; the 256-bit credential exists only in Sites secrets.
// JWT verification at the gateway is replaced by this service-to-service key check.
const EXPECTED_DIGEST='2713882148365045c26e55133b3c8f7c4227dbead1a8b7813dacdb0e08fc5c8c';
const SITE='appgprj_6adaff358a2081918689d3155d1cdb67';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function text(value,min,max){if(typeof value!=='string'||value.trim().length<min||value.length>max)fail('ข้อมูลไม่ถูกต้อง');return value.trim();}
function uid(value){return text(value,1,300);}
const ownFilter=userId=>({site_id:'eq.'+SITE,user_id:'eq.'+userId});
async function db(table,filter={},method='GET',data,prefer){
 const url=new URL(Deno.env.get('SUPABASE_URL')+'/rest/v1/'+table);
 for(const [key,value] of Object.entries(filter))url.searchParams.set(key,String(value));
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)fail('ระบบจัดเก็บยังไม่พร้อม',503);
 const response=await fetch(url,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:prefer||'return=representation'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(8000)});
 if(!response.ok){if(response.status===409)fail('บัญชีนี้มีคำขอเปิดร้านแล้ว',409);fail('บันทึกข้อมูลลงทะเบียนไม่สำเร็จ',503);}
 if(response.status===204)return [];
 return response.json();
}
async function account(userId,isAdmin){
 const [profiles,shops,applications]=await Promise.all([
  db('tt_profiles',{...ownFilter(userId),select:'name,email,created_at,updated_at',limit:1}),
  db('tt_shops',{site_id:'eq.'+SITE,owner_id:'eq.'+userId,select:'*',limit:1}),
  isAdmin?db('tt_shops',{site_id:'eq.'+SITE,select:'*',order:'created_at.desc',limit:200}):Promise.resolve([])
 ]);
 return {profile:profiles[0]||null,shop:shops[0]||null,applications};
}
export async function handle(request){
 try{
  const key=request.headers.get('x-tt-server-key')||'';
  if(!/^[a-f0-9]{64}$/.test(key))return json({error:'Unauthorized'},401);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),v=>v.toString(16).padStart(2,'0')).join('');
  let mismatch=0;for(let i=0;i<EXPECTED_DIGEST.length;i++)mismatch|=digest.charCodeAt(i)^EXPECTED_DIGEST.charCodeAt(i);
  if(mismatch)return json({error:'Unauthorized'},401);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON required'},415);
  const raw=await request.text();if(raw.length>16000)return json({error:'Request too large'},413);
  let data;try{data=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
  if(data.action==='health')return json({ok:true,storage:'supabase'});
  if(data.action==='catalog')return json(await db('tt_shops',{site_id:'eq.'+SITE,status:'eq.approved',select:'id,owner_id,name,address,lat,lng',order:'created_at.desc',limit:1000}));
  if(data.action==='names'){
   if(!Array.isArray(data.ids)||data.ids.length>100)fail('ข้อมูลไม่ถูกต้อง');
   const ids=[...new Set(data.ids.map(uid))];
   // Never construct PostgREST IN grammar with arbitrary identity strings.
   const rows=await Promise.all(ids.map(id=>db('tt_profiles',{...ownFilter(id),select:'user_id,name',limit:1})));
   return json(rows.flat());
  }
  const userId=uid(data.userId),isAdmin=data.isAdmin===true;
  if(data.action==='account')return json(await account(userId,isAdmin));
  if(data.action==='profile.save'){
   const now=Date.now();const old=await db('tt_profiles',{...ownFilter(userId),select:'created_at',limit:1});
   await db('tt_profiles',{on_conflict:'site_id,user_id'},'POST',{site_id:SITE,user_id:userId,name:text(data.name,2,60),email:text(data.email,3,320),created_at:old[0]?.created_at||now,updated_at:now},'resolution=merge-duplicates,return=representation');
   return json({ok:true});
  }
  const profiles=await db('tt_profiles',{...ownFilter(userId),select:'user_id',limit:1});if(!profiles.length)fail('กรุณาลงทะเบียนโปรไฟล์ก่อน',409);
  if(data.action==='shop.apply'){
   const lat=Number(data.lat),lng=Number(data.lng);if(data.lat==null||data.lng==null||String(data.lat).trim()===''||String(data.lng).trim()===''||!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180)fail('ตำแหน่งไม่ถูกต้อง');
   const row={site_id:SITE,owner_id:userId,name:text(data.name,2,100),address:text(data.address,8,300),contact:text(data.contact,5,120),description:text(data.description,10,1000),lat,lng,status:'pending',created_at:Date.now()};
   await db('tt_shops',{},'POST',row);return json({ok:true});
  }
  if(data.action==='shop.approve'){
   if(!isAdmin)fail('เฉพาะแอดมินเท่านั้น',403);if(!['approved','rejected'].includes(data.status))fail('สถานะไม่ถูกต้อง');
   const result=await db('tt_shops',{site_id:'eq.'+SITE,id:'eq.'+text(data.id,36,36)},'PATCH',{status:data.status});if(!result.length)fail('ไม่พบคำขอร้าน',404);return json({ok:true});
  }
  // Idempotent import of the caller's existing D1 registration. The Site backend
  // supplies this data from its database, never from an untrusted browser body.
  if(data.action==='legacy.shop'){
   const existing=await db('tt_shops',{site_id:'eq.'+SITE,owner_id:'eq.'+userId,select:'id',limit:1});if(existing.length)return json({ok:true});
   const s=data.shop,lat=Number(s?.lat),lng=Number(s?.lng);if(!s||s.owner_id!==userId||!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180)fail('ข้อมูลเดิมไม่ถูกต้อง');
   await db('tt_shops',{on_conflict:'site_id,owner_id'},'POST',{site_id:SITE,id:text(s.id,36,36),owner_id:userId,name:text(s.name,2,100),address:text(s.address,8,300),contact:text(s.contact,5,120),description:text(s.description,10,1000),lat,lng,status:['pending','approved','rejected'].includes(s.status)?s.status:'pending',created_at:Number(s.created_at)||Date.now()},'resolution=ignore-duplicates,return=representation');return json({ok:true});
  }
  return json({error:'Unknown action'},404);
 }catch(error){return json({error:error.status?error.message:'ระบบลงทะเบียนขัดข้อง กรุณาลองใหม่'},error.status||503);}
}
Deno.serve(handle);
