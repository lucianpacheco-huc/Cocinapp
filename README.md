# CocinApp — Gestión de talleres de cocina para colegios

Maqueta funcional para liceos técnico-profesionales con la especialidad de **Gastronomía (mención Cocina)**.
Cubre el ciclo completo: **ideación con IA → recetario → calendario anual → explosión de materiales → validación y firma → liberación al proveedor → solicitud de pedido → recepción → ERP SAP**.

Repositorio independiente `Cocinapp`, con su propio sitio Netlify.

```
Cocinapp/
├── netlify.toml              publish = public · functions = netlify/functions
├── package.json              dependencia @anthropic-ai/sdk
├── README.md
├── public/                   frontend estático (raíz del sitio)
│   ├── index.html            8 pantallas del flujo
│   ├── app.js                lógica: BOM, firma, pedidos, recepción, llamadas a funciones
│   ├── data.js               datos semilla: cursos, insumos, recetas, calendario
│   └── styles.css
└── netlify/functions/        backend serverless
    ├── cocinapp-ia.js        Claude API
    └── cocinapp-sap.js       SAP Business One Service Layer
```

- URL: `https://<sitio-cocinapp>.netlify.app/` (la app queda en la raíz del sitio)

---

## 1. Flujo y roles

| Paso | Pantalla | Quién | Resultado |
|---|---|---|---|
| 1 | Ideación IA | Alumno/a, Profesor/a | Informe de estado del arte (Chile + mundo) y propuesta convertida en receta estandarizada |
| 2 | Recetario | Profesor/a | Evaluación con rúbrica IA y aprobación de propuestas |
| 3 | Calendario | **Profesor/a coordinador/a** | Vistas **Mes** (un recuadro por día, como Google Calendar / Outlook), **Semana**, **Día** (detalle con ingredientes vigentes y cantidades para el curso) y **Año** (lista de 38 semanas × cursos) |
| 4 | Explosión de materiales | Profesor/a | Lista consolidada de insumos de la semana, todo el colegio, desglosada por nivel |
| 5 | Validar y liberar | Profesor/a | Ajuste, **firma** (lista firme) y liberación al proveedor |
| 6 | Proveedor · Pedidos | Proveedor | Programa la entrega → se genera **solicitud de pedido** (OC en SAP) → despacho |
| 7 | Recepción | Bodega / Profesor/a | Cantidades recibidas, calidad, diferencias → **Entrada de mercancías** en SAP |
| 8 | Integración SAP | Administración | Bitácora de documentos y payloads enviados |

Estados de cada semana: `Planificada → BOM explotada → Validada (firme) → Liberada → Pedido emitido → Despachado → Recepcionado`.
Una semana validada bloquea su fila del calendario (no se puede cambiar lo ya firmado sin reabrir).

En la maqueta el **selector de Rol** (arriba a la derecha) simula los permisos; los datos viven en `localStorage` del navegador (botón **↺ Demo** para reiniciar).

---

## 2. Herramientas de IA (Claude)

Función: `netlify/functions/cocinapp-ia.js` — SDK oficial `@anthropic-ai/sdk`, modelo `claude-opus-5-5` (configurable con `COCINAPP_MODEL`).

| Acción | Herramientas de Claude | Uso |
|---|---|---|
| `estado_arte` | **Web search** (`web_search_20260209`, máx. 5 búsquedas) + pensamiento adaptativo | Tendencias de cocina chilena y mundial, ingredientes con potencial, ideas de platos y fuentes |
| `desarrollar_receta` | **Salidas estructuradas** (`output_config.format` con JSON Schema) | Convierte la idea libre del alumno en receta estándar (porciones base, g/ml/u, pasos, alérgenos, objetivo de aprendizaje) y **mapea cada ingrediente al SKU del catálogo** del colegio |
| `evaluar_propuesta` | Salidas estructuradas | Rúbrica de 5 criterios (pertinencia curricular, identidad, factibilidad, costo/porción, inocuidad) → `aprobar / aprobar_con_cambios / rechazar` |

