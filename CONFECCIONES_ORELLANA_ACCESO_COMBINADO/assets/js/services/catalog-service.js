// Catálogo
// Capa de acceso a datos. Se activa al configurar Supabase y aplicar schema.sql.
window.OrellanaCatalogService = {
  client() {
    if (!window.ORELLANA_SUPABASE) {
      throw new Error("Supabase no está configurado.");
    }
    return window.ORELLANA_SUPABASE;
  },

  async listGarments() {
    const { data, error } = await this.client()
      .from("garments")
      .select("id, name, category, description, sewing_price, active, garment_images(id, storage_path, alt_text)")
      .eq("active", true)
      .order("name");
    if (error) throw error;
    return data || [];
  },

  async listFabrics() {
    const { data, error } = await this.client()
      .from("fabrics")
      .select("id, name, description, price_per_meter, active")
      .eq("active", true)
      .order("name");
    if (error) throw error;
    return data || [];
  },

  async listGarmentFabrics(garmentId) {
    const { data, error } = await this.client()
      .from("garment_fabrics")
      .select("fabrics(id,name,price_per_meter)")
      .eq("garment_id", garmentId);
    if (error) throw error;
    return (data || []).map(row => row.fabrics).filter(Boolean);
  },

  publicImageUrl(storagePath) {
    if (!storagePath) return "";
    const { data } = this.client().storage.from("catalogo").getPublicUrl(storagePath);
    return data?.publicUrl || "";
  },

  async uploadCatalogImage(file, garmentId) {
    if (!file || !garmentId) throw new Error("Falta la imagen o la prenda.");
    if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${garmentId}/${Date.now()}-${safeName}`;
    const client = this.client();
    const { error: uploadError } = await client.storage
      .from("catalogo").upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: publicData } = client.storage.from("catalogo").getPublicUrl(path);
    const { error: rowError } = await client.from("garment_images").insert({
      garment_id: garmentId,
      storage_path: path,
      alt_text: file.name
    });
    if (rowError) {
      await client.storage.from("catalogo").remove([path]);
      throw rowError;
    }
    return publicData.publicUrl;
  }
};
