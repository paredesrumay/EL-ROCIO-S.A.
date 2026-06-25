# 📋 CAMBIOS REALIZADOS AL MÓDULO ALMACÉN

## ✅ ÚLTIMAS CORRECCIONES - BUSCADORES REPARADOS

### 🔧 Buscador de SAP en Entrada - REPARADO
- ✅ Removido delay de 500ms → Ahora busca instantáneamente
- ✅ Mejorada validación de `p.id` (evita null/undefined)
- ✅ Mensaje de error claro cuando no encuentra el SAP
- ✅ Campos se limpian correctamente para registrar producto nuevo

### 🔍 Buscador Dinámico en Salida - REPARADO
- ✅ Cambiado de `onclick` inline a event listeners
- ✅ Usa `data-` attributes para prevenir problemas con caracteres especiales
- ✅ Click en producto ahora funciona correctamente
- ✅ Detalles del producto se cargan automáticamente

---

## ✅ CAMBIOS EN EL FRONTEND

### 1. **Almacén solo para Malvinas 3**
- ✅ Validación en `almacen.js`: Solo usuarios/granjas de "Malvinas 3" pueden acceder
- ✅ El botón Almacén se oculta automáticamente en otras granjas
- ✅ Redirección automática si alguien intenta acceder desde otra granja

### 2. **Formulario de ENTRADA** - Mejoras:
- ✅ **Búsqueda por Código SAP**: Campo para ingresar el SAP del producto existente
- ✅ **Botón "Buscar por SAP"**: Autocompleta descripción, lote y unidad
- ✅ **Descripción del Material**: Campo renombrado y requerido
- ✅ **Lote**: Campo separado (opcional)
- ✅ **Cantidad**: Campo requerido
- ✅ **Unidad de Medida**: Selector (no obligatorio)
- ✅ **Origen**: Lista desplegable con todas las granjas + "EL PALMO"
- ❌ **Removido**: Campo "Precio Unitario" (no se usa)
- ✅ **Observaciones**: Campo para notas adicionales

### 3. **Formulario de SALIDA** - Mejoras:
- ✅ **Barra de Búsqueda**: Input dinámico para filtrar productos
- ✅ **Detalles del Producto**: Panel informativo mostrando:
  - Código SAP
  - Lote (si existe)
  - Unidad de Medida
  - Cantidad Disponible
- ✅ **Cantidad**: Campo requerido
- ✅ **Motivo de Salida**: Selector con opciones predefinidas
- ✅ **Destino (Granja)**: Lista desplegable con todas las granjas
- ✅ **N° de GUÍA**: Campo OPCIONAL (no obligatorio)
- ✅ **Observaciones**: Campo para notas adicionales

### 4. **Tabla de Inventario** - Mejoras:
- ✅ Código SAP mostrado en primera columna
- ✅ Lote mostrado en tabla
- ✅ Búsqueda avanzada (por código SAP o nombre)

## ✅ CAMBIOS EN EL BACKEND

### Google Apps Script - Funciones Actualizadas:

#### `registrarEntradaAlmacen(data)`
```javascript
Campos ahora soportados:
- lote (NUEVO)
- origen (ACTUALIZADO - antes era "granja")
- observaciones
```

#### `registrarSalidaAlmacen(data)`
```javascript
Campos ahora soportados:
- motivo (ACTUALIZADO - ahora es campo separado)
- destino (NUEVO - la granja destino)
- numero_guia (NUEVO - opcional)
- observaciones
```

## 📋 MAPEO DE DATOS EN SHEETS

### Movimientos_Almacen (Columnas):
```
A: Fecha
B: Codigo_SAP
C: Descripcion_Material
D: Lote
E: Cantidad
F: Unidad_de_Medida
G: Ingreso (si es entrada)
H: Origen (para entradas)
I: Salida (si es salida)
J: Destino (para salidas)
K: N° GUIA / Observaciones
```

## 🔄 FLUJO DE DATOS

### ENTRADA:
1. Usuario ingresa Código SAP O completa datos manualmente
2. Si existe el SAP, autocompleta producto/lote/unidad
3. Ingresa cantidad, selecciona origen (granja o "EL PALMO")
4. Se registra en Movimientos_Almacen con tipo "Ingreso"
5. Se actualiza cantidad en Almacen_Productos

### SALIDA:
1. Usuario selecciona producto de lista
2. Sistema muestra SAP, lote, unidad, disponibilidad
3. Usuario usa barra de búsqueda para filtrar si necesita
4. Ingresa cantidad, motivo, destino (granja), y opcionalmente N° GUÍA
5. Se registra en Movimientos_Almacen con tipo "Salida"
6. Se resta cantidad en Almacen_Productos

## 🚀 PASOS PARA ACTIVAR

### 1. Actualizar Google Apps Script
- Copia el código completo de `CODIGO-COMPLETO-APPS-SCRIPT.gs`
- Reemplaza en tu Google Apps Script
- Haz Deploy (Nueva URL)

### 2. Actualizar config.js
Si la URL del deployment cambió:
```javascript
const API_URL = "https://script.google.com/macros/s/NUEVA_URL/exec";
```

### 3. Probar
- Accede al almacén desde Malvinas 3
- Prueba entrada con búsqueda de SAP
- Prueba salida con destino y guía opcional

## ✨ CARACTERÍSTICAS ADICIONALES

✅ Validaciones de cantidad disponible  
✅ Búsqueda dinámica en select de salida  
✅ Autocomplete de productos por SAP  
✅ Alertas visuales con SweetAlert2  
✅ Panel de detalles del producto en salidas  
✅ Restricción a una sola granja (Malvinas 3)  
✅ Campos opcionales claramente marcados  
✅ Interfaz responsiva y intuitiva  

## 📌 NOTA IMPORTANTE

El almacén está **vinculado exclusivamente a Malvinas 3**. Si necesitas:
- Diferentes almacenes por granja
- Permitir acceso a múltiples granjas

Avísame y haremos los ajustes necesarios.
