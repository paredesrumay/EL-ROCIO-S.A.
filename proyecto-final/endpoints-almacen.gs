/**
 * MÓDULO ALMACÉN — Funciones para Google Apps Script
 * (Referencia independiente. El código completo está en CODIGO-COMPLETO-APPS-SCRIPT.gs)
 *
 * ESTRUCTURA DE HOJAS:
 *
 * Almacen_Productos:
 *   A: Codigo_SAP | B: Descripcion_Material | C: Lote | D: Cantidad | E: Unidad_de_Medida
 *
 * Movimientos_Almacen:
 *   A: Fecha | B: Codigo_SAP | C: Descripcion_Material | D: Lote | E: Cantidad
 *   F: Unidad_de_Medida | G: Ingreso | H: Origen | I: Salida | J: Destino
 *   K: Motivo | L: N° Guía | M: Observaciones
 */

// ══════════════════════════════════════════════════════════════════
//  MÓDULO: ALMACÉN
// ══════════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════
   1. OBTENER INVENTARIO
══════════════════════════════════════════ */
function obtenerInventario(granja) {
  const sheetProductos   = SpreadsheetApp.getActive().getSheetByName("Almacen_Productos");
  const sheetMovimientos = SpreadsheetApp.getActive().getSheetByName("Movimientos_Almacen");

  if (!sheetProductos || !sheetMovimientos) {
    return jsonResponse({ ok: false, mensaje: "Hojas de almacén no encontradas" });
  }

  const datosProductos   = sheetProductos.getDataRange().getValues();
  const datosMovimientos = sheetMovimientos.getDataRange().getValues();

  // ── Productos ──
  const productos = [];
  for (let i = 1; i < datosProductos.length; i++) {
    const fila = datosProductos[i];
    if (!fila[0] && !fila[1]) continue;

    productos.push({
      id:                  String(fila[0] || "").trim(),
      nombre:              String(fila[1] || "").trim(),
      lote:                String(fila[2] || "").trim(),
      cantidad:            parseInt(fila[3]) || 0,
      unidad:              String(fila[4] || "Unidad").trim(),
      fecha_actualizacion: new Date().toISOString()
    });
  }

  // ── Últimos 50 movimientos ──
  const movimientos = [];
  for (let i = Math.max(1, datosMovimientos.length - 50); i < datosMovimientos.length; i++) {
    const fila = datosMovimientos[i];
    if (!fila[0]) continue;

    let tipo = "", cantidad = 0, motivo = "";

    if (fila[6] && Number(fila[6]) > 0) {
      tipo = "entrada"; cantidad = Number(fila[6]); motivo = String(fila[7] || "").trim();
    } else if (fila[8] && Number(fila[8]) > 0) {
      tipo = "salida";  cantidad = Number(fila[8]); motivo = String(fila[10] || "").trim();
    }

    if (cantidad > 0) {
      movimientos.push({
        tipo,
        producto:      String(fila[2]  || "").trim(),
        cantidad,
        unidad:        String(fila[5]  || "").trim(),  // ✅ col F
        motivo,
        destino:       String(fila[9]  || "").trim(),
        numero_guia:   String(fila[11] || "").trim(),
        observaciones: String(fila[12] || "").trim(),
        fecha:         fila[0]
      });
    }
  }

  return jsonResponse({ ok: true, productos, movimientos });
}

