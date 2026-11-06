// Aplicación
// Estructura
const cart=[];
let customBase=0, customService="", customGender="male";
const ADMIN={user:"",ci:"",password:"",phone:"",name:"Administrador",permissions:"completo",primary:true,...(window.ORELLANA_ADMIN_CONFIG||{})};
// Acceso
// Datos
if(localStorage.getItem("orellana_admin_login_config_version")!=="login-config-v3"){
  localStorage.removeItem("orellana_primary_password");
  localStorage.setItem("orellana_admin_login_config_version","login-config-v3");
}
let session={type:null,phone:"",ci:"",user:"",name:"",permissions:""};
let selectedPay="QR"; let verified=false; let currentCI="";
const priceDefaults={"Pantalón":250,"Saco":500,"Pollera":300,"Vestido de 15 años":900,"Falda":180,"Vestido materno":700,"Vestido de novia":1500,"Vestido de novia para cholitas":1800};

// Catálogo
const originalCatalogOrder = [...document.querySelectorAll('#catalogo .grid .product-card')];
function filterCatalog(g,b){
  const grid=document.querySelector('#catalogo .grid');
  if(!grid)return;
  document.querySelectorAll('.gender-tab').forEach(x=>x.classList.remove('active'));
  if(b)b.classList.add('active');
  const cards = g==='all' ? [...originalCatalogOrder] : [...originalCatalogOrder].filter(c=>c.dataset.gender===g);
  const hidden = g==='all' ? [] : originalCatalogOrder.filter(c=>c.dataset.gender!==g);

  // Filtros
  cards.forEach(card=>{
    card.classList.remove('filtered-out','filtered-in');
    grid.appendChild(card);
  });
  hidden.forEach(card=>{
    card.classList.remove('filtered-in');
    card.classList.add('filtered-out');
    grid.appendChild(card);
  });
  // Filtros
  if(g==='all'){
    originalCatalogOrder.forEach(card=>{
      card.classList.remove('filtered-out');
      grid.appendChild(card);
    });
  } else {
    cards.forEach(card=>{
      void card.offsetWidth;
      card.classList.add('filtered-in');
    });
  }
  grid.classList.toggle('filtered-mode',g!=='all');
}

function startRepairOrder(){
  const garment=document.getElementById('repairGarment');
  const details=document.getElementById('repairDetails');
  const status=document.getElementById('repairStatus');
  if(!garment || !garment.value){
    if(status)status.textContent='Selecciona primero el tipo de prenda que deseas arreglar.';
    if(garment)garment.focus();
    return;
  }
  const repairName='Arreglo de '+garment.value;
  openCustomizer(repairName,30,'repair');
  const notes=document.getElementById('cNotes');
  if(notes)notes.value=details && details.value.trim() ? details.value.trim() : 'Tipo de arreglo por confirmar con el taller';
  refreshCustomizerTotal();
  if(status)status.textContent='Seleccionaste '+garment.value+'. Completa las especificaciones y añádelo al carrito para preparar el pedido.';
}
function openCustomizer(service,price,gender){
  customService=service; customBase=getPrice(service,price); customGender=gender;
  document.getElementById('customTitle').textContent='Personalizar: '+service;
  populateFabricSelect('cFabric', service);
  document.getElementById('cQty').value=1; document.getElementById('cColor').value=''; document.getElementById('cNotes').value='';
  document.querySelector('.customizer').classList.add('active'); refreshCustomizerTotal();
  document.getElementById('personalizador').scrollIntoView({behavior:'smooth',block:'center'});
}
function refreshCustomizerTotal(){const q=Math.max(1,Number(document.getElementById('cQty').value)||1);document.getElementById('cPrice').textContent='Bs. '+(customBase*q).toFixed(2)}
function addConfiguredProduct(){
  if(!customService)return alert('Selecciona primero una prenda.');
  const q=Math.max(1,Number(document.getElementById('cQty').value)||1);
  cart.push({id:Date.now()+Math.random(),service:customService,price:customBase,qty:q,gender:customGender,fabric:document.getElementById('cFabric').value||'Tela por confirmar con el taller',color:document.getElementById('cColor').value||'Por confirmar',style:document.getElementById('cStyle').value,notes:document.getElementById('cNotes').value||'Sin observaciones'});
  renderCart(); const f=document.getElementById('cartFloat'); f.classList.remove('cart-pulse'); void f.offsetWidth; f.classList.add('cart-pulse'); openCart();
}
function renderCart(){
  const b=document.getElementById('cartItems');
  b.innerHTML=cart.length?cart.map(i=>`<div class="cart-item"><strong style="color:${i.gender==='male'?'#e4c85d':'#dce0e6'}">${i.service}</strong><div style="font-size:11px;color:#777;margin-top:5px">${i.fabric} · ${i.color} · ${i.style}<br>${i.notes}</div><div class="qty-control"><button onclick="changeQty(${i.id},-1)">−</button><span>${i.qty}</span><button onclick="changeQty(${i.id},1)">+</button><strong style="margin-left:auto;color:${i.gender==='male'?'#d4af37':'#d7dce2'}">Bs. ${(i.price*i.qty).toFixed(2)}</strong></div><button onclick="removeCart(${i.id})" style="margin-top:7px;background:none;border:0;color:#8e6060;font-size:11px">Eliminar</button></div>`).join(''):'<div style="padding:30px 0;color:#777">Tu carrito está vacío.</div>';
  const u=cart.reduce((a,x)=>a+x.qty,0),t=cart.reduce((a,x)=>a+x.price*x.qty,0); document.getElementById('cartCount').textContent=u; document.getElementById('cartUnits').textContent=u; document.getElementById('cartSubtotal').textContent='Bs. '+t.toFixed(2); document.getElementById('cartTotal').textContent='Bs. '+t.toFixed(2);
}
function changeQty(id,d){const i=cart.find(x=>x.id===id);if(i){i.qty=Math.max(1,i.qty+d);renderCart()}}
function removeCart(id){const n=cart.findIndex(x=>x.id===id);if(n>-1)cart.splice(n,1);renderCart()}
function openCart(){document.getElementById('cartDrawer').classList.add('open');document.getElementById('drawerOverlay').classList.add('open')}
function closeCart(){document.getElementById('cartDrawer').classList.remove('open');if(!document.getElementById('drawerLeft').classList.contains('open')&&!document.getElementById('drawerRight').classList.contains('open'))document.getElementById('drawerOverlay').classList.remove('open')}
function goToOrder(){closeCart();if(cart.length){document.getElementById('service').value=cart[0].service+'|'+cart[0].price;document.getElementById('qty').value=cart.reduce((a,x)=>a+x.qty,0);updateTotal()}document.getElementById('pedido').scrollIntoView({behavior:'smooth'})}
function getPrice(service,fallback){return Number(localStorage.getItem('price_'+service))||Number(fallback)||0}
function savePrices(){if(!can("catalogo"))return alert("Tu cuenta no tiene permiso para editar el catálogo.");document.querySelectorAll('.admin-price').forEach(inp=>{const service=inp.dataset.service;const val=Math.max(0,Number(inp.value)||0);localStorage.setItem('price_'+service,val);document.querySelectorAll(`.product-card[data-service="${service}"] .price`).forEach(x=>x.textContent='Desde Bs. '+val.toLocaleString('es-BO'));document.querySelectorAll(`#service option[value^="${service}|"]`).forEach(o=>o.value=service+'|'+val);});alert('Precios actualizados en este navegador.')}

