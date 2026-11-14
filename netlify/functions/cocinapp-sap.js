// netlify/functions/cocinapp-sap.js
//
// CocinApp — Integración con el ERP SAP.
//
// Implementado contra SAP Business One Service Layer (REST/OData v4):
//   POST /b1s/v1/Login                  → sesión (cookie B1SESSION)
//   POST /b1s/v1/PurchaseOrders         → Orden de compra (al liberar/programar entrega)
//   POST /b1s/v1/PurchaseDeliveryNotes  → Entrada de mercancías (al recepcionar),
//                                         referenciando la OC (BaseType 22)
//
// Si el ERP es SAP S/4HANA, el equivalente es:
//   API_PURCHASEORDER_PROCESS_SRV (A_PurchaseOrder) y
//   API_MATERIAL_DOCUMENT_SRV (A_MaterialDocumentHeader, GoodsMovementType 101).
//
// Si no están las variables de entorno, la función responde en MODO SIMULADO
// (útil para la maqueta / demo), devolviendo DocEntry ficticios.
//
// Variables de entorno:
//   SAP_SL_URL       ej: https://sap.colegio.cl:50000/b1s/v1
//   SAP_COMPANY_DB   ej: SBO_COLEGIO
//   SAP_USER, SAP_PASSWORD
//   SAP_WAREHOUSE    (opcional) bodega de cocina, ej: "COCINA"

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

async function sapLogin(base) {
  const res = await fetch(`${base}/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CompanyDB: process.env.SAP_COMPANY_DB,
      UserName: process.env.SAP_USER,
      Password: process.env.SAP_PASSWORD
    })
  });
  if (!res.ok) throw new Error(`Login SAP falló (${res.status})`);
  const cookie = res.headers.get("set-cookie") || "";
  const session = /B1SESSION=([^;]+)/.exec(cookie)?.[1];
  const route = /ROUTEID=([^;]+)/.exec(cookie)?.[1];
  return `B1SESSION=${session}` + (route ? `; ROUTEID=${route}` : "");
}

async function sapPost(base, cookie, path, payload) {
  const res = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message?.value || `SAP ${path} ${res.status}`);
  return data;
}

// --- Mapeos CocinApp → SAP B1 ---
const ordenCompraB1 = (p) => ({
  CardCode: p.proveedorCardCode,               // código del proveedor en SAP
  DocDate: p.fecha,
  DocDueDate: p.fechaEntrega,
  NumAtCard: p.pedidoId,                        // N° de pedido CocinApp
  Comments: `CocinApp · Semana ${p.semana} · ${p.colegio || ""}`.trim(),
  DocumentLines: p.lineas.map((l) => ({
    ItemCode: l.sku,
    Quantity: l.cantidad,
    UnitPrice: l.precio,
    WarehouseCode: process.env.SAP_WAREHOUSE || undefined
  }))
});

const entradaMercanciasB1 = (r) => ({
  CardCode: r.proveedorCardCode,
  DocDate: r.fechaRecepcion,
  Comments: `Recepción CocinApp pedido ${r.pedidoId}. ${r.observacion || ""}`.trim(),
  DocumentLines: r.lineas
    .filter((l) => l.cantidadRecibida > 0)
    .map((l) => ({
      BaseType: 22,                // 22 = Orden de compra
      BaseEntry: r.docEntryOC,     // DocEntry de la OC creada antes
      BaseLine: l.lineNum,
      Quantity: l.cantidadRecibida
    }))
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido" }); }
  const { tipo, documento } = body;
  if (!documento) return json(400, { error: "Falta 'documento'" });

  let payload, path;
  if (tipo === "orden_compra") { payload = ordenCompraB1(documento); path = "PurchaseOrders"; }
  else if (tipo === "entrada_mercancias") { payload = entradaMercanciasB1(documento); path = "PurchaseDeliveryNotes"; }
  else return json(400, { error: "tipo debe ser orden_compra | entrada_mercancias" });

  const base = process.env.SAP_SL_URL;
  if (!base || !process.env.SAP_USER) {
    // MODO SIMULADO
    return json(200, {
      ok: true,
      simulado: true,
      endpoint: `POST /b1s/v1/${path}`,
      payload,
      DocEntry: Math.floor(10000 + Math.random() * 90000),
      DocNum: Math.floor(500000 + Math.random() * 99999)
    });
  }

  try {
    const cookie = await sapLogin(base);
    const r = await sapPost(base, cookie, path, payload);
    return json(200, { ok: true, simulado: false, endpoint: `POST /b1s/v1/${path}`, DocEntry: r.DocEntry, DocNum: r.DocNum });
  } catch (err) {
    return json(502, { ok: false, error: err.message, payload });
  }
};
