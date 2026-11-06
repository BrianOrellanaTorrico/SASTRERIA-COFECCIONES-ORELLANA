(() => {
  const $ = (id) => document.getElementById(id);
  const state = { user: null, profile: null, garments: [], fabrics: [], orders: [], compatibility: [] };
  const can = permission => state.profile?.role === 'owner' || (state.profile?.role === 'admin' && (state.profile.permissions || []).includes(permission));
  function applyPermissions(){
    const rules = { pedidos: 'pedidos', catalogo: 'catalogo', materiales: 'catalogo' };
    Object.entries(rules).forEach(([section, permission]) => {
      const allowed = section === 'pedidos' ? (can('pedidos') || can('pagos')) : can(permission);
      const node = $(section);
      if (node) node.hidden = !allowed;
      document.querySelectorAll('a[href="#' + section + '"],button[data-section="' + section + '"]').forEach(el => el.hidden = !allowed);
    });
    const summary = $('resumen');
    if (summary) summary.hidden = !(can('pedidos') || can('pagos') || can('catalogo') || can('cuentas'));
  }
  const money = (v) => v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2});
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client = () => window.ORELLANA_SUPABASE;
  function message(id,text,error=false){const el=$(id);if(el){el.textContent=text;el.classList.toggle('error',error)}}
  function show(view){['loginView','deniedView','dashboardView'].forEach(id=>$(id).hidden=id!==view)}
  function failText(error){return error?.message || 'No se pudo completar la operación.'}
  async function checkSession(){
    if(!client()){message('loginMessage','Falta configurar Supabase. Revisa assets/js/config.js.',true);show('loginView');return;}
    const {data:{session},error}=await client().auth.getSession();
    if(error||!session){show('loginView');return;}
    await authorize(session.user);
  }
  async function authorize(user){
    state.user=user;
    const {data:profile,error}=await client().from('profiles').select('id,display_name,role,permissions').eq('id',user.id).maybeSingle();
    if(error){message('loginMessage','No se pudo verificar el perfil: '+failText(error),true);show('loginView');return;}
    if(!profile || !['owner','admin'].includes(profile.role)){
      show('deniedView'); $('adminIdentity').textContent='Acceso no autorizado'; $('signOutBtn').hidden=false; return;
    }
    state.profile=profile; applyPermissions(); $('adminIdentity').textContent=(profile.display_name||user.email)+' · '+profile.role.toUpperCase(); $('signOutBtn').hidden=false; show('dashboardView'); await refreshAll();
  }
  async function signIn(event){event.preventDefault();message('loginMessage','Verificando cuenta…');
    try{const {data,error}=await client().auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;await authorize(data.user)}catch(e){message('loginMessage',failText(e),true)}
  }
  async function signOut(){if(client()) await client().auth.signOut();state.user=null;state.profile=null;$('password').value='';$('adminIdentity').textContent='Sin sesión';$('signOutBtn').hidden=true;show('loginView')}
  async function refreshAll(){const tasks=[];if(can('pedidos')||can('pagos'))tasks.push(loadOrders());if(can('catalogo'))tasks.push(loadGarments(),loadFabrics());await Promise.all(tasks);updateStats()}
  async function loadOrders(){if(!can('pedidos')&&!can('pagos'))return;const body=$('ordersBody');body.innerHTML='<tr><td colspan="7" class="empty">Cargando…</td></tr>';
    try{const {data,error}=await client().from('orders').select('id,customer_name,customer_phone,order_details,quoted_total,status,payment_status,created_at').order('created_at',{ascending:false});if(error)throw error;state.orders=data||[];renderOrders()}
    catch(e){body.innerHTML=`<tr><td colspan="7" class="empty">${escapeHtml(failText(e))}</td></tr>`}
  }
  function renderOrders(){const body=$('ordersBody');if(!state.orders.length){body.innerHTML='<tr><td colspan="7" class="empty">Todavía no hay pedidos en Supabase.</td></tr>';return}
    body.innerHTML=state.orders.map(o=>{const detail=typeof o.order_details==='string'?o.order_details:JSON.stringify(o.order_details||{});return `<tr data-order="${o.id}"><td>${escapeHtml(o.customer_name)}<small>${new Date(o.created_at).toLocaleString('es-BO')}</small></td><td>${escapeHtml(o.customer_phone)}</td><td class="detail-cell" title="${escapeHtml(detail)}">${escapeHtml(detail.slice(0,100))}</td><td><input class="quote-input" type="number" min="0" step="0.01" value="${o.quoted_total??''}" placeholder="Sin cotizar" ${can('pedidos')?'':'disabled'}></td><td><select class="status-input" ${can('pedidos')?'':'disabled'}>${['pendiente','en_revision','aceptado','en_confeccion','listo','entregado','cancelado'].map(v=>`<option value="${v}" ${o.status===v?'selected':''}>${v.replaceAll('_',' ')}</option>`).join('')}</select></td><td><select class="payment-input" ${can('pagos')?'':'disabled'}><option value="sin_revisar" ${(o.payment_status||'sin_revisar')==='sin_revisar'?'selected':''}>Sin revisar</option><option value="verificado" ${o.payment_status==='verificado'?'selected':''}>Verificado</option><option value="rechazado" ${o.payment_status==='rechazado'?'selected':''}>Rechazado</option></select></td><td><button class="button button-outline save-order" ${can('pedidos')||can('pagos')?'':'disabled'}>Guardar</button></td></tr>`}).join('');
    body.querySelectorAll('.save-order').forEach(b=>b.addEventListener('click',saveOrder));
  }
  async function saveOrder(e){const tr=e.currentTarget.closest('tr'),id=tr.dataset.order,quote=tr.querySelector('.quote-input').value,status=tr.querySelector('.status-input').value,payment=tr.querySelector('.payment-input').value;e.currentTarget.disabled=true;
    try{
      if(can('pedidos')){const {error}=await client().from('orders').update({quoted_total:quote===''?null:Number(quote),status}).eq('id',id);if(error)throw error;}
      if(can('pagos')){const {error}=await client().rpc('set_order_payment_status',{p_order_id:id,p_payment_status:payment});if(error)throw error;}
      message('loginMessage','Pedido actualizado correctamente.');await loadOrders();updateStats();
    }catch(err){alert(failText(err));e.currentTarget.disabled=false}
  }
  async function loadGarments(){if(!can('catalogo'))return;try{const {data,error}=await client().from('garments').select('id,name,category,description,sewing_price,active').order('name');if(error)throw error;state.garments=data||[];renderGarments();fillCompatibilitySelects()}catch(e){$('garmentsList').innerHTML=`<div class="empty">${escapeHtml(failText(e))}</div>`}}
  function renderGarments(){$('garmentsList').innerHTML=state.garments.length?state.garments.map(g=>`<div class="record"><div class="record-main"><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(g.description||'Sin descripción')} · Bs. ${money(g.sewing_price)}</small><span class="tag">${escapeHtml(g.category)} · ${g.active?'Publicado':'Oculto'}</span></div><div class="record-actions"><button class="button button-outline edit-garment" data-id="${g.id}">Editar</button><button class="button button-outline toggle-garment" data-id="${g.id}">${g.active?'Ocultar':'Publicar'}</button></div></div>`).join(''):'<div class="empty">No hay prendas registradas.</div>';
    document.querySelectorAll('.edit-garment').forEach(b=>b.onclick=()=>editGarment(b.dataset.id));document.querySelectorAll('.toggle-garment').forEach(b=>b.onclick=()=>toggleGarment(b.dataset.id));}
  function editGarment(id){const g=state.garments.find(x=>x.id===id);if(!g)return;$('garmentId').value=g.id;$('garmentName').value=g.name;$('garmentCategory').value=g.category;$('garmentDescription').value=g.description||'';$('garmentPrice').value=g.sewing_price;$('garmentActive').checked=g.active;$('garmentFormTitle').textContent='Editar prenda o arreglo';$('garmentForm').scrollIntoView({behavior:'smooth',block:'center'})}
  function resetGarment(){$('garmentForm').reset();$('garmentId').value='';$('garmentActive').checked=true;$('garmentFormTitle').textContent='Nueva prenda o arreglo';message('garmentMessage','')}
  async function saveGarment(e){e.preventDefault();const id=$('garmentId').value;const row={name:$('garmentName').value.trim(),category:$('garmentCategory').value,description:$('garmentDescription').value.trim(),sewing_price:$('garmentPrice').value===''?null:Number($('garmentPrice').value),active:$('garmentActive').checked};
    try{let result;if(id)result=await client().from('garments').update(row).eq('id',id).select('id').single();else result=await client().from('garments').insert(row).select('id').single();if(result.error)throw result.error;const garmentId=id||result.data.id;const file=$('garmentImage').files[0];if(file){await uploadImage(file,garmentId)}message('garmentMessage','Prenda guardada en Supabase.');resetGarment();await loadGarments();updateStats()}catch(err){message('garmentMessage',failText(err),true)}
  }
  async function uploadImage(file,garmentId){if(!file.type.startsWith('image/'))throw new Error('Selecciona un archivo de imagen.');const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'');const path=`${garmentId}/${crypto.randomUUID()}.${ext}`;const {error:upErr}=await client().storage.from('catalogo').upload(path,file,{contentType:file.type,upsert:false});if(upErr)throw upErr;const {error:rowErr}=await client().from('garment_images').insert({garment_id:garmentId,storage_path:path,alt_text:file.name});if(rowErr){await client().storage.from('catalogo').remove([path]);throw rowErr}}
  async function toggleGarment(id){const g=state.garments.find(x=>x.id===id);try{const {error}=await client().from('garments').update({active:!g.active}).eq('id',id);if(error)throw error;await loadGarments();updateStats()}catch(e){alert(failText(e))}}
  async function loadFabrics(){if(!can('catalogo'))return;try{const {data,error}=await client().from('fabrics').select('id,name,description,price_per_meter,active').order('name');if(error)throw error;state.fabrics=data||[];renderFabrics();await loadCompatibility()}catch(e){$('fabricsList').innerHTML=`<div class="empty">${escapeHtml(failText(e))}</div>`}}
  function renderFabrics(){$('fabricsList').innerHTML=state.fabrics.length?state.fabrics.map(f=>`<div class="record"><div class="record-main"><strong>${escapeHtml(f.name)}</strong><small>${escapeHtml(f.description||'Sin descripción')} · ${f.price_per_meter==null?'Precio a consultar':'Bs. '+money(f.price_per_meter)}/m</small><span class="tag">${f.active?'Disponible':'No disponible'}</span></div><div class="record-actions"><button class="button button-outline edit-fabric" data-id="${f.id}">Editar</button><button class="button button-outline toggle-fabric" data-id="${f.id}">${f.active?'Desactivar':'Activar'}</button></div></div>`).join(''):'<div class="empty">No hay materiales registrados.</div>';
    document.querySelectorAll('.edit-fabric').forEach(b=>b.onclick=()=>editFabric(b.dataset.id));document.querySelectorAll('.toggle-fabric').forEach(b=>b.onclick=()=>toggleFabric(b.dataset.id));}
  function editFabric(id){const f=state.fabrics.find(x=>x.id===id);if(!f)return;$('fabricId').value=f.id;$('fabricName').value=f.name;$('fabricDescription').value=f.description||'';$('fabricPrice').value=f.price_per_meter??'';$('fabricActive').checked=f.active;$('fabricFormTitle').textContent='Editar material';$('fabricForm').scrollIntoView({behavior:'smooth',block:'center'})}
  function resetFabric(){$('fabricForm').reset();$('fabricId').value='';$('fabricActive').checked=true;$('fabricFormTitle').textContent='Nuevo material';message('fabricMessage','')}
  async function saveFabric(e){e.preventDefault();const id=$('fabricId').value,price=$('fabricPrice').value;const row={name:$('fabricName').value.trim(),description:$('fabricDescription').value.trim(),price_per_meter:price===''?null:Number(price),active:$('fabricActive').checked};try{const {error}=id?await client().from('fabrics').update(row).eq('id',id):await client().from('fabrics').insert(row);if(error)throw error;message('fabricMessage','Material guardado en Supabase.');resetFabric();await loadFabrics();updateStats()}catch(err){message('fabricMessage',failText(err),true)}}
  async function toggleFabric(id){const f=state.fabrics.find(x=>x.id===id);try{const {error}=await client().from('fabrics').update({active:!f.active}).eq('id',id);if(error)throw error;await loadFabrics();updateStats()}catch(e){alert(failText(e))}}
  function fillCompatibilitySelects(){const opts=state.garments.map(g=>`<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');$('compatGarment').innerHTML=opts||'<option value="">Primero registra una prenda</option>'}
  function fillFabricSelect(){ $('compatFabric').innerHTML=state.fabrics.map(f=>`<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')||'<option value="">Primero registra una tela</option>' }
  async function loadCompatibility(){const {data,error}=await client().from('garment_fabrics').select('garment_id,fabric_id');if(error)throw error;state.compatibility=data||[];fillFabricSelect();renderCompatibility()}
  function renderCompatibility(){const byId=(arr,id)=>arr.find(x=>x.id===id);$('compatibilityList').innerHTML=state.compatibility.map(c=>{const g=byId(state.garments,c.garment_id),f=byId(state.fabrics,c.fabric_id);if(!g||!f)return '';return `<span class="compat-chip">${escapeHtml(g.name)} ↔ ${escapeHtml(f.name)} <button type="button" class="remove-compat" data-g="${c.garment_id}" data-f="${c.fabric_id}" aria-label="Quitar compatibilidad">×</button></span>`}).join('')||'<span class="help-text">Todavía no hay materiales asignados.</span>';document.querySelectorAll('.remove-compat').forEach(b=>b.onclick=()=>removeCompatibility(b.dataset.g,b.dataset.f))}
  async function addCompatibility(e){e.preventDefault();const garment_id=$('compatGarment').value,fabric_id=$('compatFabric').value;if(!garment_id||!fabric_id)return;try{const {error}=await client().from('garment_fabrics').upsert({garment_id,fabric_id});if(error)throw error;message('compatMessage','Material asignado.');await loadCompatibility()}catch(err){message('compatMessage',failText(err),true)}}
  async function removeCompatibility(g,f){try{const {error}=await client().from('garment_fabrics').delete().eq('garment_id',g).eq('fabric_id',f);if(error)throw error;await loadCompatibility()}catch(e){alert(failText(e))}}
  function updateStats(){$('statOrders').textContent=state.orders.length;$('statPending').textContent=state.orders.filter(o=>o.status==='pendiente').length;$('statGarments').textContent=state.garments.filter(g=>g.active).length;$('statFabrics').textContent=state.fabrics.filter(f=>f.active).length}
  function bind(){ $('loginForm').addEventListener('submit',signIn);$('signOutBtn').addEventListener('click',signOut);$('deniedSignOut').addEventListener('click',signOut);$('refreshOrders').addEventListener('click',loadOrders);$('refreshGarments').addEventListener('click',loadGarments);$('refreshFabrics').addEventListener('click',loadFabrics);$('garmentForm').addEventListener('submit',saveGarment);$('fabricForm').addEventListener('submit',saveFabric);$('compatibilityForm').addEventListener('submit',addCompatibility);$('resetGarment').addEventListener('click',resetGarment);$('resetFabric').addEventListener('click',resetFabric); }
  document.addEventListener('DOMContentLoaded',()=>{bind();checkSession()});
})();
