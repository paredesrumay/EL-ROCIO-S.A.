# IMPLEMENTACIÓN DE ENDPOINTS DE ALMACÉN

## 📋 Instrucciones para agregar a Google Apps Script

### PASO 1: Acceder al Editor de Apps Script

1. Abre tu Google Sheet del proyecto
2. Ve a **Extensions** → **Apps Script**
3. Abre el archivo `.gs` donde tienes la función `doPost`

### PASO 2: Agregar las nuevas acciones al doPost

En la función `doPost`, después de las acciones existentes, agrega esto:

```javascript
    if (accion === "obtener_inventario")           return obtenerInventario(data.granja);
    if (accion === "registrar_entrada_almacen")    return registrarEntradaAlmacen(data);
    if (accion === "registrar_salida_almacen")     return registrarSalidaAlmacen(data);
```

**Ubicación exacta:**

Antes de `return jsonResponse({ ok: false, mensaje: "Acción no reconocida: " + accion });`

Así quedará:

```javascript
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const accion = data.accion;

    if (accion === "login")                      return loginUsuario(data.usuario, data.password);
    if (accion === "obtener_granjas")            return obtenerGranjasActivas();
    if (accion === "obtener_info_granja")        return obtenerInfoGranja(data.granja);
    if (accion === "verificar_registro")         return verificarRegistroExistente(data);
    if (accion === "registrar_ingreso_pollitas") return guardarIngresoPollitas(data);
    if (accion === "registrar_pesos")            return guardarPesos(data);
    if (accion === "registrar_mortalidad")       return guardarMortalidad_Seleccion(data);
    
    // ← AGREGAR ESTAS 3 LÍNEAS:
    if (accion === "obtener_inventario")         return obtenerInventario(data.granja);
    if (accion === "registrar_entrada_almacen")  return registrarEntradaAlmacen(data);
    if (accion === "registrar_salida_almacen")   return registrarSalidaAlmacen(data);

    return jsonResponse({ ok: false, mensaje: "Acción no reconocida: " + accion });

  } catch (err) {
    return jsonResponse({ ok: false, mensaje: err.toString() });
  }
}
```

### PASO 3: Copiar las tres funciones nuevas

Al final de tu archivo `.gs` (después de la función `jsonResponse`), agrega todas las funciones del archivo `endpoints-almacen.gs` que se proporcionó.

### PASO 4: Actualizar el config.js (SI ES NECESARIO)

Si el API_URL en config.js es diferente al que tienes actualmente, actualízalo:

```javascript
const API_URL = "https://script.google.com/macros/s/TU_URL_DEL_APPS_SCRIPT/exec";
```

### PASO 5: Hacer Deploy

1. Haz clic en **Deploy** → **New deployment**
2. Selecciona **Type** → **Web app**
3. Asegúrate de que **Execute as** sea tu cuenta
4. **Who has access**: Anyone
5. Haz clic en **Deploy**
6. Copia la nueva URL del deployment

---

## 🧪 Prueba de los Endpoints

### Prueba 1: Obtener Inventario

```javascript
// En la consola del navegador (F12)
fetch("https://script.google.com/macros/s/TU_URL/exec", {
  method: "POST",
  body: JSON.stringify({
    accion: "obtener_inventario",
    granja: "Granja Test"
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

### Prueba 2: Registrar Entrada

```javascript
fetch("https://script.google.com/macros/s/TU_URL/exec", {
  method: "POST",
  body: JSON.stringify({
    accion: "registrar_entrada_almacen",
    granja: "Granja Test",
    producto: "Alimento A",
    cantidad: 100,
    unidad: "Kilogramo",
    observaciones: "Lote #12345"
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

### Prueba 3: Registrar Salida

```javascript
fetch("https://script.google.com/macros/s/TU_URL/exec", {
  method: "POST",
  body: JSON.stringify({
    accion: "registrar_salida_almacen",
    granja: "Granja Test",
    producto: "Alimento A",
    cantidad: 50,
    motivo: "Consumo",
    observaciones: "Galpón 1"
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

---

## ⚙️ Mapeo de Campos

### Almacen_Productos
- **Columna 1**: Codigo_SAP (ID del producto)
- **Columna 2**: Descripcion_Material (nombre del producto)
- **Columna 3**: Lote
- **Columna 4**: Cantidad (cantidad actual en stock)
- **Columna 5**: Unidad_de_Medida

### Movimientos_Almacen
- **Columna 1**: Fecha
- **Columna 2**: Codigo_SAP
- **Columna 3**: Descripcion_Material
- **Columna 4**: Lote
- **Columna 5**: Cantidad
- **Columna 6**: Unidad_de_Medida
- **Columna 7**: Ingreso (cantidad si es entrada)
- **Columna 8**: Origen (de dónde viene si es entrada)
- **Columna 9**: Salida (cantidad si es salida)
- **Columna 10**: Destino (a dónde va si es salida)
- **Columna 11**: N° GUIA / Observaciones

---

## 🚀 Instalación Completa

1. ✅ Copia el código de `endpoints-almacen.gs` a tu Google Apps Script
2. ✅ Agrega las 3 líneas al `doPost()`
3. ✅ Haz Deploy
4. ✅ Copia la nueva URL en `config.js` si cambió
5. ✅ El módulo almacén en `almacen.html` ya está configurado

**¡Listo! Tu sección de almacén está completa.**
