(() => {
  const client = () => window.ORELLANA_SUPABASE;
  const safeUrl = (value) => {
    try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : ''; }
    catch (_) { return ''; }
  };
  async function loadStoreLocation() {
    const db = client();
    if (!db) return;
    try {
      const [{ data: settings, error: settingsError }, { data: photos, error: photosError }] = await Promise.all([
        db.from('store_location').select('address,map_query,maps_url').eq('id', true).maybeSingle(),
        db.from('store_location_images').select('id,storage_path,alt_text,sort_order').order('sort_order').order('created_at')
      ]);
      if (settingsError) throw settingsError;
      if (photosError) throw photosError;
      const map = document.getElementById('storeLocationMap');
      const link = document.getElementById('storeLocationLink');
      const description = document.getElementById('storeLocationDescription');
      const query = String(settings?.map_query || settings?.address || '').trim();
      if (map && query) map.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(query) + '&output=embed';
      if (link) {
        const target = safeUrl(settings?.maps_url) || (query ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query) : '');
        if (target) link.href = target;
        else link.hidden = true;
      }
      if (description) description.textContent = settings?.address || 'Consulta el mapa para encontrar nuestro taller.';
      const gallery = document.getElementById('storeLocationGallery');
      if (gallery) {
        gallery.replaceChildren();
        (photos || []).forEach(photo => {
          const { data } = db.storage.from('catalogo').getPublicUrl(photo.storage_path);
          const src = safeUrl(data?.publicUrl);
          if (!src) return;
          const figure = document.createElement('figure');
          const img = document.createElement('img');
          img.src = src; img.alt = photo.alt_text || 'Fotografía del taller CONFECCIONES ORELLANA'; img.loading = 'lazy';
          figure.appendChild(img); gallery.appendChild(figure);
        });
        if (!gallery.children.length) {
          const empty = document.createElement('p'); empty.className = 'map-note';
          empty.textContent = 'Próximamente compartiremos fotografías de nuestro taller.'; gallery.appendChild(empty);
        }
      }
    } catch (error) {
      console.warn('No se pudo cargar la ubicación del taller:', error);
      const gallery = document.getElementById('storeLocationGallery');
      if (gallery) gallery.textContent = 'No fue posible cargar las fotografías en este momento.';
    }
  }
  document.addEventListener('DOMContentLoaded', loadStoreLocation);
})();