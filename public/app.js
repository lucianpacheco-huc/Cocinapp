/* CocinApp — maqueta funcional (vanilla JS, estado en localStorage). */
(() => {
  const KEY = "cocinapp-demo-v1";
  const SEED = window.COCINAPP_SEED;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clp = (n) => "$" + Math.round(n).toLocaleString("es-CL");
  const fmt = (n, d = 2) => Number(n).toLocaleString("es-CL", { maximumFractionDigits: d });

  // ---------------- Estado ----------------
  const fresh = () => ({
    rol: "coordinador",
    semana: 1,
    recetas: JSON.parse(JSON.stringify(SEED.recetas)),
    calendario: JSON.parse(JSON.stringify(SEED.calendario)),
    semanas: {},          // n -> { estado, lineas, firma, liberada, entrega, pedido, recepcion }
    sapLog: [],
    seq: { receta: 12, pedido: 1 }
  });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  const insumo = (sku) => SEED.insumos.find((i) => i.sku === sku);
  const receta = (id) => S.recetas.find((r) => r.id === id);
  const sem = (n) => (S.semanas[n] ||= { estado: "planificada" });

  const FLUJO = ["planificada", "explotada", "validada", "liberada", "pedido", "despachado", "recepcionado"];
  const ETQ = { planificada: "Planificada", explotada: "BOM explotada", validada: "Validada (firme)", liberada: "Liberada a proveedor", pedido: "Pedido emitido", despachado: "Despachado", recepcionado: "Recepcionado" };
  const COLOR = { planificada: "b-gray", explotada: "b-blue", validada: "b-green", liberada: "b-amber", pedido: "b-amber", despachado: "b-blue", recepcionado: "b-green" };
  const idx = (e) => FLUJO.indexOf(e);

  // ---------------- Roles y permisos ----------------
  const PERM = {
    aprobarReceta: ["profesor", "coordinador"],
    proponer: ["alumno", "profesor", "coordinador"],
    editarCalendario: ["coordinador"],
    explotar: ["profesor", "coordinador"],
    validar: ["profesor", "coordinador"],
    liberar: ["profesor", "coordinador"],
    programar: ["proveedor"],
    despachar: ["proveedor"],
    recepcionar: ["bodega", "profesor", "coordinador"]
  };
  const can = (a) => PERM[a].includes(S.rol);
  const NOMBRE_ROL = { alumno: "Alumno/a", profesor: "Profesor/a", coordinador: "Coordinador/a", proveedor: "Proveedor", bodega: "Bodega" };
  // Botón con control de rol: si el rol actual no puede, queda deshabilitado
  // y al lado aparece un acceso directo para cambiar al rol que corresponde (demo).
  const btn = (accion, label, cls, attrs = "") => {
    if (can(accion)) return `<button class="${cls}" ${attrs}>${label}</button>`;
    const rol = PERM[accion][0];
    return `<button class="${cls}" ${attrs} disabled title="Requiere rol: ${PERM[accion].map((r) => NOMBRE_ROL[r]).join(" / ")}">${label}</button>
      <span class="need-role">🔒 Requiere rol <b>${PERM[accion].map((r) => NOMBRE_ROL[r]).join(" o ")}</b> · <button class="link" data-switch="${rol}">Cambiar a ${NOMBRE_ROL[rol]}</button></span>`;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-switch]"); if (!b) return;
    S.rol = b.dataset.switch; $("#rol").value = S.rol; save(); renderAll(); toast("Rol: " + NOMBRE_ROL[S.rol]);
  });

  const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3200); };

  // Fecha (lunes) de la semana n
  const lunes = (n) => { const d = new Date(SEED.inicioAnio + "T12:00:00"); d.setDate(d.getDate() + (n - 1) * 7); return d; };
  const fISO = (d) => d.toISOString().slice(0, 10);
  const fCorta = (d) => d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

  // ---------------- API helpers (con fallback demo) ----------------
  async function api(fn, body) {
    const res = await fetch(`/.netlify/functions/${fn}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  const md = (t) => esc(t)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/^\s*(?:[-*]|\d+\.) (.*)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, "<br>");

  // =====================================================================
  // 1. IDEACIÓN
  // =====================================================================
  const DEMO_INFORME = `## Tendencias (demo sin API)
- **Cocina de territorio y endémicos**: uso de nalca, maqui, rica-rica, cochayuyo (ej. Boragó, Santiago).
- **Fermentados y conservas**: chucrut de repollo morado, ají fermentado, chicha como marinada.
- **Cocina de aprovechamiento (zero waste)**: cáscaras de zapallo deshidratadas, caldos de recortes.
- **Street food de autor**: sopaipillas, completos y anticuchos reinterpretados.
- **Vegetal al centro**: legumbres chilenas (porotos, garbanzos, lentejas) como plato principal.
## Ingredientes chilenos con potencial
- Merkén, cochayuyo, piñón.
## Ideas de platos para alumnos
1. Sopaipilla rellena de pino vegetal de zapallo — costo bajo
2. Ceviche de cochayuyo y palta — costo medio
3. Pantrucas con caldo de recortes y merkén — costo bajo
4. Charquicán en croqueta con huevo pochado — costo bajo
5. Leche asada con maqui — costo medio
## Fuentes
Conecta ANTHROPIC_API_KEY en Netlify para obtener el informe real con fuentes web.`;

  $("#ea-btn").onclick = async () => {
    const out = $("#ea-out"), b = $("#ea-btn");
    b.disabled = true; out.innerHTML = '<span class="spinner"></span> Investigando el estado del arte…';
    try {
      const r = await api("cocinapp-ia", { accion: "estado_arte", tema: $("#ea-tema").value, ambito: $("#ea-ambito").value });
      out.innerHTML = md(r.informe);
    } catch (e) {
      out.innerHTML = md(DEMO_INFORME); toast("Modo demo: " + e.message);
    } finally { b.disabled = false; }
  };

  const recetaDemo = (idea, nivel) => ({
    nombre: "Sopaipilla rellena de pino de zapallo con pebre de cilantro",
    descripcion: "Reinterpretación de la sopaipilla sureña: masa de zapallo rellena y frita, acompañada de pebre con merkén. (Demo: " + idea.slice(0, 60) + "…)",
    origen_cultural: "Chile central y sur", tecnicas: ["masa", "fritura", "corte brunoise"],
    porciones_base: 4, tiempo_min: 90, dificultad: "intermedia",
    ingredientes: [
      { sku: "INS-001", nombre: "Harina de trigo 000", cantidad: 400, unidad: "g" },
      { sku: "INS-018", nombre: "Zapallo camote", cantidad: 450, unidad: "g" },
      { sku: "INS-002", nombre: "Mantequilla sin sal", cantidad: 60, unidad: "g" },
      { sku: "INS-008", nombre: "Cebolla", cantidad: 200, unidad: "g" },
      { sku: "INS-017", nombre: "Tomate", cantidad: 250, unidad: "g" },
      { sku: "INS-016", nombre: "Cilantro", cantidad: 30, unidad: "g" },
      { sku: "INS-020", nombre: "Merkén", cantidad: 3, unidad: "g" },
      { sku: "INS-007", nombre: "Aceite vegetal", cantidad: 500, unidad: "ml" },
      { sku: null, nombre: "Queso de cabra", cantidad: 120, unidad: "g" }
    ],
    pasos: ["Cocer y moler el zapallo.", "Formar la masa con harina, zapallo y mantequilla.", "Preparar el pino de zapallo y cebolla.", "Rellenar, sellar y freír a 170 °C.", "Preparar el pebre y emplatar."],
    alergenos: ["gluten", "lácteos"], objetivo_aprendizaje: `Aplicar técnicas de masas y fritura (${nivel}).`
  });

  let recetaPendiente = null;
  $("#pr-btn").onclick = async () => {
    const out = $("#pr-out"), b = $("#pr-btn");
    const idea = $("#pr-idea").value.trim(), nivel = $("#pr-nivel").value, autor = $("#pr-autor").value;
    if (!idea) return toast("Escribe la idea del plato");
    b.disabled = true; out.innerHTML = '<p class="meta"><span class="spinner"></span> Estandarizando la receta…</p>';
    let r;
    try {
      r = (await api("cocinapp-ia", { accion: "desarrollar_receta", idea, autor, nivel, catalogo: SEED.insumos.map(({ sku, nombre, unidad }) => ({ sku, nombre, unidad })) })).receta;
    } catch (e) { r = recetaDemo(idea, nivel); toast("Modo demo: " + e.message); }
    b.disabled = false;
    recetaPendiente = { r, nivel, autor, quien: $("#pr-nombre").value };
    out.innerHTML = `<div class="muted-box">
      <h3>${esc(r.nombre)}</h3>
      <p class="meta">${esc(r.dificultad)} · ${r.tiempo_min} min · ${r.porciones_base} porciones · ${esc(r.origen_cultural)}</p>
      <p>${esc(r.descripcion)}</p>
      <div class="ing"><b>Ingredientes:</b><br>${r.ingredientes.map((i) => `${esc(i.nombre)} — ${fmt(i.cantidad)} ${i.unidad}${i.sku ? ` <code>${i.sku}</code>` : ' <span class="badge b-red">sin SKU</span>'}`).join("<br>")}</div>
      <div class="ing"><b>Pasos:</b><ol>${r.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></div>
      <p class="meta">Alérgenos: ${esc(r.alergenos.join(", ") || "—")} · ${esc(r.objetivo_aprendizaje)}</p>
      <div class="actions">${btn("proponer", "➕ Enviar al recetario como propuesta", "primary", 'id="pr-add"')}</div></div>`;
    const add = $("#pr-add");
    if (add) add.onclick = () => {
      const { r, nivel, autor, quien } = recetaPendiente;
      const id = "R" + String(S.seq.receta++).padStart(2, "0");
      S.recetas.push({
        id, nombre: r.nombre, origen: autor, autor: quien, estado: "propuesta", nivel, porciones_base: r.porciones_base,
        tecnicas: r.tecnicas, descripcion: r.descripcion, pasos: r.pasos, alergenos: r.alergenos,
        ingredientes: r.ingredientes.filter((i) => i.sku && insumo(i.sku)).map((i) => [i.sku, i.cantidad]),
        sinSku: r.ingredientes.filter((i) => !i.sku || !insumo(i.sku)).map((i) => i.nombre)
      });
      save(); toast(`Propuesta ${id} enviada al recetario`); out.innerHTML = ""; go("recetario");
    };
  };

  // =====================================================================
  // 2. RECETARIO
  // =====================================================================
  const costoPorcion = (r) => r.ingredientes.reduce((s, [sku, q]) => { const i = insumo(sku); return s + (i ? (q * (1 + i.merma)) / i.factor * i.precio : 0); }, 0) / r.porciones_base;

  // Listado de nombres con casillas; se muestra el detalle solo de las marcadas.
  function renderRecetario() {
    const f = $("#rc-filtro").value;
    const visibles = S.recetas.filter((r) => !f || r.estado === f);
    S.verRecetas ||= [];
    $("#rc-names").innerHTML = visibles.map((r) => `
      <li><label><input type="checkbox" data-ver="${r.id}" ${S.verRecetas.includes(r.id) ? "checked" : ""}>
        <span>${esc(r.nombre)}</span>${r.estado === "propuesta" ? ' <span class="badge b-amber">propuesta</span>' : ""}</label></li>`).join("") || '<li class="meta">Sin recetas</li>';
    $$("#rc-names [data-ver]").forEach((c) => c.onchange = () => {
      S.verRecetas = c.checked ? [...S.verRecetas, c.dataset.ver] : S.verRecetas.filter((id) => id !== c.dataset.ver);
      save(); renderRecetario();
    });
    const marcadas = visibles.filter((r) => S.verRecetas.includes(r.id));
    $("#rc-list").innerHTML = marcadas.map((r) => `
      <div class="card">
        <span class="badge ${r.estado === "aprobada" ? "b-green" : "b-amber"}">${r.estado}</span>
        <span class="badge ${r.origen === "alumno" ? "b-blue" : "b-gray"}">${r.origen}</span>
        <h3 style="margin-top:8px">${esc(r.nombre)}</h3>
        <p class="meta">${r.id} · ${esc(r.autor)} · ${esc(r.nivel)} · ${r.porciones_base} porc. · ~${clp(costoPorcion(r))}/porción</p>
        <div class="ing">${r.ingredientes.map(([sku, q]) => { const i = insumo(sku); return `${esc(i?.nombre || sku)} ${fmt(q)}${i?.unidad || ""}`; }).join(" · ")}
          ${r.sinSku?.length ? `<br><span class="badge b-red">Sin SKU: ${esc(r.sinSku.join(", "))}</span>` : ""}</div>
        <div class="actions">
          ${btn("aprobarReceta", "Evaluar propuesta", "sec", `data-eval="${r.id}"`)}
          ${r.estado === "propuesta" ? btn("aprobarReceta", "✔ Aprobar", "primary", `data-ok="${r.id}"`) : ""}
        </div>
        <div class="eval" id="ev-${r.id}"></div>
      </div>`).join("") || '<p class="empty">Marca una o más recetas en el listado para ver su detalle.</p>';

    $$("[data-ok]").forEach((b) => b.onclick = () => { receta(b.dataset.ok).estado = "aprobada"; save(); renderRecetario(); toast("Receta aprobada: disponible en el calendario"); });
    $$("[data-eval]").forEach((b) => b.onclick = async () => {
      const r = receta(b.dataset.eval), box = $("#ev-" + r.id);
      box.innerHTML = '<p class="meta"><span class="spinner"></span> Evaluando…</p>';
      const payload = { ...r, ingredientes: r.ingredientes.map(([sku, q]) => ({ sku, nombre: insumo(sku)?.nombre, cantidad: q })), costo_porcion_clp: Math.round(costoPorcion(r)) };
      let ev;
      try { ev = (await api("cocinapp-ia", { accion: "evaluar_propuesta", receta: payload })).evaluacion; }
      catch (e) {
        toast("Modo demo: " + e.message);
        ev = { puntaje_total: 16, recomendacion: "aprobar_con_cambios", criterios: [
          { criterio: "Pertinencia curricular", puntaje: 4, comentario: "Trabaja técnicas del módulo." },
          { criterio: "Identidad / creatividad", puntaje: 3, comentario: "Buena raíz chilena." },
          { criterio: "Factibilidad en taller", puntaje: 3, comentario: "Requiere control de fritura." },
          { criterio: "Costo por porción", puntaje: 3, comentario: clp(costoPorcion(r)) + " por porción." },
          { criterio: "Inocuidad y alérgenos", puntaje: 3, comentario: "Declarar gluten." }], mejoras: ["Estandarizar gramaje por porción", "Agregar punto crítico de control de temperatura"] };
      }
      box.innerHTML = `<div class="muted-box"><b>${ev.puntaje_total}/20 · ${esc(ev.recomendacion.replace(/_/g, " "))}</b><ul>${ev.criterios.map((c) => `<li>${esc(c.criterio)}: ${c.puntaje}/4 — ${esc(c.comentario)}</li>`).join("")}</ul>${ev.mejoras.length ? `<p class="meta">Mejoras: ${esc(ev.mejoras.join("; "))}</p>` : ""}</div>`;
    });
  }
  $("#rc-filtro").onchange = renderRecetario;
  $("#rc-all").onclick = () => { const f = $("#rc-filtro").value; S.verRecetas = [...new Set([...(S.verRecetas || []), ...S.recetas.filter((r) => !f || r.estado === f).map((r) => r.id)])]; save(); renderRecetario(); };
  $("#rc-none").onclick = () => { S.verRecetas = []; save(); renderRecetario(); };

  // =====================================================================
  // 3. CALENDARIO
  // =====================================================================
  function renderCalendario() {
    const editable = can("editarCalendario");
    $("#cal-perm").innerHTML = editable ? '<span class="badge b-green">Puedes editar</span>' : '<span class="badge b-gray">Solo lectura (requiere Coordinador/a)</span>';
    const aprobadas = S.recetas.filter((r) => r.estado === "aprobada");
    let h = `<thead><tr><th>Sem.</th><th>Lunes</th>${SEED.cursos.map((c) => `<th>${c.nombre}<br><small>${c.alumnos} alumnos · ${c.dia}</small></th>`).join("")}<th>Estado</th></tr></thead><tbody>`;
    for (let n = 1; n <= SEED.semanas; n++) {
      const fila = S.calendario[n] || {}, st = S.semanas[n]?.estado || "planificada", bloqueada = idx(st) >= idx("validada");
      h += `<tr><td class="wk">${n}</td><td>${fCorta(lunes(n))}</td>${SEED.cursos.map((c) => {
        const opts = `<option value="">— sin clase —</option>` + aprobadas.map((r) => `<option value="${r.id}" ${fila[c.id] === r.id ? "selected" : ""}>${esc(r.nombre)}</option>`).join("");
        return `<td><select data-w="${n}" data-c="${c.id}" ${editable && !bloqueada ? "" : "disabled"}>${opts}</select></td>`;
      }).join("")}<td><span class="badge ${COLOR[st]}">${ETQ[st]}</span></td></tr>`;
    }
    $("#cal-table").innerHTML = h + "</tbody>";
    $$("#cal-table select").forEach((s) => s.onchange = () => {
      const w = s.dataset.w; (S.calendario[w] ||= {})[s.dataset.c] = s.value || undefined;
      if (S.semanas[w]?.estado === "explotada") { S.semanas[w] = { estado: "planificada" }; toast(`Semana ${w}: BOM invalidada, vuelve a explotar`); }
      save();
    });
  }

  // =====================================================================
  // 4. EXPLOSIÓN DE MATERIALES — algoritmo MRP simplificado
  // =====================================================================
  //   bruto[sku]  = Σ_cursos  cant_receta × (alumnos × porc/alumno ÷ porciones_base) × (1 + merma)
  //   neto[sku]   = max(0, bruto − stock_bodega)
  //   compra[sku] = ceil(neto ÷ factor ÷ paso) × paso     (formato de compra del proveedor)
  function explotar(n) {
    const fila = S.calendario[n] || {}, agg = {};
    for (const c of SEED.cursos) {
      const r = receta(fila[c.id]); if (!r) continue;
      const k = (c.alumnos * c.porcionesPorAlumno) / r.porciones_base;
      for (const [sku, q] of r.ingredientes) {
        const i = insumo(sku); if (!i) continue;
        const a = (agg[sku] ||= { sku, bruto: 0, porNivel: {}, recetas: new Set() });
        const v = q * k * (1 + i.merma);
        a.bruto += v; a.porNivel[c.nivel] = (a.porNivel[c.nivel] || 0) + v; a.recetas.add(r.nombre);
      }
    }
    return Object.values(agg).map((a) => {
      const i = insumo(a.sku), neto = Math.max(0, a.bruto - i.stock);
      const compra = neto > 0 ? Math.ceil(neto / i.factor / i.paso - 1e-9) * i.paso : 0;
      return { sku: a.sku, nombre: i.nombre, unidad: i.unidad, compraUnidad: i.compra, bruto: a.bruto, porNivel: a.porNivel, stock: i.stock, neto, compra, ajustada: compra, precio: i.precio, recetas: [...a.recetas] };
    }).sort((x, y) => x.nombre.localeCompare(y.nombre));
  }
  const niveles = [...new Set(SEED.cursos.map((c) => c.nivel))];

  function renderExplosion() {
    const n = S.semana, s = sem(n), fila = S.calendario[n] || {};
    $("#ex-clases").innerHTML = SEED.cursos.map((c) => `<div class="chip">${c.nombre} · ${c.dia}: <b>${esc(receta(fila[c.id])?.nombre || "—")}</b> (${c.alumnos * c.porcionesPorAlumno} porc.)</div>`).join("");
    const bloqueada = idx(s.estado) >= idx("validada");
    $("#ex-btn").disabled = !can("explotar") || bloqueada;
    $("#ex-btn").title = bloqueada ? "La semana ya está validada" : can("explotar") ? "" : "Requiere rol Profesor/a";
    const L = s.lineas;
    if (!L) { $("#ex-table").innerHTML = '<tbody><tr><td class="empty">Aún no se explota la lista de materiales para esta semana.</td></tr></tbody>'; return; }
    const total = L.reduce((t, l) => t + l.compra * l.precio, 0);
    $("#ex-table").innerHTML = `<thead><tr><th>SKU</th><th>Insumo</th>${niveles.map((v) => `<th class="num">${v}</th>`).join("")}<th class="num">Bruto c/merma</th><th class="num">Stock</th><th class="num">Neto</th><th class="num">A comprar</th><th>Formato</th><th class="num">Subtotal</th><th>Usado en</th></tr></thead>
      <tbody>${L.map((l) => `<tr><td><code>${l.sku}</code></td><td>${esc(l.nombre)}</td>${niveles.map((v) => `<td class="num">${fmt(l.porNivel[v] || 0, 0)} ${l.unidad}</td>`).join("")}
        <td class="num">${fmt(l.bruto, 0)} ${l.unidad}</td><td class="num">${fmt(l.stock, 0)}</td><td class="num">${fmt(l.neto, 0)}</td>
        <td class="num"><b>${fmt(l.compra)}</b></td><td>${esc(l.compraUnidad)}</td><td class="num">${clp(l.compra * l.precio)}</td><td><small>${esc(l.recetas.join(", "))}</small></td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="${niveles.length + 7}">Total estimado semana ${n} (${L.length} insumos)</td><td class="num">${clp(total)}</td><td></td></tr></tfoot>`;
  }
  $("#ex-btn").onclick = () => {
    const n = S.semana, lineas = explotar(n);
    if (!lineas.length) return toast("No hay clases planificadas esta semana");
    S.semanas[n] = { estado: "explotada", lineas, explotadaAt: new Date().toISOString() };
    save(); renderAll(); toast(`Semana ${n}: ${lineas.length} insumos explotados`);
  };

  // =====================================================================
  // 5. VALIDACIÓN Y LIBERACIÓN
  // =====================================================================
  const pipeline = (st) => `<div class="pipeline">${FLUJO.map((e) => `<span class="${idx(e) < idx(st) ? "done" : e === st ? "now" : ""}">${ETQ[e]}</span>`).join("")}</div>`;

  function renderValidacion() {
    const n = S.semana, s = sem(n), body = $("#va-body");
    if (!s.lineas) { body.innerHTML = pipeline(s.estado) + '<p class="empty">Primero explota la lista de materiales (paso 4).</p>'; return; }
    const editable = s.estado === "explotada" && can("validar");
    const total = s.lineas.reduce((t, l) => t + l.ajustada * l.precio, 0);
    body.innerHTML = pipeline(s.estado) + `
      <div class="table-wrap"><table class="data"><thead><tr><th>SKU</th><th>Insumo</th><th class="num">Sugerido</th><th class="num">Ajustado</th><th>Formato</th><th class="num">Precio ref.</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${s.lineas.map((l, k) => `<tr><td><code>${l.sku}</code></td><td>${esc(l.nombre)}</td><td class="num">${fmt(l.compra)}</td>
        <td class="num">${editable ? `<input type="number" min="0" step="any" value="${l.ajustada}" data-k="${k}">` : `<b>${fmt(l.ajustada)}</b>`}</td>
        <td>${esc(l.compraUnidad)}</td><td class="num">${clp(l.precio)}</td><td class="num">${clp(l.ajustada * l.precio)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="6">Total semana ${n}</td><td class="num">${clp(total)}</td></tr></tfoot></table></div>
      ${s.firma ? `<div class="firma">✍️ Lista <b>firme</b> — firmada por ${esc(s.firma.nombre)} (${NOMBRE_ROL[s.firma.rol]}) el ${new Date(s.firma.at).toLocaleString("es-CL")}</div>` : ""}
      ${s.liberada ? `<div class="firma">🚚 Liberada al proveedor ${esc(SEED.proveedor.nombre)} el ${new Date(s.liberada).toLocaleString("es-CL")}</div>` : ""}
      <div class="actions">
        ${s.estado === "explotada" ? btn("validar", "✍️ Validar y firmar lista", "primary", 'id="va-firmar"') : ""}
        ${s.estado === "validada" ? btn("validar", "↩ Reabrir", "warn", 'id="va-reabrir"') + btn("liberar", "🚚 Liberar al proveedor", "primary", 'id="va-liberar"') : ""}
      </div>`;
    $$("#va-body input[data-k]").forEach((i) => i.onchange = () => { s.lineas[i.dataset.k].ajustada = Math.max(0, +i.value || 0); save(); renderValidacion(); });
    const f = $("#va-firmar"); if (f) f.onclick = () => {
      const nombre = prompt("Firma electrónica — nombre del profesor/a:", S.rol === "coordinador" ? "Prof. M. Rojas (Coordinadora)" : "Prof. C. Muñoz");
      if (!nombre) return;
      Object.assign(s, { estado: "validada", firma: { nombre, rol: S.rol, at: new Date().toISOString() } }); save(); renderAll(); toast("Lista validada y firme");
    };
    const re = $("#va-reabrir"); if (re) re.onclick = () => { s.estado = "explotada"; delete s.firma; save(); renderAll(); };
    const lb = $("#va-liberar"); if (lb) lb.onclick = () => { Object.assign(s, { estado: "liberada", liberada: new Date().toISOString() }); save(); renderAll(); toast(`Semana ${n} liberada al proveedor`); };
  }

  // =====================================================================
  // 6. PROVEEDOR — programación de entregas → solicitud de pedido (OC SAP)
  // =====================================================================
  async function enviarSAP(tipo, documento, ref) {
    let r;
    try { r = await api("cocinapp-sap", { tipo, documento }); }
    catch (e) { r = { ok: true, simulado: true, local: true, endpoint: tipo === "orden_compra" ? "POST /b1s/v1/PurchaseOrders" : "POST /b1s/v1/PurchaseDeliveryNotes", payload: documento, DocEntry: Math.floor(10000 + Math.random() * 90000), DocNum: Math.floor(500000 + Math.random() * 99999) }; }
    S.sapLog.unshift({ at: new Date().toISOString(), tipo, ref, ...r, payload: r.payload || documento });
    return r;
  }

  function renderProveedor() {
    const lista = Object.entries(S.semanas).filter(([, s]) => idx(s.estado) >= idx("liberada")).sort((a, b) => a[0] - b[0]);
    if (!lista.length) { $("#pv-body").innerHTML = '<p class="empty">No hay semanas liberadas todavía. (Paso 5)</p>'; return; }
    $("#pv-body").innerHTML = lista.map(([n, s]) => {
      const total = s.lineas.reduce((t, l) => t + l.ajustada * l.precio, 0);
      const sug = new Date(lunes(+n)); sug.setDate(sug.getDate() - 3); // viernes anterior
      return `<div class="card" style="margin-bottom:12px">
        <h3>Semana ${n} · clases desde ${fCorta(lunes(+n))} <span class="badge ${COLOR[s.estado]}">${ETQ[s.estado]}</span></h3>
        <p class="meta">${s.lineas.filter((l) => l.ajustada > 0).length} ítems · ${clp(total)} · firmado por ${esc(s.firma?.nombre)}</p>
        ${s.estado === "liberada" ? `<div class="grid2" style="max-width:520px">
            <label>Fecha de entrega<input type="date" id="pv-f-${n}" value="${fISO(sug)}"></label>
            <label>Ventana horaria<select id="pv-v-${n}"><option>07:30 – 09:30</option><option>14:00 – 16:00</option></select></label></div>
          <div class="actions">${btn("programar", "📅 Programar entrega y generar solicitud de pedido", "primary", `data-prog="${n}"`)}</div>`
        : `<p><b>Pedido ${esc(s.pedido.id)}</b> · entrega ${esc(s.entrega.fecha)} ${esc(s.entrega.ventana)} · OC SAP DocNum ${s.pedido.sapDocNum ?? "—"}</p>
          ${s.estado === "pedido" ? `<div class="actions">${btn("despachar", "🚚 Marcar como despachado", "primary", `data-desp="${n}"`)}</div>` : ""}`}
      </div>`;
    }).join("");
    $$("[data-prog]").forEach((b) => b.onclick = async () => {
      const n = b.dataset.prog, s = S.semanas[n];
      const entrega = { fecha: $(`#pv-f-${n}`).value, ventana: $(`#pv-v-${n}`).value };
      const pedidoId = `SP-${SEED.anio}-${String(S.seq.pedido++).padStart(4, "0")}`;
      const lineas = s.lineas.filter((l) => l.ajustada > 0).map((l, k) => ({ lineNum: k, sku: l.sku, nombre: l.nombre, cantidad: l.ajustada, unidad: l.compraUnidad, precio: l.precio }));
      b.disabled = true; b.innerHTML = '<span class="spinner"></span> Generando…';
      const r = await enviarSAP("orden_compra", { pedidoId, semana: +n, colegio: SEED.colegio, proveedorCardCode: SEED.proveedor.cardCode, fecha: fISO(new Date()), fechaEntrega: entrega.fecha, lineas }, pedidoId);
      Object.assign(s, { estado: "pedido", entrega, pedido: { id: pedidoId, lineas, sapDocEntry: r.DocEntry, sapDocNum: r.DocNum } });
      save(); renderAll(); toast(`Solicitud ${pedidoId} creada · OC SAP ${r.DocNum}${r.simulado ? " (simulado)" : ""}`);
    });
    $$("[data-desp]").forEach((b) => b.onclick = () => { const s = S.semanas[b.dataset.desp]; s.estado = "despachado"; s.despachadoAt = new Date().toISOString(); save(); renderAll(); toast("Pedido despachado: pendiente de recepción"); });
  }

  // =====================================================================
  // 7. RECEPCIÓN
  // =====================================================================
  function renderRecepcion() {
    const lista = Object.entries(S.semanas).filter(([, s]) => s.pedido).sort((a, b) => a[0] - b[0]);
    if (!lista.length) { $("#re-body").innerHTML = '<p class="empty">No hay pedidos emitidos.</p>'; return; }
    $("#re-body").innerHTML = lista.map(([n, s]) => {
      const pend = s.estado === "despachado" && can("recepcionar");
      const rec = s.recepcion?.lineas;
      return `<div class="card" style="margin-bottom:12px">
        <h3>${esc(s.pedido.id)} · Semana ${n} · entrega ${esc(s.entrega.fecha)} <span class="badge ${COLOR[s.estado]}">${ETQ[s.estado]}</span></h3>
        ${s.estado === "pedido" ? '<p class="meta">Esperando despacho del proveedor.</p>' : ""}
        <div class="table-wrap"><table class="data"><thead><tr><th>SKU</th><th>Insumo</th><th class="num">Pedido</th><th class="num">Recibido</th><th class="num">Dif.</th><th>Calidad OK</th></tr></thead><tbody>
        ${s.pedido.lineas.map((l, k) => {
          const rv = rec ? rec[k].cantidadRecibida : l.cantidad, d = rv - l.cantidad;
          return `<tr><td><code>${l.sku}</code></td><td>${esc(l.nombre)}</td><td class="num">${fmt(l.cantidad)} ${esc(l.unidad)}</td>
          <td class="num">${pend ? `<input type="number" min="0" step="any" value="${l.cantidad}" data-n="${n}" data-k="${k}">` : fmt(rv)}</td>
          <td class="num ${d < 0 ? "diff-neg" : "diff-ok"}">${rec ? fmt(d) : "—"}</td>
          <td>${pend ? `<input type="checkbox" checked data-q="${n}-${k}" style="width:auto">` : rec ? (rec[k].calidad ? "✔" : "✖") : "—"}</td></tr>`;
        }).join("")}</tbody></table></div>
        ${pend ? `<label style="margin-top:10px">Observación<input id="re-obs-${n}" placeholder="Ej: palta llegó verde, se recibe igual"></label>
          <div class="actions">${btn("recepcionar", "📦 Confirmar recepción y enviar a SAP", "primary", `data-rec="${n}"`)}</div>` : ""}
        ${s.recepcion ? `<div class="firma">Recepcionado ${s.recepcion.parcial ? "<b>PARCIAL</b>" : "conforme"} el ${new Date(s.recepcion.at).toLocaleString("es-CL")} · Entrada de mercancías SAP DocNum ${s.recepcion.sapDocNum}${s.recepcion.observacion ? " · " + esc(s.recepcion.observacion) : ""}</div>` : ""}
      </div>`;
    }).join("");
    $$("[data-rec]").forEach((b) => b.onclick = async () => {
      const n = b.dataset.rec, s = S.semanas[n];
      const lineas = s.pedido.lineas.map((l, k) => ({ ...l, cantidadRecibida: +$(`input[data-n="${n}"][data-k="${k}"]`).value || 0, calidad: $(`input[data-q="${n}-${k}"]`).checked }));
      const observacion = $(`#re-obs-${n}`).value;
      b.disabled = true; b.innerHTML = '<span class="spinner"></span> Enviando…';
      const r = await enviarSAP("entrada_mercancias", { pedidoId: s.pedido.id, docEntryOC: s.pedido.sapDocEntry, proveedorCardCode: SEED.proveedor.cardCode, fechaRecepcion: fISO(new Date()), observacion, lineas }, s.pedido.id);
      s.recepcion = { at: new Date().toISOString(), lineas, observacion, parcial: lineas.some((l) => l.cantidadRecibida < l.cantidad || !l.calidad), sapDocEntry: r.DocEntry, sapDocNum: r.DocNum };
      s.estado = "recepcionado"; save(); renderAll(); toast(`Recepción registrada · SAP DocNum ${r.DocNum}`);
    });
  }

  // =====================================================================
  // 8. SAP
  // =====================================================================
  function renderSAP() {
    if (!S.sapLog.length) { $("#sap-table").innerHTML = '<tbody><tr><td class="empty">Sin documentos enviados todavía.</td></tr></tbody>'; $("#sap-payload").classList.add("hidden"); return; }
    $("#sap-table").innerHTML = `<thead><tr><th>Fecha</th><th>Documento</th><th>Referencia</th><th>Endpoint</th><th class="num">DocEntry</th><th class="num">DocNum</th><th>Modo</th><th></th></tr></thead><tbody>
      ${S.sapLog.map((l, k) => `<tr><td>${new Date(l.at).toLocaleString("es-CL")}</td><td>${l.tipo === "orden_compra" ? "Orden de compra" : "Entrada de mercancías"}</td><td>${esc(l.ref)}</td><td><code>${esc(l.endpoint)}</code></td>
        <td class="num">${l.DocEntry}</td><td class="num">${l.DocNum}</td><td><span class="badge ${l.simulado ? "b-amber" : "b-green"}">${l.simulado ? "simulado" : "SAP real"}</span></td>
        <td><button class="sec" data-pl="${k}">JSON</button></td></tr>`).join("")}</tbody>`;
    $$("[data-pl]").forEach((b) => b.onclick = () => { const p = $("#sap-payload"); p.textContent = JSON.stringify(S.sapLog[b.dataset.pl].payload, null, 2); p.classList.remove("hidden"); });
  }

  // =====================================================================
  // Navegación y render general
  // =====================================================================
  function renderSemanaSelectors() {
    $$(".sel-semana").forEach((sel) => {
      sel.innerHTML = Array.from({ length: SEED.semanas }, (_, k) => k + 1).map((n) => `<option value="${n}" ${n === S.semana ? "selected" : ""}>Semana ${n} — ${fCorta(lunes(n))}${S.calendario[n] ? "" : " (sin clases)"}</option>`).join("");
      sel.onchange = () => { S.semana = +sel.value; save(); renderAll(); };
    });
    const st = sem(S.semana).estado;
    $$(".estado-badge").forEach((b) => b.innerHTML = `<span class="badge ${COLOR[st]}">${ETQ[st]}</span>`);
  }
  function renderAll() { renderSemanaSelectors(); renderRecetario(); renderCalendario(); renderExplosion(); renderValidacion(); renderProveedor(); renderRecepcion(); renderSAP(); }

  function go(tab) {
    $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + tab));
    history.replaceState(null, "", "#" + tab);
  }
  $$("#tabs button").forEach((b) => b.onclick = () => go(b.dataset.tab));
  $("#rol").value = S.rol;
  $("#rol").onchange = (e) => { S.rol = e.target.value; save(); renderAll(); toast("Rol: " + NOMBRE_ROL[S.rol]); };
  $("#reset").onclick = () => { if (confirm("¿Restaurar los datos de demostración?")) { S = fresh(); save(); $("#rol").value = S.rol; renderAll(); toast("Datos de demo restaurados"); } };
  $("#colegio").textContent = `${SEED.colegio} · Año ${SEED.anio}`;

  renderAll();
  const h = location.hash.slice(1); if (h && $("#tab-" + h)) go(h);
})();
