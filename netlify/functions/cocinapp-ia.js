// netlify/functions/cocinapp-ia.js
//
// CocinApp — Funcionalidad 1: Etapa creativa asistida por IA (Claude).
//
// Acciones (POST JSON { accion, ... }):
//   - "estado_arte"       : investiga tendencias de cocina nacional (Chile) y mundial
//                           usando la herramienta web_search de Claude. Devuelve
//                           un informe estructurado con fuentes.
//   - "desarrollar_receta": toma la idea de un alumno o profesor y la convierte en
//                           una receta estandarizada (ingredientes en g/ml/u mapeados
//                           al catálogo de insumos del colegio), lista para el
//                           calendario y la explosión de materiales.
//   - "evaluar_propuesta" : rúbrica pedagógica / costo / factibilidad para que el
//                           profesor decida si aprueba una propuesta.
//
// Variables de entorno (Netlify → Site settings → Environment variables):
//   ANTHROPIC_API_KEY   (obligatoria)
//   COCINAPP_MODEL      (opcional, por defecto claude-opus-5-5)
//
// Nota: las funciones síncronas de Netlify tienen límite de tiempo. Para el
// informe de estado del arte con búsqueda web se recomienda en producción
// usar una Background Function (cocinapp-ia-background.js) y guardar el
// resultado en la base de datos.

const Anthropic = require("@anthropic-ai/sdk");

const MODEL = process.env.COCINAPP_MODEL || "claude-opus-5-5";

const SYSTEM = `Eres el asistente culinario-pedagógico de CocinApp, una plataforma para liceos técnico-profesionales de Chile con la especialidad de Gastronomía (mención Cocina).
Tu público son alumnos de 3° y 4° medio y sus profesores. Responde siempre en español de Chile.
Principios:
- Pon en valor la cocina chilena (productos de temporada, pueblos originarios, cocina regional) y conéctala con tendencias mundiales.
- Las recetas deben ser realizables en un taller escolar: equipamiento estándar, costos acotados, seguridad e inocuidad alimentaria (HACCP básico), alérgenos declarados.
- Usa unidades métricas (g, ml, u) y cantidades por porción base explícita.
- Cuando un ingrediente exista en el catálogo de insumos entregado, usa exactamente su "sku". Si no existe, deja sku en null y propón un nombre claro.`;

// ---------- Esquemas de salida estructurada ----------
const RECETA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["nombre", "descripcion", "origen_cultural", "tecnicas", "porciones_base", "tiempo_min", "dificultad", "ingredientes", "pasos", "alergenos", "objetivo_aprendizaje"],
  properties: {
    nombre: { type: "string" },
    descripcion: { type: "string" },
    origen_cultural: { type: "string" },
    tecnicas: { type: "array", items: { type: "string" } },
    porciones_base: { type: "integer" },
    tiempo_min: { type: "integer" },
    dificultad: { type: "string", enum: ["básica", "intermedia", "avanzada"] },
    ingredientes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sku", "nombre", "cantidad", "unidad"],
        properties: {
          sku: { type: ["string", "null"] },
          nombre: { type: "string" },
          cantidad: { type: "number" },
          unidad: { type: "string", enum: ["g", "ml", "u"] }
        }
      }
    },
    pasos: { type: "array", items: { type: "string" } },
    alergenos: { type: "array", items: { type: "string" } },
    objetivo_aprendizaje: { type: "string" }
  }
};

const EVALUACION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["puntaje_total", "criterios", "recomendacion", "mejoras"],
  properties: {
    puntaje_total: { type: "integer" },
    criterios: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["criterio", "puntaje", "comentario"],
        properties: { criterio: { type: "string" }, puntaje: { type: "integer" }, comentario: { type: "string" } }
      }
    },
    recomendacion: { type: "string", enum: ["aprobar", "aprobar_con_cambios", "rechazar"] },
    mejoras: { type: "array", items: { type: "string" } }
  }
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

// Llama a Claude con fallback de rechazo del lado del servidor.
async function llamarClaude(client, params) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    ...params
  });
  if (response.stop_reason === "refusal") {
    throw new Error("La IA declinó la solicitud: " + (response.stop_details?.explanation || "sin detalle"));
  }
  return response;
}

const textoDe = (response) =>
  response.content.filter((b) => b.type === "text").map((b) => b.text).join("");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(500, { error: "Falta ANTHROPIC_API_KEY en las variables de entorno de Netlify" });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "JSON inválido" }); }

  const client = new Anthropic();

  try {
    switch (body.accion) {
      // ------------------------------------------------------------------
      case "estado_arte": {
        const { tema = "cocina chilena contemporánea", ambito = "nacional y mundial" } = body;
        const response = await llamarClaude(client, {
          output_config: { effort: "low" },
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
          messages: [{
            role: "user",
            content: `Investiga el estado del arte de "${tema}" (ámbito: ${ambito}).
Entrega en Markdown:
1. Cinco tendencias actuales (con un ejemplo de restaurante, cocinero/a o producto por cada una).
2. Tres ingredientes o técnicas chilenas con potencial de reinterpretación.
3. Cinco ideas de platos que un alumno de 3°/4° medio podría proponer, con costo estimado bajo/medio/alto.
4. Fuentes consultadas (URL).`
          }]
        });
        return json(200, { ok: true, informe: textoDe(response), modelo: response.model });
      }

      // ------------------------------------------------------------------
      case "desarrollar_receta": {
        const { idea, autor = "alumno", nivel = "3° medio", catalogo = [] } = body;
        if (!idea) return json(400, { error: "Falta 'idea'" });
        const response = await llamarClaude(client, {
          output_config: { effort: "medium", format: { type: "json_schema", schema: RECETA_SCHEMA } },
          messages: [{
            role: "user",
            content: `Idea propuesta por un ${autor} de ${nivel}:\n"""${idea}"""\n\nCatálogo de insumos disponibles (sku | nombre | unidad):\n${catalogo.map((c) => `${c.sku} | ${c.nombre} | ${c.unidad}`).join("\n")}\n\nDesarrolla una receta estandarizada para 4 porciones base.`
          }]
        });
        return json(200, { ok: true, receta: JSON.parse(textoDe(response)) });
      }

      // ------------------------------------------------------------------
      case "evaluar_propuesta": {
        const { receta } = body;
        if (!receta) return json(400, { error: "Falta 'receta'" });
        const response = await llamarClaude(client, {
          output_config: { effort: "low", format: { type: "json_schema", schema: EVALUACION_SCHEMA } },
          messages: [{
            role: "user",
            content: `Evalúa esta propuesta con una rúbrica de 5 criterios (0-4 pts c/u): pertinencia curricular, identidad/creatividad, factibilidad en taller escolar, costo por porción, inocuidad y alérgenos.\n\n${JSON.stringify(receta)}`
          }]
        });
        return json(200, { ok: true, evaluacion: JSON.parse(textoDe(response)) });
      }

      default:
        return json(400, { error: "accion desconocida. Usa estado_arte | desarrollar_receta | evaluar_propuesta" });
    }
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json(429, { error: "Límite de uso de la IA, reintenta en un momento" });
    if (err instanceof Anthropic.APIError) return json(502, { error: `Error de la API de Claude (${err.status}): ${err.message}` });
    return json(500, { error: err.message });
  }
};
