// Read only coordinates contained in a user-provided URL. No Maps page scraping.
const googleHosts=new Set(['google.com','www.google.com','maps.google.com','google.co.th','www.google.co.th','maps.google.co.th','google.co.uk','www.google.co.uk']);
const shortHosts=new Set(['maps.app.goo.gl','goo.gl','googlemaps.app.goo.gl']);
const error=(message:string):never=>{throw Object.assign(new Error(message),{status:400});};
export function mapsUrl(value:string){
 if(typeof value!=='string'||value.length>4096)error('ลิงก์ยาวเกินกำหนด');
 let url:URL;try{url=new URL(value.trim());}catch{error('กรุณาวางลิงก์ Google Maps ที่ถูกต้อง');}
 if(url!.protocol!=='https:'||url!.port||url!.username||url!.password)error('ใช้ได้เฉพาะลิงก์ HTTPS ของ Google Maps');
 const host=url!.hostname;
 if(!(shortHosts.has(host)||googleHosts.has(host)&&(host.startsWith('maps.')||/^\/maps(?:\/|$)/.test(url!.pathname))))error('กรุณาใช้ลิงก์ Google Maps โดยตรง');
 if(host==='goo.gl'&&!url!.pathname.startsWith('/maps/'))error('กรุณาใช้ลิงก์ Google Maps โดยตรง');
 if(/\/maps\/dir(?:\/|$)/.test(url!.pathname))error('กรุณาแชร์ลิงก์สถานที่แทนลิงก์เส้นทาง');
 return url!;
}
function pair(lat:string,lng:string,kind:'pin'|'center'){
 const latitude=Number(lat),longitude=Number(lng);
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)error('พิกัดในลิงก์ไม่ถูกต้อง');
 return {lat:latitude,lng:longitude,kind};
}
export function readMapsCoordinates(value:string){
 const url=mapsUrl(value),decoded=decodeURIComponent(url.pathname+url.search);
 const place=[...decoded.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)].at(-1);
 if(place)return pair(place[1],place[2],'pin');
 for(const field of ['query','q','ll']){const match=url.searchParams.get(field)?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);if(match)return pair(match[1],match[2],field==='ll'?'center':'pin');}
 const center=decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\/|$)/);
 return center?pair(center[1],center[2],'center'):null;
}
export async function resolveMapsLocation(value:string,fetcher:typeof fetch=fetch){
 let url=mapsUrl(value);
 for(let step=0;step<6;step++){
  let position;try{position=readMapsCoordinates(url.href);}catch(e){if(e instanceof URIError)error('ลิงก์เข้ารหัสไม่ถูกต้อง');throw e;}
  if(position)return {...position,url:url.href};
  if(!shortHosts.has(url.hostname))break;
  let response:Response;try{response=await fetcher(url.href,{redirect:'manual',signal:AbortSignal.timeout(4000),headers:{Accept:'text/html'}});}catch{error('เปิดลิงก์สั้นไม่สำเร็จ ลองใช้ลิงก์เต็มหรือเลือกบนแผนที่');}
  const location=response!.headers.get('location');await response!.body?.cancel();
  if(response!.status<300||response!.status>399||!location)break;
  url=mapsUrl(new URL(location,url).href);
 }
 error('ลิงก์นี้ไม่มีพิกัดที่อ่านได้ เลือกจุดบนแผนที่ หรือใช้ลิงก์เต็มที่มีหมุดร้าน');
}
