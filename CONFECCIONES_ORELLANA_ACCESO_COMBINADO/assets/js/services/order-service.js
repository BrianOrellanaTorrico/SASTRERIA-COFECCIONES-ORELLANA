// CONFECCIONES ORELLANA | Envío de pedidos a Supabase
window.OrellanaOrderService = {
  async submit(order) {
    const client = window.ORELLANA_SUPABASE;
    if (!client) throw new Error("La conexión con la base de datos todavía no está configurada.");
    const details = {
      request_type: order.requestType,
      service: order.service,
      measurements_unknown: Boolean(order.measurementsUnknown),
      measurements: order.measurements || "",
      fabric: order.fabric || "Por confirmar",
      color: order.color || "",
      details: order.details || "",
      payment_method: order.payment || "Sin adelanto",
      payment_note: order.paymentStatus || "Sin revisar",
      items: Array.isArray(order.items) ? order.items : [],
      reference_image: order.referenceImage || null
    };
    const { data, error } = await client.rpc("submit_public_order", {
      p_customer_name: order.name,
      p_customer_phone: order.phone,
      p_order_details: details,
      p_quoted_total: Number.isFinite(order.quotedTotal) ? order.quotedTotal : null
    });
    if (error) throw error;
    return data;
  }
};
