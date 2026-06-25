# 📦 MÓDULO ALMACÉN - RESUMEN COMPLETO

## ✅ FRONTEND (YA COMPLETADO)

### Archivos creados:
1. **almacen.html** - Página principal del almacén
2. **js/almacen.js** - Lógica del módulo (17KB)
3. **css/almacen.css** - Estilos responsive

### Funcionalidades implementadas:
✓ Ver inventario con búsqueda
✓ Registrar entrada de productos
✓ Registrar salida de productos
✓ Ver historial de movimientos
✓ Validación de disponibilidad
✓ Alertas con SweetAlert2
✓ Interfaz responsiva

### Menú lateral actualizado:
✓ Nuevo botón "🏪 Almacén" en menu-granja.html
✓ Manejador de navegación en menu-granja.js

---

## 🔧 BACKEND (PASOS A REALIZAR)

### Step 1️⃣ - Abre Google Apps Script
- Ve a tu Google Sheet
- Extensions → Apps Script

### Step 2️⃣ - Actualiza la función doPost()
Busca esta línea:
```javascript
if (accion === "registrar_mortalidad") return guardarMortalidad_Seleccion(data);
```

Y agrega DESPUÉS:
```javascript
if (accion === "obtener_inventario")         return obtenerInventario(data.granja);
if (accion === "registrar_entrada_almacen")  return registrarEntradaAlmacen(data);
if (accion === "registrar_salida_almacen")   return registrarSalidaAlmacen(data);
```

### Step 3️⃣ - Copia las 3 funciones nuevas
Ve al final del archivo (antes del último `}`), y copia TODO el contenido de `endpoints-almacen.gs`

### Step 4️⃣ - Deploy
- Deploy → New deployment
- Web app
- Anyone
- Deploy
- Copia la URL

### Step 5️⃣ - (IMPORTANTE) Actualiza config.js si la URL cambió
Si la URL de deployment es nueva, actualiza:
```javascript
const API_URL = "https://script.google.com/macros/s/TU_NUEVA_URL/exec";
```

---

## 📊 ESTRUCTURA DE DATOS

### Almacen_Productos (Columnas):
```
A1: Codigo_SAP
B1: Descripcion_Material
C1: Lote
D1: Cantidad
E1: Unidad_de_Medida
```

### Movimientos_Almacen (Columnas):
```
A1: Fecha
B1: Codigo_SAP
C1: Descripcion_Material
D1: Lote
E1: Cantidad
F1: Unidad_de_Medida
G1: Ingreso (para entradas)
H1: Origen
I1: Salida (para salidas)
J1: Destino/Motivo
K1: N° GUIA / Observaciones
```

---

## 🧪 TESTING RÁPIDO

Una vez que hagas Deploy, prueba en la consola del navegador:

```javascript
// Test 1: Obtener inventario
fetch(API_URL, {
  method: "POST",
  body: JSON.stringify({
    accion: "obtener_inventario",
    granja: "Tu_Granja"
  })
})
.then(r => r.json())
.then(d => console.log("Inventario:", d))

// Test 2: Registrar entrada
fetch(API_URL, {
  method: "POST",
  body: JSON.stringify({
    accion: "registrar_entrada_almacen",
    granja: "Tu_Granja",
    producto: "Alimento A",
    cantidad: 100,
    unidad: "Kilogramo",
    observaciones: "Test entrada"
  })
})
.then(r => r.json())
.then(d => console.log("Entrada:", d))
```

---

## 📋 ENDPOINTS DISPONIBLES

### 1. obtener_inventario
**Request:**
```json
{
  "accion": "obtener_inventario",
  "granja": "Nombre_Granja"
}
```

**Response:**
```json
{
  "ok": true,
  "productos": [
    {
      "id": "001",
      "nombre": "Alimento A",
      "lote": "12345",
      "cantidad": 500,
      "unidad": "Kilogramo",
      "fecha_actualizacion": "2026-06-09T..."
    }
  ],
  "movimientos": [...]
}
```

### 2. registrar_entrada_almacen
**Request:**
```json
{
  "accion": "registrar_entrada_almacen",
  "granja": "Nombre_Granja",
  "producto": "Nombre del Producto",
  "cantidad": 100,
  "unidad": "Kilogramo",
  "observaciones": "Notas opcionales"
}
```

**Response:**
```json
{
  "ok": true,
  "mensaje": "Entrada registrada correctamente"
}
```

### 3. registrar_salida_almacen
**Request:**
```json
{
  "accion": "registrar_salida_almacen",
  "granja": "Nombre_Granja",
  "producto": "Nombre del Producto",
  "cantidad": 50,
  "motivo": "Consumo",
  "observaciones": "Galpón 1"
}
```

**Response:**
```json
{
  "ok": true,
  "mensaje": "Salida registrada correctamente"
}
```

---

## 🚀 CHECKLIST FINAL

- [ ] Copiaste el código de endpoints-almacen.gs al Apps Script
- [ ] Actualizaste el doPost() con las 3 nuevas acciones
- [ ] Hiciste Deploy
- [ ] Copiaste la nueva URL en config.js (si cambió)
- [ ] Probaste los endpoints en la consola
- [ ] Navegaste a almacen.html desde el menú
- [ ] ¡Probaste Entrada, Salida e Historial!

**¡Felicidades! 🎉 Tu módulo de almacén está listo.**
