'use strict';
let shopPicker=null,shopPin=null,shopDraft=null,shopImportBusy=false;
function shopLocationForm(){return `<fieldset class="shop-location"><legend>ตำแหน่งกิจการ</legend><p>วางลิงก์ที่แชร์จาก Google Maps หรือแตะจุดบนแผนที่ แล้วกดยืนยันหมุด ไม่ต้องกรอกตัวเลขพิกัด</p><label for="shop-maps-link">ลิงก์ Google Maps ของร้าน</label><input id="shop-maps-link" type="url" inputmode="url" maxlength="4096" placeholder="https://maps.app.goo.gl/…" autocomplete="off"><div class="picker-actions"><button class="btn secondary small" type="button" data-shop-map="import">อ่านตำแหน่งจากลิงก์</button><a class="text-button inset-link" id="shop-find-google" href="https://www.google.com/maps/search/?api=1&query=ตลาดน้อย" target="_blank" rel="noopener noreferrer">ค้นหาร้านใน Google Maps ↗</a></div><p class="smallprint">ใน Google Maps เลือกร้าน → แชร์ → คัดลอกลิงก์ ลิงก์บางแบบระบุเพียงจุดกลางแผนที่ จึงต้องตรวจหมุดก่อนยืนยัน</p><div id="shop-location-map" class="shop-location-map" aria-label="เลือกตำแหน่งกิจการบนแผนที่"></div><p id="shop-location-status" role="status">ยังไม่เลือกตำแหน่ง · แตะบนแผนที่เพื่อวางหมุด</p><div class="picker-actions"><button type="button" class="btn secondary small" data-shop-map="confirm" disabled>ยืนยันหมุดนี้เป็นตำแหน่งร้าน</button><a id="shop-google-preview" class="text-button inset-link" target="_blank" rel="noopener noreferrer" hidden>ตรวจจุดนี้ใน Google Maps ↗</a></div><input id="shop-lat" name="lat" type="hidden" value=""><input id="shop-lng" name="lng" type="hidden" value=""><p class="smallprint">แผนที่เลือกหมุดใช้ OpenStreetMap ซึ่งได้รับคำขอภาพตามพื้นที่ที่ดู ตำแหน่งนี้เป็นที่ตั้งกิจการ ไม่ใช่ตำแหน่งลูกค้า</p></fieldset>`;}
function destroyShopPicker(){if(shopPicker)shopPicker.remove();shopPicker=null;shopPin=null;shopDraft=null;shopImportBusy=false;}
function setShopDraft(lat,lng,source){
 if(!shopPicker||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return;
 shopDraft={lat,lng};const form=document.getElementById('shop-form');form.elements.lat.value='';form.elements.lng.value='';
 if(shopPin)shopPin.setLatLng([lat,lng]);else{shopPin=L.marker([lat,lng],{draggable:true,autoPan:true,title:'หมุดตำแหน่งร้าน — ลากเพื่อปรับ'}).addTo(shopPicker);shopPin.on('dragend',()=>{const p=shopPin.getLatLng();setShopDraft(p.lat,p.lng,'ปรับหมุดแล้ว');});}
 shopPicker.panTo([lat,lng]);document.querySelector('[data-shop-map="confirm"]').disabled=false;
 document.getElementById('shop-location-status').textContent=source+' · ตรวจตำแหน่งและกดยืนยันหมุด';
 const preview=document.getElementById('shop-google-preview');preview.hidden=false;preview.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng);
}
function initShopPicker(){
 const element=document.getElementById('shop-location-map');if(!element)return;
 if(!window.L){document.getElementById('shop-location-status').textContent='โหลดแผนที่ไม่สำเร็จ ตรวจเครือข่ายแล้วเปิดหน้านี้ใหม่';return;}
 shopPicker=L.map(element,{scrollWheelZoom:false}).setView([13.7345,100.514],15);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(shopPicker);
 shopPicker.on('click',e=>setShopDraft(e.latlng.lat,e.latlng.lng,'วางหมุดบนแผนที่แล้ว'));
}
document.addEventListener('input',event=>{
 if(event.target.id==='shop-name'){const link=document.getElementById('shop-find-google');if(link)link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(event.target.value||'ตลาดน้อย');}
 if(event.target.id==='shop-maps-link'){const form=document.getElementById('shop-form');form.elements.lat.value='';form.elements.lng.value='';shopDraft=null;document.querySelector('[data-shop-map="confirm"]').disabled=true;document.getElementById('shop-location-status').textContent='ลิงก์เปลี่ยนแล้ว · กดอ่านตำแหน่งจากลิงก์และยืนยันหมุดอีกครั้ง';}
});
document.addEventListener('click',async event=>{
 const action=event.target.closest('[data-shop-map]')?.dataset.shopMap;if(!action)return;event.preventDefault();
 if(action==='confirm'&&shopDraft){const form=document.getElementById('shop-form');form.elements.lat.value=String(shopDraft.lat);form.elements.lng.value=String(shopDraft.lng);document.getElementById('shop-location-status').textContent='✓ ยืนยันตำแหน่งร้านแล้ว · หากย้ายหมุดต้องยืนยันใหม่';return;}
 if(action!=='import'||shopImportBusy)return;
 const status=document.getElementById('shop-location-status'),input=document.getElementById('shop-maps-link'),button=event.target.closest('button'),form=document.getElementById('shop-form');
 // Changing the link invalidates any previously confirmed coordinates.
 form.elements.lat.value='';form.elements.lng.value='';shopDraft=null;document.querySelector('[data-shop-map="confirm"]').disabled=true;
 if(!input.value.trim()){status.textContent='กรุณาวางลิงก์ Google Maps ก่อน';input.focus();return;}
 shopImportBusy=true;button.disabled=true;status.textContent='กำลังอ่านตำแหน่งจากลิงก์…';
 const requestedUrl=input.value.trim();
 try{const point=await api('maps/resolve',{url:requestedUrl});if(document.getElementById('shop-form')!==form||input.value.trim()!==requestedUrl)return;if(!shopPicker){status.textContent='โหลดแผนที่ไม่สำเร็จ กรุณาเปิดหน้านี้ใหม่';return;}setShopDraft(point.lat,point.lng,point.kind==='center'?'พบจุดกลางแผนที่ อาจไม่ใช่หน้าร้าน':'อ่านหมุดจากลิงก์แล้ว');shopPicker.setView([point.lat,point.lng],17);}catch(error){if(status.isConnected&&input.value.trim()===requestedUrl)status.textContent=error.message;}finally{shopImportBusy=false;if(button.isConnected)button.disabled=false;}
});