function openDrawer(side){document.getElementById('drawerOverlay').classList.add('open');document.getElementById(side==='left'?'drawerLeft':'drawerRight').classList.add('open')}
function closeDrawers(){document.getElementById('drawerLeft').classList.remove('open');document.getElementById('drawerRight').classList.remove('open');document.getElementById('drawerOverlay').classList.remove('open')}
function quickOrder(service){selectService(service);closeDrawers()}
function selectService(service){const select=document.getElementById('service');const option=[...select.options].find(o=>o.value.startsWith(service+'|'));if(option)select.value=option.value;updateTotal();document.getElementById('pedido').scrollIntoView({behavior:'smooth'})}
function verifyCI(){const ci=document.getElementById('ci').value.trim(),status=document.getElementById('ciStatus');if(!/^[0-9A-Za-z-]{5,20}$/.test(ci)){status.textContent='Ingrese un número de CI válido.';status.classList.add('show');verified=false;return}currentCI=ci;verified=true;status.textContent='CI identificado. Puede completar el pedido.';status.classList.add('show');document.getElementById('rCI').textContent=ci}

function normalize(v){return String(v||"").trim().toLowerCase()}
function getDelegatedAdmins(){try{return JSON.parse(localStorage.getItem("orellana_admin_profiles")||"[]")}catch(e){return[]}}
function saveDelegatedAdmins(a){localStorage.setItem("orellana_admin_profiles",JSON.stringify(a))}
function updateSessionUI(){const b=document.getElementById("sessionBadge");if(b){b.textContent=session.type==="admin"?(session.primary?"ADMINISTRADOR PRINCIPAL":session.owner?"PROPIETARIO":"ACCESO DELEGADO"):session.type==="user"?"CLIENTE":"SIN SESIÓN";b.classList.toggle("internal",session.type==="admin")}}
function showLoginStatus(m,e=false){const x=document.getElementById("loginStatus");if(!x)return;x.textContent=m;x.classList.add("show");x.classList.toggle("error",e)}
function identifyAccess(){
 const phone=document.getElementById("loginPhone").value.trim();
 const ci=document.getElementById("loginIdentity").value.trim();
 const name=document.getElementById("loginName").value.trim();
 if(!/^[0-9+ -]{7,20}$/.test(phone)||ci.length<5||name.length<2){showLoginStatus("Completa teléfono, CI y nombre.",true);return}
 session={type:"user",phone,ci,name,user:name,permissions:"cliente"};
 sessionStorage.setItem("orellana_session",JSON.stringify(session));
 currentCI=ci;verified=true;
 document.getElementById("ci").value=ci;
 document.getElementById("phone").value=phone;
 document.getElementById("name").value=name;
 document.getElementById("rCI").textContent=ci;
 document.getElementById("rName").textContent=name;
 document.getElementById("ciStatus").textContent="Datos de contacto registrados.";
 document.getElementById("ciStatus").classList.add("show");
 document.getElementById("accessModal").classList.remove("open");
 updateSessionUI();
 document.getElementById("pedido").scrollIntoView({behavior:"smooth",block:"center"});
}
function continueAdminAccess(){
 window.location.href="admin.html";
}

