// CocinApp — datos semilla de la maqueta (en producción vienen de la BD / SAP).
window.COCINAPP_SEED = {
  colegio: "Liceo Técnico Profesional — Especialidad Gastronomía",
  anio: 2027,
  inicioAnio: "2027-03-01", // lunes semana 1
  semanas: 38,
  proveedor: { nombre: "Palta Pacheco HORECA", cardCode: "P-PALTAPACHECO" },

  // Cursos de la carrera (nivel = 3° o 4° medio)
  cursos: [
    { id: "3A", nombre: "3° Medio A", nivel: "3° medio", alumnos: 32, porcionesPorAlumno: 1, dia: "Martes" },
    { id: "3B", nombre: "3° Medio B", nivel: "3° medio", alumnos: 30, porcionesPorAlumno: 1, dia: "Miércoles" },
    { id: "4A", nombre: "4° Medio A", nivel: "4° medio", alumnos: 28, porcionesPorAlumno: 1, dia: "Jueves" },
    { id: "4B", nombre: "4° Medio B", nivel: "4° medio", alumnos: 26, porcionesPorAlumno: 1, dia: "Viernes" }
  ],

  // Catálogo de insumos. unidad = unidad base de receta (g|ml|u).
  // compra = unidad de compra, factor = unidades base por unidad de compra,
  // paso = múltiplo mínimo de compra, merma = % pérdida en limpieza/porcionado.
  insumos: [
    { sku: "INS-001", nombre: "Harina de trigo 000", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 1100, merma: 0.02, stock: 5000 },
    { sku: "INS-002", nombre: "Mantequilla sin sal", unidad: "g", compra: "kg", factor: 1000, paso: 0.5, precio: 9800, merma: 0, stock: 0 },
    { sku: "INS-003", nombre: "Huevo blanco", unidad: "u", compra: "bandeja 30u", factor: 30, paso: 1, precio: 6900, merma: 0.03, stock: 30 },
    { sku: "INS-004", nombre: "Leche entera", unidad: "ml", compra: "L", factor: 1000, paso: 1, precio: 1150, merma: 0, stock: 2000 },
    { sku: "INS-005", nombre: "Azúcar granulada", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 1300, merma: 0, stock: 3000 },
    { sku: "INS-006", nombre: "Sal fina", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 600, merma: 0, stock: 2000 },
    { sku: "INS-007", nombre: "Aceite vegetal", unidad: "ml", compra: "L", factor: 1000, paso: 1, precio: 2400, merma: 0, stock: 1000 },
    { sku: "INS-008", nombre: "Cebolla", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 900, merma: 0.12, stock: 0 },
    { sku: "INS-009", nombre: "Ajo", unidad: "g", compra: "kg", factor: 1000, paso: 0.5, precio: 5500, merma: 0.15, stock: 0 },
    { sku: "INS-010", nombre: "Choclo desgranado", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 2800, merma: 0, stock: 0 },
    { sku: "INS-011", nombre: "Carne molida vacuno", unidad: "g", compra: "kg", factor: 1000, paso: 0.5, precio: 8900, merma: 0.05, stock: 0 },
    { sku: "INS-012", nombre: "Pechuga de pollo", unidad: "g", compra: "kg", factor: 1000, paso: 0.5, precio: 6200, merma: 0.08, stock: 0 },
    { sku: "INS-013", nombre: "Merluza filete", unidad: "g", compra: "kg", factor: 1000, paso: 0.5, precio: 7900, merma: 0.1, stock: 0 },
    { sku: "INS-014", nombre: "Palta Hass", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 3900, merma: 0.3, stock: 0 },
    { sku: "INS-015", nombre: "Limón", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 1800, merma: 0.4, stock: 0 },
    { sku: "INS-016", nombre: "Cilantro", unidad: "g", compra: "atado 100g", factor: 100, paso: 1, precio: 500, merma: 0.25, stock: 0 },
    { sku: "INS-017", nombre: "Tomate", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 1500, merma: 0.08, stock: 0 },
    { sku: "INS-018", nombre: "Zapallo camote", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 1200, merma: 0.2, stock: 0 },
    { sku: "INS-019", nombre: "Papa", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 900, merma: 0.15, stock: 0 },
    { sku: "INS-020", nombre: "Merkén", unidad: "g", compra: "bolsa 100g", factor: 100, paso: 1, precio: 2500, merma: 0, stock: 100 },
    { sku: "INS-021", nombre: "Quínoa", unidad: "g", compra: "kg", factor: 1000, paso: 0.5, precio: 4500, merma: 0, stock: 0 },
    { sku: "INS-022", nombre: "Porotos granados", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 3200, merma: 0, stock: 0 },
    { sku: "INS-023", nombre: "Albahaca", unidad: "g", compra: "atado 100g", factor: 100, paso: 1, precio: 900, merma: 0.3, stock: 0 },
    { sku: "INS-024", nombre: "Ají de color (pimentón)", unidad: "g", compra: "bolsa 100g", factor: 100, paso: 1, precio: 1200, merma: 0, stock: 100 },
    { sku: "INS-025", nombre: "Aceituna negra", unidad: "g", compra: "kg", factor: 1000, paso: 0.5, precio: 6500, merma: 0, stock: 0 },
    { sku: "INS-026", nombre: "Manjar", unidad: "g", compra: "kg", factor: 1000, paso: 1, precio: 3800, merma: 0, stock: 0 },
    { sku: "INS-027", nombre: "Crema de leche", unidad: "ml", compra: "L", factor: 1000, paso: 1, precio: 4900, merma: 0, stock: 0 },
    { sku: "INS-028", nombre: "Levadura seca", unidad: "g", compra: "bolsa 500g", factor: 500, paso: 1, precio: 4200, merma: 0, stock: 0 }
  ],

  // Recetario inicial (porciones_base = 4)
  recetas: [
    { id: "R01", nombre: "Pastel de choclo", origen: "profesor", autor: "Prof. M. Rojas", estado: "aprobada", nivel: "3° medio", porciones_base: 4, tecnicas: ["sofrito", "gratinado"],
      ingredientes: [["INS-010", 800], ["INS-011", 400], ["INS-008", 300], ["INS-003", 2], ["INS-025", 40], ["INS-012", 300], ["INS-023", 10], ["INS-005", 20], ["INS-004", 200], ["INS-024", 5]] },
    { id: "R02", nombre: "Empanadas de pino", origen: "profesor", autor: "Prof. M. Rojas", estado: "aprobada", nivel: "3° medio", porciones_base: 4, tecnicas: ["masa", "horneado"],
      ingredientes: [["INS-001", 500], ["INS-002", 100], ["INS-011", 400], ["INS-008", 400], ["INS-003", 3], ["INS-025", 40], ["INS-024", 5], ["INS-006", 8], ["INS-004", 150]] },
    { id: "R03", nombre: "Sopaipillas con pebre", origen: "profesor", autor: "Prof. C. Muñoz", estado: "aprobada", nivel: "3° medio", porciones_base: 4, tecnicas: ["masa", "fritura"],
      ingredientes: [["INS-001", 400], ["INS-018", 250], ["INS-002", 60], ["INS-007", 500], ["INS-017", 300], ["INS-008", 100], ["INS-016", 30], ["INS-006", 6]] },
    { id: "R04", nombre: "Ceviche de merluza con palta", origen: "profesor", autor: "Prof. C. Muñoz", estado: "aprobada", nivel: "4° medio", porciones_base: 4, tecnicas: ["marinado", "corte brunoise"],
      ingredientes: [["INS-013", 500], ["INS-015", 400], ["INS-008", 120], ["INS-016", 20], ["INS-014", 400], ["INS-006", 6]] },
    { id: "R05", nombre: "Porotos granados con pilco", origen: "profesor", autor: "Prof. M. Rojas", estado: "aprobada", nivel: "3° medio", porciones_base: 4, tecnicas: ["guiso", "ligazón"],
      ingredientes: [["INS-022", 600], ["INS-018", 300], ["INS-010", 300], ["INS-008", 150], ["INS-023", 10], ["INS-024", 5], ["INS-007", 30]] },
    { id: "R06", nombre: "Quínoa salteada con merkén y palta", origen: "alumno", autor: "Javiera P. (4°A)", estado: "aprobada", nivel: "4° medio", porciones_base: 4, tecnicas: ["salteado", "emplatado"],
      ingredientes: [["INS-021", 300], ["INS-014", 300], ["INS-017", 200], ["INS-008", 100], ["INS-020", 4], ["INS-015", 100], ["INS-007", 30]] },
    { id: "R07", nombre: "Leche asada", origen: "profesor", autor: "Prof. C. Muñoz", estado: "aprobada", nivel: "3° medio", porciones_base: 4, tecnicas: ["baño maría", "caramelo"],
      ingredientes: [["INS-004", 500], ["INS-003", 4], ["INS-005", 150]] },
    { id: "R08", nombre: "Pollo arvejado con papas doradas", origen: "profesor", autor: "Prof. M. Rojas", estado: "aprobada", nivel: "4° medio", porciones_base: 4, tecnicas: ["braseado", "salteado"],
      ingredientes: [["INS-012", 700], ["INS-019", 800], ["INS-008", 150], ["INS-009", 10], ["INS-007", 40], ["INS-006", 8]] },
    { id: "R09", nombre: "Calzones rotos con manjar", origen: "alumno", autor: "Benjamín S. (3°B)", estado: "aprobada", nivel: "3° medio", porciones_base: 4, tecnicas: ["masa", "fritura"],
      ingredientes: [["INS-001", 350], ["INS-003", 2], ["INS-002", 50], ["INS-005", 60], ["INS-007", 500], ["INS-026", 200]] },
    { id: "R10", nombre: "Pan amasado", origen: "profesor", autor: "Prof. C. Muñoz", estado: "aprobada", nivel: "3° medio", porciones_base: 4, tecnicas: ["fermentación", "horneado"],
      ingredientes: [["INS-001", 500], ["INS-002", 60], ["INS-028", 10], ["INS-006", 8], ["INS-004", 250]] },
    { id: "R11", nombre: "Crema de zapallo con merkén", origen: "alumno", autor: "Tomás R. (4°B)", estado: "propuesta", nivel: "4° medio", porciones_base: 4, tecnicas: ["crema", "emulsión"],
      ingredientes: [["INS-018", 800], ["INS-008", 150], ["INS-027", 200], ["INS-020", 3], ["INS-002", 30]] }
  ],

  // Planificación inicial (semana -> curso -> receta)
  calendario: {
    1: { "3A": "R10", "3B": "R10", "4A": "R08", "4B": "R08" },
    2: { "3A": "R03", "3B": "R03", "4A": "R04", "4B": "R04" },
    3: { "3A": "R07", "3B": "R07", "4A": "R06", "4B": "R06" },
    4: { "3A": "R02", "3B": "R02", "4A": "R08", "4B": "R04" },
    5: { "3A": "R05", "3B": "R05", "4A": "R06", "4B": "R06" },
    6: { "3A": "R09", "3B": "R09", "4A": "R04", "4B": "R08" },
    7: { "3A": "R01", "3B": "R01", "4A": "R08", "4B": "R06" },
    8: { "3A": "R03", "3B": "R10", "4A": "R04", "4B": "R04" }
  }
};