Buenas prácticas incluidas:
- `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): si un clasificador de seguridad rechaza, la API reintenta en otro modelo; además se verifica `stop_reason === "refusal"`.
- Esfuerzo (`effort`) bajo para búsqueda/rúbrica y medio para estandarizar recetas.
- Manejo de errores tipado (`RateLimitError`, `APIError`).
- Si la API no está configurada, el frontend cae a **modo demo** con datos de ejemplo.

Evoluciones sugeridas (fase 2):
- **Batches API** (50 % más barato) para generar en lote fichas técnicas de todo el recetario.
- **Prompt caching** del catálogo de insumos y del programa de estudios (Mineduc) en el `system`.
- **Visión**: foto del plato terminado → retroalimentación de emplatado para el alumno.
- **Background Functions** de Netlify para el informe con búsqueda web (evita el límite de tiempo de funciones síncronas).
- Sugerencia automática del calendario anual (secuencia de técnicas por módulo y estacionalidad de productos).

---

## 3. Algoritmos

### 3.1 Explosión de materiales (MRP simplificado) — `public/app.js → explotar()`

Para la semana *w*, por cada curso *c* con receta *r* e insumo *i*:

```
porciones_c      = alumnos_c × porciones_por_alumno_c
factor_escala    = porciones_c ÷ porciones_base_r
bruto[i]        += cantidad_r,i × factor_escala × (1 + merma_i)       (desglosado por nivel)
neto[i]          = max(0, bruto[i] − stock_bodega[i])
a_comprar[i]     = ⌈ neto[i] ÷ factor_compra_i ÷ paso_i ⌉ × paso_i   (formato del proveedor: kg, L, bandeja 30u…)
subtotal[i]      = a_comprar[i] × precio_i
```

- **Merma** por insumo (ej. palta 30 %, limón 40 %, cebolla 12 %).
- **Stock** de bodega descontado antes de pedir.
- **Redondeo al formato de compra** (múltiplos de 0,5 kg, bandejas, atados, bolsas).
- Cambiar el calendario después de explotar invalida la BOM (hay que volver a explotar).

### 3.2 Costeo de receta
`costo_porción = Σ (cantidad × (1+merma) ÷ factor × precio) ÷ porciones_base` — se muestra en el recetario y se envía a la rúbrica IA.

### 3.3 Programación de entregas
Fecha sugerida = viernes anterior a la semana de clases; ventana horaria seleccionable. Cada entrega confirmada genera un N° `SP-AAAA-NNNN` (solicitud de pedido) y la OC en SAP.

### 3.4 Recepción
Diferencia por línea = recibido − pedido; si alguna línea es menor o no pasa calidad → recepción **PARCIAL**. Solo se contabiliza en SAP lo recibido (> 0).

### 3.5 Vigencias (fechas efectivas) de recetas e ingredientes

Cada **receta** tiene `vigenteDesde` y `vigenteHasta` (vacío = indefinida), y cada **ingrediente** de la receta es una línea con `cantidad`, `desde` y `hasta`.

- **Dar de baja una receta** (ej. charquicán): se pone término = hoy. Hoy todavía está vigente; desde mañana no aparece para programar en el calendario. Se puede reactivar.
- **Grilla de ingredientes editable**: cantidad, inicio y término se editan directamente en cada línea. El botón **+** al lado derecho de cada línea (o en el encabezado) abre una fila nueva para agregar un componente con su propia vigencia; si se abre desde una línea con término, la nueva queda precargada con el mismo insumo y con inicio al día siguiente.
- **Validaciones**: cantidad > 0, inicio obligatorio, término ≥ inicio, y **dos líneas del mismo insumo no pueden superponerse** en el tiempo (evita contar doble en la explosión).
- **Cambiar una cantidad conservando la historia**: poner término a la línea actual y agregar con + una línea nueva desde el día siguiente. Eliminar una línea (🗑) pide confirmación; para dejar de usar un insumo se recomienda poner término.
- **Consulta a una fecha**: el recetario se puede ver "al día X", mostrando qué recetas estaban vigentes y con qué ingredientes (vigente / vencida / futura).
- **Calendario**: en cada celda solo se ofrecen recetas vigentes en la fecha real de esa clase; si una receta programada pierde vigencia, la celda queda marcada con ⚠.
- **Explosión de materiales**: usa los ingredientes vigentes en la fecha de cada clase, omite recetas no vigentes y guarda una **foto de las preparaciones** (fecha, curso, porciones, ingredientes y cantidades usadas). Así se puede consultar después qué se preparó, cuándo y con qué ingredientes, aunque la receta cambie más tarde.

---

## 4. Integración SAP

Función: `netlify/functions/cocinapp-sap.js` — **SAP Business One Service Layer** (REST/OData):

| Evento CocinApp | Documento SAP | Endpoint |
|---|---|---|
| Proveedor programa entrega | Orden de compra | `POST /b1s/v1/PurchaseOrders` |
| Bodega confirma recepción | Entrada de mercancías (ref. a la OC, `BaseType 22`) | `POST /b1s/v1/PurchaseDeliveryNotes` |

Mapeo: `sku → ItemCode`, proveedor → `CardCode`, N° de solicitud → `NumAtCard`, bodega de cocina → `WarehouseCode`.
Si el ERP es **SAP S/4HANA**, se reemplaza por `API_PURCHASEORDER_PROCESS_SRV` y `API_MATERIAL_DOCUMENT_SRV` (movimiento 101); el mapeo es el mismo.
Sin credenciales la función responde en **modo simulado** con DocEntry/DocNum ficticios y el payload que se enviaría.

---

## 5. Configuración en Netlify

Sitio nuevo: Add new site → Import an existing project → GitHub → repositorio `Cocinapp`
→ Base directory vacío (raíz); publish y functions se leen de `netlify.toml`.

Site settings → Environment variables:

| Variable | Obligatoria | Ejemplo |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí (para IA real) | `sk-ant-…` |
| `COCINAPP_MODEL` | No | `claude-opus-5-5` |
| `SAP_SL_URL` | Para SAP real | `https://sap.colegio.cl:50000/b1s/v1` |
| `SAP_COMPANY_DB` | Para SAP real | `SBO_COLEGIO` |
| `SAP_USER` / `SAP_PASSWORD` | Para SAP real | — |
| `SAP_WAREHOUSE` | No | `COCINA` |

Las dependencias (`@anthropic-ai/sdk`) se instalan desde `package.json` en el build de Netlify.

---

## 6. Arquitectura objetivo (producción)

```
Navegador (PWA CocinApp)
   │
   ├── Netlify Functions ──► Claude API (ideación, recetas, rúbricas)
   │         │
   │         ├──► Base de datos (Supabase/Postgres): recetas, calendario, semanas, pedidos, firmas, auditoría
   │         └──► SAP B1 Service Layer / S/4HANA OData (OC, entradas de mercancías, maestro de artículos y proveedores)
   │
   └── Autenticación (Google Workspace del colegio / Clave Única) con roles: alumno, profesor, coordinador, proveedor, bodega
```

Pendientes para pasar de maqueta a producción: base de datos compartida, login con roles reales, firma electrónica con registro de auditoría, sincronización del maestro de artículos y precios desde SAP, notificaciones (correo/WhatsApp) al proveedor al liberar una semana.