function permissionList(profile){
 const p=profile&&profile.permissions;
 if(Array.isArray(p))return p;
 if(p==="completo")return ["pedidos","pagos","catalogo","cuentas"];
 if(p==="pedidos")return ["pedidos","catalogo"];
 if(p==="catalogo")return ["catalogo"];
 return [];
}
function can(x){
 if(session.type!=="admin")return false;
 if(session.primary||session.owner)return true;
 return permissionList(session).includes(x);
}
function applyAdminPermissions(){
 const panel=document.getElementById("adminProfilesPanel");
 if(panel)panel.style.display=(session.primary||session.owner)?"block":"none";
 document.querySelectorAll(".admin-price").forEach(x=>x.disabled=!can("catalogo"));
 const welcome=document.getElementById("adminWelcome");
 if(welcome)welcome.textContent="Sesión: "+session.name+" · Perfil: "+(session.primary?"Administrador principal":session.owner?"Propietario":"Delegado")+" · Permisos: "+permissionList(session).join(", ");
 const clearButton=document.querySelector("button[onclick='clearOrders()']");
 if(clearButton)clearButton.style.display=can("pedidos")?"inline-flex":"none";
}
function createDelegatedAdmin(){
 if(!session.primary&&!session.owner)return alert("Esta cuenta no tiene autorización para crear perfiles.");
 const v=id=>document.getElementById(id).value.trim(),name=v("newAdminName"),phone=v("newAdminPhone"),ci=v("newAdminCI"),user=v("newAdminUser"),password=document.getElementById("newAdminPass").value;
 const role=document.getElementById("newAdminRole").value;
 if(role==="owner"&&!session.primary)return alert("Solo el administrador principal puede preparar una cuenta de propietario.");
 if(name.length<2||phone.length<7||ci.length<5||user.length<2||password.length<8)return alert("Completa todos los datos. La contraseña debe tener al menos 8 caracteres.");
 const permissions=[...document.querySelectorAll('input[name="newAdminPermission"]:checked')].map(x=>x.value);
 if(role!=="owner"&&permissions.length===0)return alert("Selecciona al menos un permiso para la cuenta delegada.");
 const a=getDelegatedAdmins();
 if(a.some(x=>x.phone===phone||normalize(x.user)===normalize(user)))return alert("Teléfono o usuario ya registrado.");
 a.push({id:(role==="owner"?"OWN-":"ADM-")+Date.now(),name,phone,ci,user,password,role,permissions:role==="owner"?["pedidos","pagos","catalogo","cuentas"]:permissions,createdBy:session.user});
 saveDelegatedAdmins(a);
 ["newAdminName","newAdminPhone","newAdminCI","newAdminUser","newAdminPass"].forEach(id=>document.getElementById(id).value="");
 document.getElementById("newAdminRole").value="delegado";
 document.querySelectorAll('input[name="newAdminPermission"]').forEach(x=>x.checked=x.value==="pedidos");
 renderDelegatedAdmins();
}
function renderDelegatedAdmins(){
 const e=document.getElementById("delegatedAdmins"),a=getDelegatedAdmins();
 if(!e)return;
 e.innerHTML=a.length?a.map((x,i)=>`<div class="profile-card"><div><strong>${escapeHtml(x.name)}</strong><div class="profile-meta">${escapeHtml(x.user)} · ${escapeHtml(x.phone)} · ${x.role==="owner"?"Propietario":"Delegado"}<br>Permisos: ${permissionList(x).map(escapeHtml).join(", ")}</div></div><button class="mini" onclick="removeDelegatedAdmin(${i})">REVOCAR</button></div>`).join(""):"<p style='color:#777;font-size:11px'>No hay cuentas adicionales configuradas.</p>";
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function removeDelegatedAdmin(i){
 if(!session.primary&&!session.owner)return;
 const a=getDelegatedAdmins();
 if(!a[i])return;
 if(session.owner&&a[i].role==="owner")return alert("Una cuenta de propietario no puede revocar otra cuenta de propietario.");
 if(confirm("¿Revocar esta cuenta?")){a.splice(i,1);saveDelegatedAdmins(a);renderDelegatedAdmins();}
}
function changeCurrentPassword(){
 const phone=document.getElementById("changePhone").value.trim(), oldP=document.getElementById("oldPassword").value, np=document.getElementById("newPassword").value, np2=document.getElementById("newPassword2").value;
 const st=document.getElementById("passwordStatus"); const msg=(m,e=false)=>{st.textContent=m;st.classList.add("show");st.classList.toggle("error",e)};
 if(phone!==session.phone){msg("El teléfono no coincide con la cuenta activa.",true);return}
 if(!oldP){msg("Ingresa la contraseña anterior.",true);return}
 if(np.length<4){msg("La nueva contraseña debe tener al menos 4 caracteres.",true);return}
 if(np!==np2){msg("Las nuevas contraseñas no coinciden.",true);return}
 if(session.primary){ const savedPassword=localStorage.getItem("orellana_primary_password")||ADMIN.password; if(oldP!==savedPassword){msg("La contraseña anterior no coincide.",true);return} localStorage.setItem("orellana_primary_password",np); msg("Contraseña actualizada para el administrador principal."); return; }
 if(session.type==="admin"){
   const a=getDelegatedAdmins(), i=a.findIndex(x=>x.phone===session.phone&&normalize(x.user)===normalize(session.user));
   if(i<0||a[i].password!==oldP){msg("La contraseña anterior no coincide.",true);return} a[i].password=np; saveDelegatedAdmins(a); sessionStorage.setItem("orellana_session",JSON.stringify(session)); msg("Contraseña actualizada correctamente."); return;
 }
 const clients=JSON.parse(localStorage.getItem("orellana_clients")||"[]"); const i=clients.findIndex(x=>x.phone===session.phone&&normalize(x.ci)===normalize(session.ci));
 if(i<0){clients.push({phone:session.phone,ci:session.ci,name:session.name,password:oldP}); localStorage.setItem("orellana_clients",JSON.stringify(clients)); msg("Cuenta de cliente inicializada. Repite el cambio usando esta contraseña como anterior."); return;}
 if(clients[i].password!==oldP){msg("La contraseña anterior no coincide.",true);return} clients[i].password=np; localStorage.setItem("orellana_clients",JSON.stringify(clients)); msg("Contraseña de cliente actualizada correctamente.");
}
function adminLogout(){session={type:null,phone:"",ci:"",user:"",name:"",permissions:""};sessionStorage.removeItem("orellana_session");document.getElementById("accessStepBasic").classList.remove("access-step-hidden");["loginPhone","loginIdentity","loginName","loginUser","loginPassword"].forEach(id=>document.getElementById(id).value="");document.getElementById("adminReveal").classList.remove("show");document.getElementById("adminPasswordStep").style.display="none";document.getElementById("adminModal").classList.remove("open");document.getElementById("accessModal").classList.add("open");updateSessionUI()}
function updateTotal(){
  const select=document.getElementById('service');
  const qtyInput=document.getElementById('qty');
  if(!select||!qtyInput)return;
  const parts=(select.value||'').split('|');
  const name=parts[0]||'—';
  const price=Number(parts[1])||0;
  const qty=Math.max(1,Number(qtyInput.value)||1);
  const total=price*qty;
  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  setText('rService',name); setText('rQty',qty); setText('rPrice','Bs. '+price.toFixed(2)); setText('rTotal','Bs. '+total.toFixed(2));
}
function choosePay(el,method){selectedPay=method;const s=document.getElementById('payStatus');if(s){s.textContent='Método seleccionado: '+method+'. El pago debe ser verificado manualmente por el propietario.';s.classList.add('show')}}

function changeClientPassword(){
 const phone=document.getElementById("clientChangePhone").value.trim(), oldP=document.getElementById("clientOldPassword").value, np=document.getElementById("clientNewPassword").value, np2=document.getElementById("clientNewPassword2").value;
 const st=document.getElementById("clientPasswordStatus"); const msg=(m,e=false)=>{st.textContent=m;st.classList.add("show");st.classList.toggle("error",e)};
 if(session.type!=="user"){msg("Inicia sesión como cliente primero.",true);return} if(phone!==session.phone){msg("El teléfono no coincide con la sesión.",true);return}
 if(np.length<4||np!==np2){msg(np.length<4?"La nueva contraseña debe tener al menos 4 caracteres.":"Las nuevas contraseñas no coinciden.",true);return}
 const clients=JSON.parse(localStorage.getItem("orellana_clients")||"[]"); const i=clients.findIndex(x=>x.phone===session.phone&&normalize(x.ci)===normalize(session.ci));
 if(i<0){msg("Primero debes establecer una contraseña inicial desde el sistema de cuenta.",true);return}
 if(clients[i].password!==oldP){msg("La contraseña anterior no coincide.",true);return} clients[i].password=np; localStorage.setItem("orellana_clients",JSON.stringify(clients)); msg("Contraseña actualizada correctamente.");
}
function closeModal(){document.getElementById('modal').classList.remove('open')}
function toggleMeasurementRequest(){
 const unknown=!!document.getElementById('unknownMeasurements')?.checked;
 const qr=document.getElementById('qrOfficialBox');
 const notice=document.getElementById('requestContactNotice');
 const status=document.getElementById('payStatus');
 const paymentLink=document.getElementById('summaryPaymentLink');
 if(qr)qr.hidden=unknown;
 if(notice)notice.hidden=!unknown;
 if(paymentLink)paymentLink.hidden=unknown;
 if(status){status.textContent=unknown?'Solicitud de medidas: no se requiere pago por adelantado. Contacta con los propietarios para coordinar las medidas.':'Método seleccionado: QR. Estado del pago: pendiente de verificación por el propietario.';status.classList.add('show');}
}
function resetOrder(){document.getElementById('orderForm').reset();const refPreview=document.getElementById('referencePreview');if(refPreview){refPreview.removeAttribute('src');refPreview.hidden=true;}document.getElementById('ciStatus').classList.remove('show');document.getElementById('rName').textContent='No identificado';document.getElementById('rCI').textContent='—';verified=false;currentCI='';toggleMeasurementRequest();updateTotal()}

function closeAdmin(){document.getElementById('adminModal').classList.remove('open')}


function loadAdminPrices(){document.getElementById('adminPriceBody').innerHTML=Object.entries(priceDefaults).map(([service,p])=>{const v=getPrice(service,p);return `<tr><td>${service}</td><td><input class="admin-price" data-service="${service}" type="number" min="0" value="${v}"></td></tr>`}).join('');loadTariffManager()}

const initialTariffs = [
 {garment:'Pantalón de varón',model:'Microfibra',price:250,notes:'Precio de costura indicado por el taller; confirmar según modelo.'},
 {garment:'Pantalón de varón',model:'Casimir',price:280,notes:'Precio de costura indicado por el taller; confirmar según modelo.'},
 {garment:'Pantalón de varón',model:'Oveja tomé',price:250,notes:'Precio aproximado indicado; propietario debe confirmar.'},
 {garment:'Pantalón de varón',model:'Otras telas / tarifa general',price:'',notes:'PENDIENTE: se mencionó Bs 130–150 en general, pero también tarifas específicas mayores. Confirmar alcance antes de publicar.'},
 {garment:'Pantalón de mujer',model:'Modelo básico',price:80,notes:'Rango referido Bs 80–100; ajustar según diseño.'},
 {garment:'Saco de varón',model:'Confección de saco',price:450,notes:'Rango referido Bs 450–500; confirmar precio exacto por modelo.'},
 {garment:'Vestido normal / casual / fiesta',model:'Modelo básico',price:120,notes:'Desde Bs 120; diseños especiales requieren cotización.'},
 {garment:'Vestido de maternidad',model:'Modelo básico',price:120,notes:'Rango de referencia Bs 120–250; ajustar según tela y modelo.'},
 {garment:'Vestido de novia',model:'Diseño por cotizar',price:150,notes:'Desde Bs 150 hasta referencias de Bs 1.500–2.500. Revisión obligatoria del propietario.'},
 {garment:'Vestido de 15 años',model:'Diseño por cotizar',price:150,notes:'Rango similar al vestido de novia; cotización obligatoria por diseño y bordado.'},
 {garment:'Pollera',model:'2 paños',price:80,notes:'Precio de costura indicado.'},
 {garment:'Pollera',model:'2,5 paños',price:100,notes:'Precio de costura indicado.'},
 {garment:'Pollera',model:'3 paños',price:120,notes:'Precio de costura indicado.'},
 {garment:'Pollera',model:'4 paños',price:150,notes:'Precio de costura indicado.'},
 {garment:'Falda',model:'Sencilla sin forro',price:50,notes:'Desde Bs 50; subir según diseño.'},
 {garment:'Falda',model:'Con forro',price:70,notes:'Rango referido Bs 70–80; ajustar por modelo.'},
 {garment:'Blusa de señorita',model:'Modelo sencillo',price:50,notes:'Rango de referencia Bs 50–70.'},
 {garment:'Blusa de chola',model:'Modelo básico',price:50,notes:'Se mencionó Bs 50–100 según diseño; confirmar tarifa.'},
 {garment:'Blusa con pernus / detalles',model:'Con detalles especiales',price:250,notes:'Puede llegar a Bs 250–350; confirmar forro y detalles antes de cotizar.'},
 {garment:'Camisa',model:'Por definir',price:'',notes:'PENDIENTE DE CONFIGURAR por el propietario.'},
 {garment:'Chamarra',model:'Por definir',price:'',notes:'PENDIENTE DE CONFIGURAR por el propietario.'},
 {garment:'Jean / arreglo',model:'Por definir',price:'',notes:'PENDIENTE DE CONFIGURAR por el propietario.'},
 {garment:'Buso / arreglo',model:'Por definir',price:'',notes:'PENDIENTE DE CONFIGURAR por el propietario.'},
 {garment:'Polera / arreglo',model:'Por definir',price:'',notes:'PENDIENTE DE CONFIGURAR por el propietario.'},
 {garment:'Saco de mujer / otras prendas',model:'Por definir',price:'',notes:'PENDIENTE DE CONFIGURAR si se ofrecerá en el catálogo.'},
 {garment:'Prendas infantiles',model:'Por definir',price:'',notes:'No hay tarifas infantiles configuradas todavía; no cotizar hasta que el propietario las defina.'}
];
const initialFabrics = [
 {name:'Microfibra',price:'',compatible:'Pantalón de varón'},
 {name:'Casimir',price:'',compatible:'Pantalón de varón'},
 {name:'Oveja tomé',price:'',compatible:'Pantalón de varón'},
 {name:'Otra tela',price:'',compatible:''}
];
function readAdminList(key,defaults){try{const v=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(v)?v.map(x=>({...x})):defaults.map(x=>({...x}))}catch(e){return defaults.map(x=>({...x}))}}
function getTariffs(){return readAdminList('orellana_tariffs',initialTariffs)}
function getFabrics(){return readAdminList('orellana_fabrics',initialFabrics)}
function normalizeGarment(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim().replace(/es\b/g,'').replace(/s\b/g,'')}
function fabricMatchesGarment(fabric, garment){
 const raw=String(fabric.compatible||'').trim(); if(!raw)return false;
 const target=normalizeGarment(garment).replace(/^arreglo de /,'');
 return raw.split(/[,;\n]/).map(normalizeGarment).filter(Boolean).some(tag=>{
   if(tag==='todos'||tag==='todas las prendas'||tag==='todas')return true;
   return target===tag || target.includes(tag) || tag.includes(target);
 });
}
function populateFabricSelect(selectId, garment){
 const select=document.getElementById(selectId); if(!select)return;
 const previous=select.value;
 const options=getFabrics().filter(f=>fabricMatchesGarment(f,garment));
 select.innerHTML='';
 const placeholder=document.createElement('option'); placeholder.value='';
 placeholder.textContent=options.length?'Selecciona una tela compatible':'No hay telas configuradas para esta prenda';
 select.appendChild(placeholder);
 options.forEach(f=>{const o=document.createElement('option');o.value=f.name;o.textContent=f.name;select.appendChild(o)});
 if(options.some(f=>f.name===previous))select.value=previous;
}
function renderOrderFabricOptions(){const service=document.getElementById('service');if(service)populateFabricSelect('fabric',(service.value||'').split('|')[0]);}
function loadTariffManager(){renderTariffRows();renderFabricRows()}
function renderTariffRows(){const el=document.getElementById('tariffRows');if(!el)return;el.innerHTML=getTariffs().map((t,i)=>`<tr><td><input aria-label="Prenda ${i+1}" data-field="garment" value="${escapeHtml(t.garment||'')}" placeholder="Tipo de prenda"></td><td><input aria-label="Modelo ${i+1}" data-field="model" value="${escapeHtml(t.model||'')}" placeholder="Modelo o tela"></td><td><input aria-label="Precio de costura ${i+1}" data-field="price" type="number" min="0" step="1" value="${t.price===null||t.price===undefined?'':escapeHtml(t.price)}" placeholder="Pendiente"></td><td><input aria-label="Notas de tarifa ${i+1}" data-field="notes" value="${escapeHtml(t.notes||'')}" placeholder="Notas / pendiente de confirmar"></td><td><button class="mini" onclick="removeTariffRow(${i})">Quitar</button></td></tr>`).join('')}
function renderFabricRows(){const el=document.getElementById('fabricRows');if(!el)return;el.innerHTML=getFabrics().map((f,i)=>`<tr><td><input aria-label="Nombre de tela ${i+1}" data-field="name" value="${escapeHtml(f.name||'')}" placeholder="Nombre de la tela"></td><td><input aria-label="Precio por metro ${i+1}" data-field="price" type="number" min="0" step="0.5" value="${f.price===null||f.price===undefined?'':escapeHtml(f.price)}" placeholder="Pendiente"></td><td><input aria-label="Prendas compatibles ${i+1}" data-field="compatible" value="${escapeHtml(f.compatible||'')}" placeholder="Prendas compatibles, separadas por comas"></td><td><button class="mini" onclick="removeFabricRow(${i})">Quitar</button></td></tr>`).join('')}
function collectRows(id,fields){return [...document.querySelectorAll(`#${id} tr`)].map(tr=>{const obj={};fields.forEach(f=>{const el=tr.querySelector(`[data-field="${f}"]`);if(!el)return;obj[f]=f==='price'?(el.value.trim()===''?'':Math.max(0,Number(el.value)||0)):el.value.trim()});return obj})}
function tariffStatus(msg){const el=document.getElementById('tariffStatus');if(el){el.textContent=msg;el.classList.add('show');el.classList.remove('error')}}
function saveTariffs(){if(!can('catalogo'))return alert('Tu cuenta no tiene permiso para editar el tarifario.');const rows=collectRows('tariffRows',['garment','model','price','notes']);if(rows.some(r=>!r.garment||!r.model))return alert('Completa al menos la prenda y el modelo en cada fila, o quita la fila vacía.');localStorage.setItem('orellana_tariffs',JSON.stringify(rows));tariffStatus('Tarifas de costura guardadas en este navegador. Los precios vacíos siguen pendientes y no deben publicarse como precios confirmados.')}
function saveFabrics(){if(!can('catalogo'))return alert('Tu cuenta no tiene permiso para editar el catálogo.');const rows=collectRows('fabricRows',['name','price','compatible']);if(rows.some(r=>!r.name))return alert('Cada tela debe tener un nombre, o quita la fila vacía.');localStorage.setItem('orellana_fabrics',JSON.stringify(rows));renderOrderFabricOptions();const svc=document.getElementById('service');if(svc)populateFabricSelect('cFabric',customService||svc.value.split('|')[0]);tariffStatus('Catálogo de telas guardado. Los formularios ya usan las telas compatibles configuradas por prenda. Los precios por metro vacíos siguen pendientes.')}
function addTariffRow(){if(!can('catalogo'))return alert('Tu cuenta no tiene permiso para editar el tarifario.');const rows=collectRows('tariffRows',['garment','model','price','notes']);rows.push({garment:'',model:'',price:'',notes:'Pendiente de configurar'});localStorage.setItem('orellana_tariffs',JSON.stringify(rows));renderTariffRows()}
function removeTariffRow(i){if(!can('catalogo'))return alert('Tu cuenta no tiene permiso para editar el tarifario.');const rows=collectRows('tariffRows',['garment','model','price','notes']);rows.splice(i,1);localStorage.setItem('orellana_tariffs',JSON.stringify(rows));renderTariffRows()}
function addFabricRow(){if(!can('catalogo'))return alert('Tu cuenta no tiene permiso para editar el catálogo.');const rows=collectRows('fabricRows',['name','price','compatible']);rows.push({name:'',price:'',compatible:''});localStorage.setItem('orellana_fabrics',JSON.stringify(rows));renderFabricRows()}
function removeFabricRow(i){if(!can('catalogo'))return alert('Tu cuenta no tiene permiso para editar el catálogo.');const rows=collectRows('fabricRows',['name','price','compatible']);rows.splice(i,1);localStorage.setItem('orellana_fabrics',JSON.stringify(rows));renderFabricRows();renderOrderFabricOptions()}
function renderAdminOrders(){
 const el=document.getElementById('adminOrders');if(!el)return;
 if(!can('pedidos')){el.innerHTML='<p class="sub">Esta cuenta no tiene permiso para consultar pedidos.</p>';return;}
 const orders=readLocalArray('orellana_orders');
 el.innerHTML=orders.length?orders.map((o,i)=>`<div class="admin-order"><div class="admin-order-heading"><strong>${escapeHtml(o.id)}</strong><span class="admin-badge">${escapeHtml(o.status||'Pedido recibido')}</span></div><div style="margin-top:7px;color:#bbb">${escapeHtml(o.name)} · ${escapeHtml(o.service)}</div><div style="font-size:11px;color:#888;margin-top:4px">${escapeHtml(o.date)} · ${escapeHtml(o.total)}</div><div class="payment-state-row"><span>Pago: <b>${escapeHtml(o.paymentStatus||(o.requestType==='Solicitud de medidas'?'Sin adelanto solicitado':'Pendiente de verificación'))}</b></span>${can('pagos')&&o.requestType!=='Solicitud de medidas'?`<select aria-label="Estado de pago" onchange="updatePaymentStatus(${i},this.value)"><option value="Pendiente de verificación" ${(o.paymentStatus||'Pendiente de verificación')==='Pendiente de verificación'?'selected':''}>Pendiente de verificación</option><option value="Verificado" ${o.paymentStatus==='Verificado'?'selected':''}>Verificado</option><option value="Rechazado" ${o.paymentStatus==='Rechazado'?'selected':''}>Rechazado</option></select>`:''}</div><div class="admin-actions">${can('pedidos')?`<select aria-label="Estado del pedido" onchange="updateOrderStatus(${i},this.value)"><option ${o.status==='Solicitud de medidas'?'selected':''}>Solicitud de medidas</option><option ${o.status==='Pedido recibido'?'selected':''}>Pedido recibido</option><option ${o.status==='En revisión'?'selected':''}>En revisión</option><option ${o.status==='En confección'?'selected':''}>En confección</option><option ${o.status==='Listo para entrega'?'selected':''}>Listo para entrega</option><option ${o.status==='Entregado'?'selected':''}>Entregado</option></select>`:''}<button class="mini" onclick="viewOrder(${i})">VER DETALLES</button></div></div>`).join(''):'<p style="color:#777">Todavía no hay encargos registrados en este navegador.</p>';
}
function updateOrderStatus(i,status){if(!can('pedidos'))return alert('Tu cuenta no tiene permiso para modificar pedidos.');const orders=readLocalArray('orellana_orders');if(orders[i]){orders[i].status=status;localStorage.setItem('orellana_orders',JSON.stringify(orders));renderAdminOrders();}}
function updatePaymentStatus(i,status){if(!can('pagos'))return alert('Tu cuenta no tiene permiso para verificar pagos.');const orders=readLocalArray('orellana_orders');if(orders[i]){orders[i].paymentStatus=status;orders[i].paymentReviewedBy=session.name;orders[i].paymentReviewedAt=new Date().toLocaleString('es-BO');localStorage.setItem('orellana_orders',JSON.stringify(orders));renderAdminOrders();}}
function viewOrder(i){if(!can('pedidos'))return;const o=readLocalArray('orellana_orders')[i];if(o)alert(`Pedido ${o.id}\n\nCliente: ${o.name}\nCI: ${o.ci}\nTeléfono: ${o.phone||'—'}\nServicio: ${o.service}\nTotal: ${o.total}\nTipo: ${o.requestType||'Pedido normal'}\nPago: ${o.payment||'QR'}\nEstado del pago: ${o.paymentStatus||(o.requestType==='Solicitud de medidas'?'Sin adelanto solicitado':'Pendiente de verificación')}\nEstado del pedido: ${o.status}\nMedidas: ${o.measurementsUnknown?'Cliente no conoce sus medidas; contactar para coordinar.':'Indicadas por el cliente / por confirmar'}${o.referenceImage?'\nImagen de referencia: adjunta al pedido':''}`);}
function clearOrders(){if(!can('pedidos'))return alert('Tu cuenta no tiene permiso para gestionar pedidos.');if(confirm('¿Eliminar todos los encargos guardados en este navegador?')){localStorage.removeItem('orellana_orders');renderAdminOrders();}}

// Imágenes
const MAX_UPLOAD_BYTES = 1024 * 1024;
function readImageFile(input, previewId, callback){
  const file=input?.files?.[0]; if(!file)return;
  if(!file.type.startsWith('image/')){alert('Selecciona un archivo de imagen.');input.value='';return;}
  if(file.size>MAX_UPLOAD_BYTES){alert('La imagen supera 1 MB. Reduce su tamaño e inténtalo otra vez.');input.value='';return;}
  const reader=new FileReader();
  reader.onload=()=>{const data=String(reader.result||'');const preview=document.getElementById(previewId);if(preview){preview.src=data;preview.hidden=false;}if(callback)callback(data,file);};
  reader.onerror=()=>alert('No se pudo leer la imagen. Inténtalo de nuevo.');
  reader.readAsDataURL(file);
}
function applyCatalogImage(service,data){
  const card=[...document.querySelectorAll('.product-card')].find(c=>c.dataset.service===service);if(!card)return;
  let img=card.querySelector('.sample img');
  if(!img){img=document.createElement('img');img.alt='Imagen personalizada de '+service;card.querySelector('.sample')?.appendChild(img);}
  img.src=data;img.hidden=false;img.style.display='block';img.dataset.localUpload='true';
}
function saveCatalogImage(){
  if(!can('catalogo'))return alert('Tu cuenta no tiene permiso para editar el catálogo.');
  const service=document.getElementById('catalogImageService')?.value,input=document.getElementById('catalogImageFile');
  if(!input?.files?.length)return alert('Primero selecciona una imagen desde tu ordenador.');
  readImageFile(input,'catalogImagePreview',data=>{try{localStorage.setItem('orellana_catalog_image_'+service,data);applyCatalogImage(service,data);alert('Imagen guardada para '+service+'.');}catch(e){alert('El navegador no tiene espacio suficiente. Prueba con una imagen más pequeña.');}});
}
function removeCatalogImage(){
  if(!can('catalogo'))return alert('Tu cuenta no tiene permiso para editar el catálogo.');
  const service=document.getElementById('catalogImageService')?.value;localStorage.removeItem('orellana_catalog_image_'+service);
  const preview=document.getElementById('catalogImagePreview');if(preview){preview.removeAttribute('src');preview.hidden=true;}
  const input=document.getElementById('catalogImageFile');if(input)input.value='';
  const card=[...document.querySelectorAll('.product-card')].find(c=>c.dataset.service===service);const img=card?.querySelector('.sample img');if(img){img.removeAttribute('src');img.hidden=true;img.style.display='none';}
  alert('Se quitó la imagen personalizada de '+service+'. Puedes volver a cargar otra.');
}
function saveQrImage(){
  if(!can('pagos'))return alert('Tu cuenta no tiene permiso para gestionar imágenes de pago.');
  const input=document.getElementById('qrImageFile');if(!input?.files?.length)return alert('Primero selecciona la imagen oficial del QR.');
  readImageFile(input,'qrImagePreview',data=>{try{localStorage.setItem('orellana_official_qr_image',data);applyQrImage(data);alert('Imagen del QR guardada en este navegador.');}catch(e){alert('No hay espacio suficiente para guardar la imagen. Prueba con un archivo más pequeño.');}});
}
function applyQrImage(data){const box=document.getElementById('qrImageContent');if(!box)return;box.innerHTML='<img class="qr-official-image" alt="QR bancario oficial de CONFECCIONES ORELLANA"><h3>QR BANCARIO OFICIAL</h3><p>Escanea este código desde tu aplicación bancaria.</p><small>No realices pagos si no reconoces los datos del beneficiario.</small>';box.querySelector('img').src=data;}
function removeQrImage(){if(!can('pagos'))return alert('Tu cuenta no tiene permiso para gestionar imágenes de pago.');localStorage.removeItem('orellana_official_qr_image');const box=document.getElementById('qrImageContent');if(box)box.innerHTML='<div class="qr-symbol" aria-hidden="true">▦</div><h3>QR BANCARIO OFICIAL</h3><p>El administrador puede cargar aquí la imagen auténtica del QR desde su ordenador.</p>';const preview=document.getElementById('qrImagePreview');if(preview){preview.removeAttribute('src');preview.hidden=true;}const input=document.getElementById('qrImageFile');if(input)input.value='';}
function restoreLocalImages(){
  document.querySelectorAll('.product-card').forEach(card=>{const service=card.dataset.service;const data=localStorage.getItem('orellana_catalog_image_'+service);if(data)applyCatalogImage(service,data);});
  const qr=localStorage.getItem('orellana_official_qr_image');if(qr)applyQrImage(qr);
}
function setupImageUploads(){
  const catalogInput=document.getElementById('catalogImageFile');if(catalogInput)catalogInput.addEventListener('change',()=>readImageFile(catalogInput,'catalogImagePreview'));
  const qrInput=document.getElementById('qrImageFile');if(qrInput)qrInput.addEventListener('change',()=>readImageFile(qrInput,'qrImagePreview'));
  const reference=document.getElementById('reference');if(reference)reference.addEventListener('change',()=>readImageFile(reference,'referencePreview'));
  restoreLocalImages();
}

// Inicio
function initializeApp(){
  try {
    const saved = JSON.parse(sessionStorage.getItem('orellana_session') || 'null');
    // Sesión
    if (saved && saved.type === 'admin') {
      sessionStorage.removeItem('orellana_session');
      window.location.href = 'admin.html';
      return;
    }
    if (saved && saved.type) {
      session = saved;
      updateSessionUI();
      if (saved.type === 'user') {
        currentCI = saved.ci || '';
        verified = Boolean(saved.ci);
        const ci = document.getElementById('ci');
        const phone = document.getElementById('phone');
        const name = document.getElementById('name');
        const rCI = document.getElementById('rCI');
        const rName = document.getElementById('rName');
        if (ci) ci.value = saved.ci || '';
        if (phone) phone.value = saved.phone || '';
        if (name) name.value = saved.name || '';
        if (rCI) rCI.textContent = saved.ci || '—';
        if (rName) rName.textContent = saved.name || 'No identificado';
        document.getElementById('accessModal')?.classList.remove('open');
      } else if (saved.type === 'admin') {
        document.getElementById('accessModal')?.classList.remove('open');
        loadAdminPrices();
        renderAdminOrders();
        renderDelegatedAdmins();
        applyAdminPermissions();
        document.getElementById('adminModal')?.classList.add('open');
      }
    } else {
      document.getElementById('accessModal')?.classList.add('open');
    }
  } catch (error) {
    console.warn('No se pudo restaurar la sesión guardada:', error);
    sessionStorage.removeItem('orellana_session');
    document.getElementById('accessModal')?.classList.add('open');
  }

  const nameInput = document.getElementById('name');
  if (nameInput) nameInput.addEventListener('input', function(){
    const target = document.getElementById('rName');
    if (target) target.textContent = this.value || 'No identificado';
  });
  const qtyInput = document.getElementById('cQty');
  if (qtyInput) qtyInput.addEventListener('input', refreshCustomizerTotal);
  const orderForm = document.getElementById('orderForm');
  if (orderForm) orderForm.addEventListener('submit', submitOrder);

  renderCart();
  updateTotal();
  renderOrderFabricOptions();
  document.getElementById('service')?.addEventListener('change',renderOrderFabricOptions);
  toggleMeasurementRequest();
  setupImageUploads();
}

async function submitOrder(e){
  e.preventDefault();
  if (!verified) { alert('Primero debe verificarse el Carnet de Identidad.'); document.getElementById('ci')?.focus(); return; }
  const name = document.getElementById('name')?.value.trim() || '';
  const phone = document.getElementById('phone')?.value.trim() || '';
  if (!name) { alert('Ingrese el nombre completo.'); return; }
  if (!phone) { alert('Ingrese un teléfono de contacto.'); return; }
  const serviceParts = (document.getElementById('service')?.value || '').split('|');
  const service = serviceParts[0] || 'Servicio por confirmar';
  const totalText = document.getElementById('rTotal')?.textContent || '';
  const quotedTotal = Number(totalText.replace(/[^0-9,.-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.'));
  const order = {
    name, phone, service,
    quotedTotal: Number.isFinite(quotedTotal) ? quotedTotal : null,
    requestType: document.getElementById('unknownMeasurements')?.checked ? 'Solicitud de medidas' : 'Pedido normal',
    measurementsUnknown: !!document.getElementById('unknownMeasurements')?.checked,
    measurements: document.getElementById('measurements')?.value || '',
    fabric: document.getElementById('fabric')?.value || 'Por confirmar',
    color: document.getElementById('color')?.value || '',
    details: document.getElementById('details')?.value || '',
    payment: document.getElementById('unknownMeasurements')?.checked ? 'Sin adelanto solicitado' : 'Sin adelanto obligatorio',
    paymentStatus: 'Pendiente de revisión por el taller',
    items: cart.map(item => ({...item})),
    referenceImage: ''
  };
  const submitButton = document.querySelector('#orderForm button[type="submit"]');
  if (submitButton) { submitButton.disabled = true; submitButton.dataset.originalText = submitButton.textContent; submitButton.textContent = 'ENVIANDO…'; }
  try {
    const orderId = await window.OrellanaOrderService.submit(order);
    const modalText = document.getElementById('modalText');
    if (modalText) modalText.textContent = order.measurementsUnknown
      ? 'Solicitud registrada correctamente. Código: ' + orderId + '. No se solicitó adelanto ni se requiere QR. Contacta con CONFECCIONES ORELLANA para coordinar tus medidas.'
      : 'Pedido recibido correctamente. Código: ' + orderId + '. El total es referencial y el taller confirmará los detalles.';
    document.getElementById('modal')?.classList.add('open');
  } catch (error) {
    console.error('[ORELLANA] No se pudo enviar el pedido:', error);
    alert('No se pudo registrar el pedido. Comprueba tu conexión o inténtalo nuevamente. Detalle: ' + (error?.message || 'Error desconocido'));
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = submitButton.dataset.originalText || 'ENVIAR PEDIDO'; }
  }
}

function readLocalArray(key){
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch (error) { console.warn('Datos locales inválidos para ' + key, error); return []; }
}

initializeApp();
