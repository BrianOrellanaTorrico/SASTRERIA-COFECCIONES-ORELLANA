(() => {
  const $ = id => document.getElementById(id);
  const db = () => window.ORELLANA_SUPABASE;
  const bucket = 'catalogo';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (id, text, error=false) => { const el=$(id); if(el){el.textContent=text;el.classList.toggle('error',error);} };
  let isManager = false;
  async function authorize() {
    if (!db()) return;
    const { data:{session} } = await db().auth.getSession();
    if (!session) return;
    const { data:profile, error } = await db().from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    if (error || !profile || !['owner','admin'].includes(profile.role)) return;
    isManager = true;
    await loadLocation();
  }
  async function loadLocation() {
    if (!isManager) return;
    try {
      const [{data:settings,error:settingsError},{data:photos,error:photosError}] = await Promise.all([
        db().from('store_location').select('address,map_query,maps_url').eq('id',true).maybeSingle(),
        db().from('store_location_images').select('id,storage_path,alt_text,sort_order').order('sort_order').order('created_at')
      ]);
      if(settingsError) throw settingsError;
      if(photosError) throw photosError;
      $('storeLocationAddress').value=settings?.address||'';
      $('storeLocationMapQuery').value=settings?.map_query||'';
      $('storeLocationMapsUrl').value=settings?.maps_url||'';
      renderPhotos(photos||[]);
    } catch(error) { say('storeLocationMessage',error.message||'No se pudo cargar la ubicación.',true); }
  }
  function renderPhotos(photos) {
    const root=$('storeLocationAdminGallery'); root.replaceChildren();
    photos.forEach(photo=>{
      const {data}=db().storage.from(bucket).getPublicUrl(photo.storage_path);
      const figure=document.createElement('figure'); figure.className='store-admin-photo';
      const img=document.createElement('img'); img.src=data.publicUrl; img.alt=photo.alt_text||'Fotografía del taller'; img.loading='lazy';
      const caption=document.createElement('figcaption'); caption.textContent=photo.alt_text||'Fotografía del taller';
      const remove=document.createElement('button'); remove.type='button'; remove.className='button button-outline'; remove.textContent='Eliminar fotografía';
      remove.addEventListener('click',()=>deletePhoto(photo));
      figure.append(img,caption,remove); root.appendChild(figure);
    });
    if(!photos.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Todavía no hay fotografías cargadas.';root.appendChild(empty);}
  }
  async function saveLocation(event) {
    event.preventDefault();
    if(!isManager) return say('storeLocationMessage','Inicia sesión con una cuenta administrativa.',true);
    const address=$('storeLocationAddress').value.trim(), map_query=$('storeLocationMapQuery').value.trim(), maps_url=$('storeLocationMapsUrl').value.trim();
    if(!address||!map_query) return say('storeLocationMessage','Completa la dirección y la ubicación para el mapa.',true);
    if(maps_url && !/^https?:\/\//i.test(maps_url)) return say('storeLocationMessage','El enlace de Google Maps debe comenzar con http:// o https://.',true);
    say('storeLocationMessage','Guardando ubicación…');
    const {error}=await db().from('store_location').upsert({id:true,address,map_query,maps_url},{onConflict:'id'});
    if(error) return say('storeLocationMessage',error.message,true);
    say('storeLocationMessage','Ubicación guardada. Los clientes verán los cambios al actualizar la página.');
  }
  async function uploadPhotos() {
    if(!isManager) return say('storeLocationUploadMessage','Inicia sesión con una cuenta administrativa.',true);
    const files=Array.from($('storeLocationFiles').files||[]);
    if(!files.length) return say('storeLocationUploadMessage','Selecciona al menos una fotografía.',true);
    say('storeLocationUploadMessage','Subiendo fotografías…');
    let completed=0;
    for(const file of files) {
      if(!file.type.startsWith('image/')) { say('storeLocationUploadMessage','Se omitió un archivo que no es una imagen.',true); continue; }
      if(file.size>8*1024*1024) { say('storeLocationUploadMessage','Cada fotografía debe pesar como máximo 8 MB.',true); continue; }
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
      const path='ubicacion/'+crypto.randomUUID()+'.'+ext;
      const {error:uploadError}=await db().storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError) { say('storeLocationUploadMessage',uploadError.message,true); continue; }
      const {error:rowError}=await db().from('store_location_images').insert({storage_path:path,alt_text:'CONFECCIONES ORELLANA · '+file.name,sort_order:Date.now()});
      if(rowError) { await db().storage.from(bucket).remove([path]); say('storeLocationUploadMessage',rowError.message,true); continue; }
      completed++;
    }
    $('storeLocationFiles').value='';
    if(completed) say('storeLocationUploadMessage',completed+' fotografía(s) subida(s) correctamente.');
    await loadLocation();
  }
  async function deletePhoto(photo) {
    if(!isManager || !confirm('¿Eliminar esta fotografía de la galería pública?')) return;
    const {error:rowError}=await db().from('store_location_images').delete().eq('id',photo.id);
    if(rowError) return say('storeLocationUploadMessage',rowError.message,true);
    const {error:storageError}=await db().storage.from(bucket).remove([photo.storage_path]);
    if(storageError) say('storeLocationUploadMessage','La fotografía se quitó de la galería, pero no se pudo borrar el archivo: '+storageError.message,true);
    await loadLocation();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('storeLocationForm')?.addEventListener('submit',saveLocation);
    $('refreshStoreLocation')?.addEventListener('click',loadLocation);
    $('uploadStoreLocationImages')?.addEventListener('click',uploadPhotos);
    db()?.auth.onAuthStateChange((event)=>{ if(event==='SIGNED_IN') setTimeout(authorize,0); });
    authorize();
  });
})();