/* ══════════════════════════════════════════
   2. REGISTRAR ENTRADA DE ALMACÉN
══════════════════════════════════════════ */
function registrarEntradaAlmacen(data) {
  const sheetProductos   = SpreadsheetApp.getActive().getSheetByName("Almacen_Productos");
  const sheetMovimientos = SpreadsheetApp.getActive().getSheetByName("Movimientos_Almacen");

  if (!sheetProductos || !sheetMovimientos) {
    return jsonResponse({ ok: false, mensaje: "Hojas de almacén no encontradas" });
  }

  const datosProductos = sheetProductos.getDataRange().getValues();
  const producto       = String(data.producto    || "").trim().toUpperCase();
  const lote           = String(data.lote        || "").trim();
  const cantidad       = parseInt(data.cantidad, 10);
  const unidad         = String(data.unidad      || "Unidad").trim();
  const origen         = String(data.origen      || "").trim();
  const observaciones  = String(data.observaciones || "").trim();
  const codigoSAPInput = String(data.codigo_sap  || "").trim(); // ✅ SAP del frontend
  const numeroGuia     = String(data.numero_guia || "").trim(); // Capturar el número de guía

  if (!producto || cantidad <= 0) {
    return jsonResponse({ ok: false, mensaje: "Datos inválidos" });
  }

  let productoEncontrado = false;
  let sapExistente       = "";

  for (let i = 1; i < datosProductos.length; i++) {
    const fila = datosProductos[i];
    if (String(fila[1]).trim().toUpperCase() === producto) {
      const cantidadActual = parseInt(fila[3], 10) || 0;
      sheetProductos.getRange(i + 1, 4).setValue(cantidadActual + cantidad);
      if (lote) sheetProductos.getRange(i + 1, 3).setValue(lote); // ✅ actualiza lote
      sapExistente       = String(fila[0]).trim();
      productoEncontrado = true;
      break;
    }
  }

  if (!productoEncontrado) {
    const codigoSAP = codigoSAPInput || ("NEW-" + Date.now()); // ✅ usa SAP real
    sheetProductos.appendRow([codigoSAP, producto, lote, cantidad, unidad]);
    sapExistente = codigoSAP;
  }

  sheetMovimientos.appendRow([
    new Date(),       // A: Fecha
    sapExistente,     // B: Codigo_SAP
    producto,         // C: Descripcion_Material
    lote,             // D: Lote
    cantidad,         // E: Cantidad (general)
    unidad,           // F: Unidad_de_Medida
    cantidad,         // G: Ingreso
    origen,           // H: Origen
    "", "", "", numeroGuia, observaciones // I, J, K (vacíos), L: N° Guía, M: Observaciones
  ]);

  return jsonResponse({ ok: true, mensaje: "Entrada registrada correctamente" });
}

/* ══════════════════════════════════════════
   3. REGISTRAR SALIDA DE ALMACÉN
══════════════════════════════════════════ */
function registrarSalidaAlmacen(data) {
  const sheetProductos   = SpreadsheetApp.getActive().getSheetByName("Almacen_Productos");
  const sheetMovimientos = SpreadsheetApp.getActive().getSheetByName("Movimientos_Almacen");

  if (!sheetProductos || !sheetMovimientos) {
    return jsonResponse({ ok: false, mensaje: "Hojas de almacén no encontradas" });
  }

  const datosProductos = sheetProductos.getDataRange().getValues();
  const producto       = String(data.producto      || "").trim().toUpperCase();
  const cantidad       = parseInt(data.cantidad, 10);
  const motivo         = String(data.motivo         || "").trim();
  const destino        = String(data.destino        || "").trim();
  const numeroGuia     = String(data.numero_guia    || "").trim(); // ❗ FIX: Esta línea faltaba
  const observaciones  = String(data.observaciones  || "").trim();

  if (!producto || cantidad <= 0) {
    return jsonResponse({ ok: false, mensaje: "Datos inválidos" });
  }

  let productoEncontrado = false;
  let sapProducto = "", unidadProducto = "", loteProducto = "";

  for (let i = 1; i < datosProductos.length; i++) {
    const fila = datosProductos[i];
    if (String(fila[1]).trim().toUpperCase() === producto) {
      const cantidadActual = parseInt(fila[3], 10) || 0;
      if (cantidadActual < cantidad) {
        return jsonResponse({ ok: false, mensaje: `No hay suficiente cantidad. Disponible: ${cantidadActual}` });
      }
      sheetProductos.getRange(i + 1, 4).setValue(cantidadActual - cantidad);
      sapProducto        = String(fila[0] || "").trim();
      loteProducto       = String(fila[2] || "").trim();
      unidadProducto     = String(fila[4] || "").trim(); // ✅ captura unidad
      productoEncontrado = true;
      break;
    }
  }

  if (!productoEncontrado) {
    return jsonResponse({ ok: false, mensaje: "Producto no encontrado en el inventario" });
  }

  sheetMovimientos.appendRow([
    new Date(), sapProducto, producto, loteProducto,
    cantidad, unidadProducto,       // ✅ unidad guardada
    "", "", cantidad, destino,
    motivo, numeroGuia, observaciones
  ]);

  return jsonResponse({ ok: true, mensaje: "Salida registrada correctamente" });
}
