// almacen.js — Módulo de gestión de almacén
// Depende de js/config.js (API_URL)

const almacen = {
  vistaActual: 'menu',
  granjaActiva: null,
  inventario: [],
  matrizProductos: [], // <-- NUEVO: Para guardar los productos de la hoja Matriz
  movimientos: [],
  granjas: [],
  trabajadores: [],

  init() {
    const sesion = JSON.parse(localStorage.getItem("sesion"));
    if (!sesion) { window.location.href = "index.html"; return; }

    // ✅ CORREGIDO: sesion.granjas puede ser string o array; normalizar antes de comparar
    const granjasSesion = Array.isArray(sesion.granjas)
      ? sesion.granjas.join(",")
      : String(sesion.granjas || "");

    const esPersonalGranja = (sesion.rol === "OFICINISTA" || sesion.rol === "JEFE_DE_GRANJA" || sesion.rol === "Jefe de Granja");
    if (esPersonalGranja && granjasSesion.toUpperCase() !== "MALVINAS 3") {
      alert("El almacén solo está disponible para la granja Malvinas 3");
      window.location.href = "menu-granja.html";
      return;
    }

    this.granjaActiva = localStorage.getItem("granjaActiva") || "Malvinas 3";
    if (this.granjaActiva.toUpperCase() !== "MALVINAS 3") {
      alert("El almacén solo está disponible para la granja Malvinas 3");
      window.location.href = "menu-granja.html";
      return;
    }

    // Verificar si hay una vista inicial específica solicitada
    const vistaInicial = localStorage.getItem("almacenVistaInicial");
    localStorage.removeItem("almacenVistaInicial"); // Limpiar la bandera después de leerla

    // Restaurar estado de la barra lateral
    if (localStorage.getItem("sidebarState") === "closed") {
      document.getElementById("sidebar").classList.add("sidebar-cerrada");
      localStorage.removeItem("sidebarState"); // Limpiar para no afectar la recarga manual
    }

    // Ocultar botón de regresar en la sidebar si es Jefe de Granja
    const esJefeGranja = (sesion.rol === "JEFE_DE_GRANJA" || sesion.rol === "Jefe de Granja");
    if (esJefeGranja) {
      document.getElementById("btnRegresar").style.display = "none";
    }

    // Asignar eventos a los botones del menú lateral del almacén
    document.getElementById("btnMenuInventario").onclick = () => {
      this.mostrarInventario();
      document.getElementById("sidebar").classList.add("sidebar-cerrada");
    };
    document.getElementById("btnMenuEntrada").onclick = () => {
      this.mostrarFormularioEntrada();
      document.getElementById("sidebar").classList.add("sidebar-cerrada");
    };
    document.getElementById("btnMenuSalida").onclick = () => {
      this.mostrarFormularioSalida();
      document.getElementById("sidebar").classList.add("sidebar-cerrada");
    };
    document.getElementById("btnMenuConsumo").onclick = () => {
      this.mostrarFormularioConsumo();
      document.getElementById("sidebar").classList.add("sidebar-cerrada");
    };
    document.getElementById("btnMenuHistorial").onclick = () => {
      this.mostrarHistorial();
      document.getElementById("sidebar").classList.add("sidebar-cerrada");
    };

    this.setupEventos();
    // Cargar granjas e inventario, luego mostrar la vista correcta
    Promise.all([this.cargarGranjas(), this.cargarInventario(), this.cargarTrabajadores(), this.cargarMatrizProductos()])
      .then(() => {
        if (vistaInicial === "consumo") this.mostrarFormularioConsumo();
        else this.mostrarMenu(); // Mostrar el menú principal del almacén por defecto
      })
      .catch(error => this.mostrarError("Error al inicializar el almacén: " + (error.message || "Error de conexión.")));
  },

  setupEventos() {
    // Eventos de la barra lateral
    document.getElementById("btnToggle").onclick = () => {
      document.getElementById("sidebar").classList.toggle("sidebar-cerrada");
    };
    document.getElementById("btnCerrar").onclick = () => {
      localStorage.clear();
      window.location.href = "index.html";
    };
    document.getElementById("btnRegresar").onclick = () => {
      window.location.href = "menu-granja.html";
    };
  },

  cargarGranjas() {
    return window.apiFetch("obtener_granjas") // Retornar la promesa para encadenar .then()
    .then(data => {
      this.granjas = data.granjas || [];
    })
    .catch(() => console.error("Error al cargar granjas"));
  },

  cargarTrabajadores() {
    return window.apiFetch("buscar_trabajadores", { termino: "" })
    .then(data => {
      this.trabajadores = data.trabajadores || [];
    })
    .catch(error => console.error("Error al cargar trabajadores:", error));
  },

  cargarMatrizProductos() {
    return window.apiFetch("obtener_productos_matriz")
      .then(data => {
        this.matrizProductos = data.productos || [];
      })
      .catch(error => console.error("Error al cargar la matriz de productos:", error));
  },

  cargarInventario() {
    return window.apiFetch("obtener_inventario", { granja: this.granjaActiva }) // Retornar la promesa
    .then(data => {
      this.inventario  = data.productos   || [];
      this.movimientos = data.movimientos || [];
      return data; // Retornar data para el siguiente .then()
    })
    .catch(error => {
      this.mostrarError("Error al cargar inventario: " + (error.message || "Error de conexión."));
    })
  },

  // ─────────────────────────────────────────────
  //  INVENTARIO
  // ─────────────────────────────────────────────
  mostrarInventario() {
    this.vistaActual = 'inventario';
    const vista = document.getElementById("vistaAlmacen");

    if (this.inventario.length === 0) {
      vista.innerHTML = `
        <div class="almacen-container">
          <div class="almacen-header"><h2>Inventario</h2></div>
          <div class="empty-state">
            <p>No hay productos en el inventario.</p>
            <p style="font-size:12px;color:#ccc;margin-top:10px;">Registre una entrada de productos para comenzar.</p>
          </div>
        </div>`;
      return;
    }

    let tablaHTML = `
      <div class="almacen-container">
        <div class="almacen-header">
          <h2>📦 Inventario</h2>
          <button class="btn-back-mini" onclick="almacen.mostrarMenu()">← Menú</button>
        </div>
        <div class="search-container">
          <input type="text" id="buscarProducto" placeholder="Buscar por nombre o código SAP..." />
          <button onclick="almacen.buscarProducto()">Buscar</button>
        </div>
        <table class="inventario-table">
          <thead>
            <tr>
              <th>Código SAP</th>
              <th>Producto</th>
              <th>Lote</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>`;

    // Ordenar el inventario: productos con stock cero al final
    const inventarioOrdenado = [...this.inventario].sort((a, b) => {
      if (a.cantidad === 0 && b.cantidad !== 0) return 1;
      if (a.cantidad !== 0 && b.cantidad === 0) return -1;
      // Opcional: ordenar alfabéticamente el resto
      return a.nombre.localeCompare(b.nombre);
    });

    inventarioOrdenado.forEach(prod => {
      const estado      = prod.cantidad === 0 ? 'critico' : prod.cantidad < 10 ? 'bajo' : '';
      const estadoTexto = prod.cantidad === 0 ? '⚠️ SIN STOCK' : prod.cantidad < 10 ? '⚠️ BAJO' : '✓ BIEN';
      // Añadir una clase a la fila si el stock es cero
      const filaClass   = prod.cantidad === 0 ? 'fila-critica' : '';

      tablaHTML += `
        <tr class="${filaClass}">
          <td><code style="font-size:12px;">${prod.id || '-'}</code></td>
          <td><strong>${prod.nombre}</strong></td>
          <td>${prod.lote || '-'}</td>
          <td><span class="badge-cantidad ${estado || ''}">${prod.cantidad}</span></td>
          <td>${prod.unidad || 'Unidad'}</td>
          <td><span class="estado-${estado || 'bien'}">${estadoTexto}</span></td>
        </tr>`;
    });

    tablaHTML += `</tbody></table></div>`;
    vista.innerHTML = tablaHTML;

    document.getElementById("buscarProducto").addEventListener("keyup", () => this.buscarProducto());
  },

  buscarProducto() { // Esta función es para el inventario, no para el formulario de consumo
    const termino = document.getElementById("buscarProducto").value.toLowerCase();
    const filas   = document.querySelectorAll(".inventario-table tbody tr");

    // ✅ CORREGIDO: busca tanto en nombre (col 2) como en código SAP (col 1)
    filas.forEach(fila => {
      const celdas  = fila.querySelectorAll("td");
      const sap     = (celdas[0] ? celdas[0].textContent : "").toLowerCase();
      const nombre  = (celdas[1] ? celdas[1].textContent : "").toLowerCase();
      fila.style.display = (nombre.includes(termino) || sap.includes(termino)) ? "" : "none";
    });
  },

  // ─────────────────────────────────────────────
  //  FORMULARIO ENTRADA
  // ─────────────────────────────────────────────
  mostrarFormularioEntrada() {
    this.vistaActual = 'entrada';
    const vista = document.getElementById("vistaAlmacen");

    let opcionesGranjas = '<option value="">-- Seleccionar origen --</option>';
    this.granjas.forEach(g => {
      opcionesGranjas += `<option value="${g}">${g}</option>`;
    });
    opcionesGranjas += `<option value="EL PALMO">EL PALMO</option><option value="TERCEROS">TERCEROS</option>`;

    vista.innerHTML = `
      <div class="almacen-container">
        <div class="almacen-header">
          <h2>📥 Entrada de Productos</h2>
          <button class="btn-back-mini" onclick="almacen.mostrarMenu()">← Menú</button>
        </div>
        <form class="almacen-form" id="formEntrada">
          <div class="form-row">
            <div class="form-group">
              <label for="codigoSAPEntrada">Código SAP</label>
              <input type="text" id="codigoSAPEntrada" placeholder="Ingresa código SAP existente..." />
              <button type="button" class="btn-action" style="width:100%;margin-top:5px;padding:8px;"
                onclick="almacen.buscarProductoSAP()">Buscar por SAP</button>
            </div>
          </div>

          <div style="background:#f0f4f8;padding:10px;border-radius:8px;margin-bottom:15px;text-align:center;color:#666;font-size:14px;">
            — O completa los datos manualmente —
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="productoEntrada">Buscar por Nombre / Descripción *</label>
              <div style="position:relative;">
                <input type="text" id="productoEntrada" placeholder="Escriba para buscar o ingrese un nombre nuevo" required autocomplete="off" />
                <div id="resultadosBusquedaEntrada" style="position:absolute;top:100%;left:0;right:0;z-index:9999;margin-top:2px;"></div>
              </div>
            </div>
            <div class="form-group">
              <label for="loteEntrada">Lote</label>
              <input type="text" id="loteEntrada" placeholder="Lote (opcional)" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="cantidadEntrada">Cantidad *</label>
              <input type="number" id="cantidadEntrada" placeholder="Cantidad" min="1" required />
            </div>
            <div class="form-group">
              <label for="unidadEntrada">Unidad de medida *</label>
              <select id="unidadEntrada" required>${this._generarOpcionesUnidades()}</select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="origenEntrada">Origen *</label>
              <select id="origenEntrada" required>
                ${opcionesGranjas}
              </select>
            </div>
            <div class="form-group">
              <label for="numeroGuiaEntrada">N° de Guía <small>(opcional)</small></label>
              <input type="text" id="numeroGuiaEntrada" placeholder="Guía de remisión" />
            </div>
          </div>

          <div class="form-row full">
            <div class="form-group">
              <label for="observacionesEntrada">Observaciones</label>
              <textarea id="observacionesEntrada" placeholder="Notas adicionales..." rows="2"></textarea>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn-action">✓ Registrar Entrada</button>
            <button type="button" class="btn-action btn-secondary" onclick="almacen.mostrarMenu()">Cancelar</button>
          </div>
          <p id="msgEntrada" style="color:red;margin-top:10px;"></p>
        </form>
      </div>`;

    document.getElementById("formEntrada").onsubmit = (e) => {
      e.preventDefault();
      this.guardarEntrada();
    };

    // --- Lógica para el nuevo buscador dinámico por nombre ---
    const inputBusqueda = document.getElementById("productoEntrada");
    const resultadosDiv = document.getElementById("resultadosBusquedaEntrada");
    const self = this;

    inputBusqueda.addEventListener("keyup", () => {
      const termino = inputBusqueda.value.toLowerCase().trim();
      resultadosDiv.innerHTML = "";
      if (termino.length < 2) return;

      const coincidencias = self.matrizProductos.filter(p =>
        (String(p.nombre || '').toLowerCase().includes(termino))
      );

      if (coincidencias.length === 0) return;

      let html = '<div style="background:white;border:1px solid #ccc;border-radius:6px;max-height:200px;overflow-y:auto;box-shadow:0 6px 16px rgba(0,0,0,0.15);">';
      coincidencias.slice(0, 10).forEach(prod => {
        html += `<div class="producto-opcion"
             data-id="${prod.id}" data-nombre="${prod.nombre}"
             data-unidad="${prod.unidad}"
             style="padding:10px 12px;border-bottom:1px solid #eee;cursor:pointer;background:white;">
          <div style="font-weight:600;color:#1e5fa8;font-size:14px;">${prod.nombre}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">SAP: ${prod.id || '-'}</div>
        </div>`;
      });
      html += '</div>';
      resultadosDiv.innerHTML = html;

      document.querySelectorAll("#resultadosBusquedaEntrada .producto-opcion").forEach(opcion => {
        opcion.addEventListener("mouseenter", () => { opcion.style.background = "#f0f6ff"; });
        opcion.addEventListener("mouseleave", () => { opcion.style.background = "white"; });
        opcion.addEventListener("click", () => {
          // Al seleccionar, rellenamos los campos
          document.getElementById("codigoSAPEntrada").value = opcion.getAttribute("data-id");
          document.getElementById("productoEntrada").value = opcion.getAttribute("data-nombre");
          document.getElementById("unidadEntrada").value = opcion.getAttribute("data-unidad");
          resultadosDiv.innerHTML = ""; // Ocultar resultados
        });
      });
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener("click", function cerrarDropdown(e) {
      if (resultadosDiv && !inputBusqueda.contains(e.target) && !resultadosDiv.contains(e.target)) {
        resultadosDiv.innerHTML = "";
      }
    });
  },

  _generarOpcionesUnidades() {
    // Extraer todas las unidades de la matriz de productos
    const todasLasUnidades = this.matrizProductos.map(p => String(p.unidad || '').trim()).filter(Boolean);
    // Obtener unidades únicas y ordenarlas
    const unidadesUnicas = [...new Set(todasLasUnidades)].sort();

    let opcionesHTML = '<option value="">-- Seleccionar --</option>';
    unidadesUnicas.forEach(unidad => {
      opcionesHTML += `<option value="${unidad}">${unidad}</option>`;
    });
    return opcionesHTML;
  },

  buscarProductoSAP() {
    const codigo = document.getElementById("codigoSAPEntrada").value.trim();
    const msgEl  = document.getElementById("msgEntrada");

    if (!codigo) {
      msgEl.textContent = "Ingresa un código SAP";
      msgEl.style.color = "#f44336";
      return;
    }

    msgEl.textContent = "🔄 Buscando...";
    msgEl.style.color = "#1e5fa8";

    const producto = this.matrizProductos.find(p =>
      String(p.id || "").trim().toUpperCase() === codigo.toUpperCase()
    );

    if (producto) {
      document.getElementById("productoEntrada").value = producto.nombre;
      document.getElementById("loteEntrada").value     = ""; // Se deja vacío para ingresar el lote nuevo
      document.getElementById("unidadEntrada").value   = producto.unidad || "UN";
      msgEl.textContent = "✅ Producto encontrado";
      msgEl.style.color = "#4caf50";
      setTimeout(() => { msgEl.textContent = ""; }, 2000);
    } else {
      msgEl.textContent = "❌ Código SAP no encontrado. Complete los datos manualmente.";
      msgEl.style.color = "#f44336";
      document.getElementById("productoEntrada").value = "";
      document.getElementById("loteEntrada").value     = "";
      document.getElementById("unidadEntrada").value   = "";
    }
  },

  guardarEntrada() {
    const producto      = document.getElementById("productoEntrada").value.trim();
    const lote          = document.getElementById("loteEntrada").value.trim();
    const cantidad      = parseFloat(document.getElementById("cantidadEntrada").value);
    const unidad        = document.getElementById("unidadEntrada").value;
    const origen        = document.getElementById("origenEntrada").value;
    const observaciones = document.getElementById("observacionesEntrada").value.trim();
    const numeroGuia    = document.getElementById("numeroGuiaEntrada").value.trim();
    // ✅ CORREGIDO: incluir codigo_sap en el payload
    const codigoSAP     = document.getElementById("codigoSAPEntrada").value.trim();

    const msgEl = document.getElementById("msgEntrada");

    if (!producto) {
      msgEl.textContent = "Ingresa la descripción del material.";
      return;
    }
    if (!cantidad || cantidad <= 0) {
      msgEl.textContent = "Ingresa una cantidad válida.";
      return;
    }
    if (!unidad) {
      msgEl.textContent = "Selecciona una unidad de medida.";
      return;
    }
    if (!origen) {
      msgEl.textContent = "Selecciona un origen.";
      return;
    }

    // Bloquear botón y mostrar cargando
    const btnSubmit = document.querySelector("#formEntrada button[type='submit']");
    if (btnSubmit) btnSubmit.disabled = true;
    Swal.fire({
      title: 'Registrando entrada...',
      text: 'Espere un momento...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const sesion = JSON.parse(localStorage.getItem("sesion"));

    window.apiFetch("registrar_entrada_almacen", {
      granja:       this.granjaActiva,
      codigo_sap:   codigoSAP,
      producto,
      lote,
      cantidad,
      unidad,
      origen,
      observaciones,
      numero_guia:  numeroGuia,
      usuario:      sesion.nombre || sesion.usuario
    })
    .then(data => {
      Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        text: `Se cargaron ${cantidad} ${unidad}(s) al inventario.`,
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        document.getElementById("formEntrada").reset();
        if (btnSubmit) btnSubmit.disabled = false;
        this.cargarInventario();
      });
    })
    .catch(error => {
      if (btnSubmit) btnSubmit.disabled = false;
      Swal.close();
      msgEl.textContent = "Error: " + (error.message || "Error de conexión.");
    })
  },

  // ─────────────────────────────────────────────
  //  FORMULARIO SALIDA
  // ─────────────────────────────────────────────
  mostrarFormularioSalida() {
    this.vistaActual = 'salida';
    const vista = document.getElementById("vistaAlmacen");
    const self  = this;

    let opcionesGranjas = '<option value="">-- Seleccionar destino (opcional) --</option>';
    this.granjas.forEach(g => {
      opcionesGranjas += `<option value="${g}">${g}</option>`;
    });

    vista.innerHTML = `
      <div class="almacen-container">
        <div class="almacen-header">
          <h2>📤 Salida de Productos</h2>
          <button class="btn-back-mini" onclick="almacen.mostrarMenu()">← Menú</button>
        </div>

        <form class="almacen-form" id="formSalida">
          <div class="form-row full">
            <div class="form-group">
              <label for="buscarProductoSalida">Buscar Producto *</label>
              <div style="position:relative;">
                <input type="text" id="buscarProductoSalida" placeholder="Escribe el nombre del material..." autocomplete="off" style="width:100%;" />
                <div id="resultadosBusqueda" style="position:absolute;top:100%;left:0;right:0;z-index:9999;margin-top:2px;"></div>
              </div>
            </div>
          </div>

          <input type="hidden" id="productoSalidaID" value="" />

          <div style="background:#f0f4f8;padding:12px;border-radius:8px;margin-bottom:15px;display:none;" id="detalleProducto">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;font-size:13px;">
              <div><strong>Código SAP:</strong> <span id="detalleCodigo">-</span></div>
              <div><strong>Lote:</strong> <span id="detalleLote">-</span></div>
              <div><strong>Unidad:</strong> <span id="detalleUnidad">-</span></div>
            </div>
            <div style="margin-top:8px;font-size:13px;">
              <strong>Disponible:</strong>
              <span id="detalleDisponible" style="color:#4caf50;font-weight:bold;">-</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="cantidadSalida">Cantidad *</label>
              <input type="number" id="cantidadSalida" placeholder="Cantidad" min="1" required />
            </div>
            <div class="form-group">
              <label for="motivoSalida">Motivo de salida *</label>
              <select id="motivoSalida" required>
                <option value="">-- Seleccionar --</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="PRESTAMO">PRÉSTAMO</option>
                <option value="DEVOLUCION">DEVOLUCIÓN</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="destinoSalida">Destino (Granja) <small>(opcional)</small></label>
              <select id="destinoSalida">${opcionesGranjas}</select>
            </div>
            <div class="form-group">
              <label for="numeroGuia">N° de GUÍA <small>(opcional)</small></label>
              <input type="text" id="numeroGuia" placeholder="Número de guía de remisión" />
            </div>
          </div>

          <div class="form-row full">
            <div class="form-group">
              <label for="observacionesSalida">Observaciones</label>
              <textarea id="observacionesSalida" placeholder="Notas adicionales..." rows="2"></textarea>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn-action">✓ Registrar Salida</button>
            <button type="button" class="btn-action btn-secondary" onclick="almacen.mostrarMenu()">Cancelar</button>
          </div>
          <p id="msgSalida" style="color:red;margin-top:10px;"></p>
        </form>
      </div>`;

    // Buscador dinámico
    const inputBusqueda = document.getElementById("buscarProductoSalida");
    const resultados    = document.getElementById("resultadosBusqueda");

    inputBusqueda.addEventListener("keyup", () => {
      const termino = inputBusqueda.value.toLowerCase().trim();
      resultados.innerHTML = "";
      if (!termino) return;

      const coincidencias = self.inventario.filter(p =>
        (String(p.nombre || '').toLowerCase().includes(termino)) ||
        (String(p.id || '').toLowerCase().includes(termino))
      );

      if (coincidencias.length === 0) {
        resultados.innerHTML = '<div style="padding:10px;color:#999;background:#f5f5f5;border-radius:4px;">No se encontraron productos</div>';
        return;
      }

      let html = '<div style="background:white;border:1px solid #ccc;border-radius:6px;max-height:260px;overflow-y:auto;box-shadow:0 6px 16px rgba(0,0,0,0.15);">';
      coincidencias.slice(0, 10).forEach(prod => {
        html += `<div class="producto-opcion"
             data-id="${prod.id}" data-nombre="${prod.nombre}"
             data-cantidad="${prod.cantidad}" data-unidad="${prod.unidad}"
             data-lote="${prod.lote || ''}"
             style="padding:10px 12px;border-bottom:1px solid #eee;cursor:pointer;background:white;">
          <div style="font-weight:600;color:#1e5fa8;font-size:14px;">${prod.nombre}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">SAP: ${prod.id || '-'} &nbsp;|&nbsp; Disponible: <strong style="color:#4caf50;">${prod.cantidad}</strong> ${prod.unidad}</div>
        </div>`;
      });
      html += '</div>';
      resultados.innerHTML = html;

      document.querySelectorAll(".producto-opcion").forEach(opcion => {
        opcion.addEventListener("mouseenter", () => { opcion.style.background = "#f0f6ff"; });
        opcion.addEventListener("mouseleave", () => { opcion.style.background = "white"; });
        opcion.addEventListener("click", () => {
          self.seleccionarProductoSalida(
            opcion.getAttribute("data-id"),
            opcion.getAttribute("data-nombre"),
            opcion.getAttribute("data-cantidad"),
            opcion.getAttribute("data-unidad"),
            opcion.getAttribute("data-lote")
          );
        });
      });
    });

    // Cerrar dropdown al hacer clic fuera del buscador
    document.addEventListener("click", function cerrarDropdown(e) {
      const wrapper = document.getElementById("buscarProductoSalida");
      const drop    = document.getElementById("resultadosBusqueda");
      if (wrapper && drop && !wrapper.contains(e.target) && !drop.contains(e.target)) {
        drop.innerHTML = "";
        document.removeEventListener("click", cerrarDropdown);
      }
    });

    document.getElementById("formSalida").onsubmit = (e) => {
      e.preventDefault();
      this.guardarSalida();
    };
  },

  seleccionarProductoSalida(id, nombre, cantidad, unidad, lote) {
    document.getElementById("buscarProductoSalida").value = nombre;
    document.getElementById("productoSalidaID").value     = id;
    document.getElementById("resultadosBusqueda").innerHTML = "";

    const detalleDiv = document.getElementById("detalleProducto");
    detalleDiv.style.display = "block";
    document.getElementById("detalleCodigo").textContent    = id    || "-";
    document.getElementById("detalleLote").textContent      = lote  || "-";
    document.getElementById("detalleUnidad").textContent    = unidad;
    document.getElementById("detalleDisponible").textContent = cantidad;
  },

  guardarSalida() {
    const productoId    = document.getElementById("productoSalidaID").value;
    const cantidad      = parseFloat(document.getElementById("cantidadSalida").value);
    const motivo        = document.getElementById("motivoSalida").value;
    const destino       = document.getElementById("destinoSalida").value;
    const numeroGuia    = document.getElementById("numeroGuia").value.trim();
    const observaciones = document.getElementById("observacionesSalida").value.trim();
    const msgEl         = document.getElementById("msgSalida");

    if (!productoId) { msgEl.textContent = "Selecciona un producto."; return; }
    if (!cantidad || cantidad <= 0) { msgEl.textContent = "Ingresa una cantidad válida."; return; }
    if (!motivo) { msgEl.textContent = "Selecciona un motivo de salida."; return; }

    const producto = this.inventario.find(p => p.id === productoId);
    if (!producto) { msgEl.textContent = "Producto no encontrado."; return; }
    if (cantidad > producto.cantidad) {
      msgEl.textContent = `No hay suficiente cantidad disponible. (Disponible: ${producto.cantidad})`;
      return;
    }

    // Bloquear botón y mostrar cargando
    const btnSubmit = document.querySelector("#formSalida button[type='submit']");
    if (btnSubmit) btnSubmit.disabled = true;
    Swal.fire({
      title: 'Procesando salida...',
      text: 'Espere un momento...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const sesion = JSON.parse(localStorage.getItem("sesion"));

    window.apiFetch("registrar_salida_almacen", {
      granja:        this.granjaActiva,
      producto_id:   productoId,
      producto:      producto.nombre,
      cantidad,
      motivo,
      destino,
      numero_guia:   numeroGuia,
      observaciones,
      usuario:       sesion.nombre || sesion.usuario
    })
    .then(data => {
      Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        text: `Salida de ${cantidad} ${producto.unidad}(s) procesada correctamente.`,
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        document.getElementById("formSalida").reset();
        document.getElementById("productoSalidaID").value = "";
        document.getElementById("detalleProducto").style.display = "none";
        if (btnSubmit) btnSubmit.disabled = false;
        this.cargarInventario();
      });
    })
    .catch(error => {
      if (btnSubmit) btnSubmit.disabled = false;
      Swal.close();
      msgEl.textContent = "Error: " + (error.message || "Error de conexión.");
    })
  },

  // ─────────────────────────────────────────────
  //  FORMULARIO CONSUMO
  // ─────────────────────────────────────────────
  mostrarFormularioConsumo() {
    this.vistaActual = 'consumo';
    const vista = document.getElementById("vistaAlmacen");
    const self  = this;

    vista.innerHTML = `
      <div class="almacen-container">
        <div class="almacen-header">
          <h2>🍴 Registro de Consumo en Granja</h2>
          <button class="btn-back-mini" onclick="almacen.mostrarMenu()">← Menú</button>
        </div>

        <form class="almacen-form" id="formConsumo">
          <div class="form-row full">
            <div class="form-group">
              <label for="buscarProductoConsumo">BUSCADOR DE PRODUCTOS (Nombre o Código SAP) *</label>
              <div style="position:relative;">
                <input type="text" id="buscarProductoConsumo" placeholder="Escriba para buscar productos..." autocomplete="off" style="width:100%; padding:12px;" />
                <div id="resultadosBusquedaConsumo" style="position:absolute; top:100%; left:0; right:0; z-index:1000; background:white; border-radius:0 0 8px 8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); max-height:200px; overflow-y:auto;"></div>
              </div>
            </div>
          </div>

          <input type="hidden" id="productoConsumoID" value="" />

          <div style="background:#f8f9fa; padding:15px; border:1px solid #dee2e6; border-radius:8px; margin-bottom:20px; display:none;" id="detalleProductoConsumo">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:15px; font-size:14px;">
              <div><strong style="color:#495057;">PRODUCTO:</strong> <br><span id="detalleNombreConsumo" style="font-weight:600;">-</span></div>
              <div><strong style="color:#495057;">CÓDIGO SAP:</strong> <br><span id="detalleCodigoConsumo" style="font-weight:600;">-</span></div>
              <div><strong style="color:#495057;">UNIDAD DE MEDIDA:</strong> <br><span id="detalleUnidadConsumo" style="font-weight:600;">-</span></div>
              <div><strong style="color:#495057;">STOCK DISPONIBLE:</strong> <br><span id="detalleDisponibleConsumo" style="color:#28a745; font-weight:bold;">-</span></div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="cantidadConsumo">CANTIDAD A CONSUMIR *</label>
              <input type="number" id="cantidadConsumo" placeholder="Cantidad" min="0.01" step="0.01" required />
            </div>
            <div class="form-group">
              <label for="solicitanteConsumo">QUIEN SOLICITA (Trabajador) *</label>
              <div style="position:relative;">
                <input type="text" id="solicitanteConsumo" placeholder="Nombre completo del trabajador" autocomplete="off" required />
                <div id="resultadosBusquedaSolicitante" style="position:absolute; top:100%; left:0; right:0; z-index:1000; background:white; border-radius:0 0 8px 8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); max-height:200px; overflow-y:auto;"></div>
              </div>
            </div>
          </div>

          <div class="form-row full">
            <div class="form-group">
              <label for="observacionesConsumo">OBSERVACIONES</label>
              <textarea id="observacionesConsumo" placeholder="Notas adicionales sobre el consumo..." rows="2"></textarea>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn-action">✓ Registrar Consumo</button>
            <button type="button" class="btn-action btn-secondary" onclick="almacen.mostrarMenu()">Cancelar</button>
          </div>
          <p id="msgConsumo" style="color:red;margin-top:10px;"></p>
        </form>
      </div>`;

    const inputBusqueda = document.getElementById("buscarProductoConsumo");
    const resultados    = document.getElementById("resultadosBusquedaConsumo");

    inputBusqueda.addEventListener("keyup", () => {
      const termino = inputBusqueda.value.toLowerCase().trim();
      resultados.innerHTML = "";
      if (!termino) return;

      const coincidencias = self.inventario.filter(p => 
        (String(p.nombre || '').toLowerCase().includes(termino)) ||
        (String(p.id || '').toLowerCase().includes(termino))
      );

      if (coincidencias.length === 0) {
        resultados.innerHTML = '<div style="padding:10px;color:#999;background:#f5f5f5;border-radius:4px;">No se encontraron productos</div>';
        return;
      }

      let html = '<div style="background:white;border:1px solid #ccc;border-radius:6px;max-height:220px;overflow-y:auto;box-shadow:0 6px 16px rgba(0,0,0,0.15);">';
      coincidencias.slice(0, 10).forEach(prod => {
        html += `<div class="producto-opcion" 
             data-id="${prod.id}" data-nombre="${prod.nombre}" 
             data-cantidad="${prod.cantidad}" data-unidad="${prod.unidad}" 
             style="padding:12px; border-bottom:1px solid #f1f1f1; cursor:pointer; transition: background 0.2s;">
          <div style="font-weight:600; color:#1e5fa8; font-size:14px;">${prod.nombre}</div>
          <div style="font-size:12px;color:#666;">SAP: ${prod.id || '-'} | Disponible: ${prod.cantidad} ${prod.unidad}</div>
        </div>`;
      });
      html += '</div>';
      resultados.innerHTML = html;

      document.querySelectorAll("#resultadosBusquedaConsumo .producto-opcion").forEach(opcion => {
        opcion.addEventListener("mouseenter", () => { opcion.style.background = "#f0f6ff"; });
        opcion.addEventListener("mouseleave", () => { opcion.style.background = "white"; });
        opcion.onclick = () => {
          self.seleccionarProductoConsumo(
            opcion.getAttribute("data-id"),
            opcion.getAttribute("data-nombre"),
            opcion.getAttribute("data-cantidad"),
            opcion.getAttribute("data-unidad")
          );
        };
      });
    });

    // --- Lógica para el buscador de solicitantes ---
    const inputSolicitante = document.getElementById("solicitanteConsumo");
    const resultadosSolicitante = document.getElementById("resultadosBusquedaSolicitante");

    const buscarSolicitante = () => {
      const termino = inputSolicitante.value.toLowerCase().trim();
      resultadosSolicitante.innerHTML = "";
      if (!termino) return;

      const coincidencias = self.trabajadores.filter(t => 
        t.toLowerCase().includes(termino)
      );

      if (coincidencias.length > 0) {
        let html = '<div style="background:white;border:1px solid #ccc;border-radius:6px;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.15);">';
        coincidencias.forEach(trabajador => {
          html += `<div class="solicitante-opcion"
                     data-nombre="${trabajador}"
                     style="padding:10px 12px; border-bottom:1px solid #f1f1f1; cursor:pointer; transition: background 0.2s;">
                  ${trabajador}
                </div>`;
        });
        html += '</div>';
        resultadosSolicitante.innerHTML = html;

        document.querySelectorAll("#resultadosBusquedaSolicitante .solicitante-opcion").forEach(opcion => {
          opcion.addEventListener("mouseenter", () => { opcion.style.background = "#f0f6ff"; });
          opcion.addEventListener("mouseleave", () => { opcion.style.background = "white"; });
          opcion.onclick = () => {
            self.seleccionarSolicitante(opcion.getAttribute("data-nombre"));
          };
        });
      } else {
        resultadosSolicitante.innerHTML = '<div style="padding:10px;color:#999;background:#f5f5f5;border-radius:4px;">No se encontraron trabajadores</div>';
      }
    };

    inputSolicitante.addEventListener("keyup", buscarSolicitante);

    // Cerrar dropdown al hacer clic fuera del buscador de solicitantes
    document.addEventListener("click", function cerrarDropdownSolicitante(e) {
      const wrapper = inputSolicitante;
      const drop    = resultadosSolicitante;
      if (wrapper && drop && !wrapper.contains(e.target) && !drop.contains(e.target)) {
        drop.innerHTML = "";
      }
    });

    this.seleccionarSolicitante = function (nombre) {
      inputSolicitante.value = nombre;
      resultadosSolicitante.innerHTML = "";
    };

    document.getElementById("formConsumo").onsubmit = (e) => {
      e.preventDefault();
      this.guardarConsumo();
    };
  },

  seleccionarProductoConsumo(id, nombre, cantidad, unidad) {
    document.getElementById("buscarProductoConsumo").value = nombre;
    document.getElementById("productoConsumoID").value     = id;
    document.getElementById("resultadosBusquedaConsumo").innerHTML = "";

    const detalleDiv = document.getElementById("detalleProductoConsumo");
    detalleDiv.style.display = "block";
    document.getElementById("detalleNombreConsumo").textContent    = nombre;
    document.getElementById("detalleCodigoConsumo").textContent    = id || "-";
    document.getElementById("detalleUnidadConsumo").textContent    = unidad;
    document.getElementById("detalleDisponibleConsumo").textContent = cantidad;
  },

  guardarConsumo() {
    const productoId    = document.getElementById("productoConsumoID").value;
    const cantidad      = parseFloat(document.getElementById("cantidadConsumo").value);
    const solicitante   = document.getElementById("solicitanteConsumo").value.trim();
    const observaciones = document.getElementById("observacionesConsumo").value.trim();
    const msgEl         = document.getElementById("msgConsumo");

    if (!productoId) { msgEl.textContent = "Seleccione un producto."; return; }
    if (!cantidad || cantidad <= 0) { msgEl.textContent = "Ingrese una cantidad válida."; return; }
    if (!solicitante) { msgEl.textContent = "Ingrese quién solicita el producto."; return; }

    const producto = this.inventario.find(p => p.id === productoId);
    if (!producto) { msgEl.textContent = "Producto no encontrado."; return; }
    if (cantidad > producto.cantidad) {
      msgEl.textContent = `Stock insuficiente en almacén. (Disponible: ${producto.cantidad})`;
      return;
    }

    // Bloquear botón y mostrar cargando
    const btnSubmit = document.querySelector("#formConsumo button[type='submit']");
    if (btnSubmit) btnSubmit.disabled = true;
    Swal.fire({
      title: 'Registrando consumo...',
      text: 'Procesando solicitud...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const sesion = JSON.parse(localStorage.getItem("sesion"));

    window.apiFetch("registrar_salida_almacen", {
      granja:        this.granjaActiva,
      producto_id:   productoId,
      producto:      producto.nombre,
      cantidad,
      motivo:        "CONSUMO INTERNO",
      destino:       "", // El destino es la propia granja, no un trabajador.
      trabajador:    solicitante, // NUEVO: Enviamos el trabajador en un campo separado.
      numero_guia:   "",
      observaciones: observaciones,
      usuario:       sesion.nombre || sesion.usuario,
    })
    .then(data => {
      Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        text: `Consumo de ${solicitante} guardado correctamente.`,
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        document.getElementById("formConsumo").reset();
        document.getElementById("productoConsumoID").value = "";
        document.getElementById("detalleProductoConsumo").style.display = "none";
        if (btnSubmit) btnSubmit.disabled = false;
        this.cargarInventario();
      });
    })
    .catch(error => {
      if (btnSubmit) btnSubmit.disabled = false;
      Swal.close();
      msgEl.textContent = "Error: " + (error.message || "Error de conexión.");
    });
  },

  // ─────────────────────────────────────────────
  //  HISTORIAL
  // ─────────────────────────────────────────────
  mostrarHistorial() {
    this.vistaActual = 'historial';
    const vista = document.getElementById("vistaAlmacen");

    if (this.movimientos.length === 0) {
      vista.innerHTML = `
        <div class="almacen-container">
          <div class="almacen-header">
            <h2>📋 Historial de Movimientos</h2>
            <button class="btn-back-mini" onclick="almacen.mostrarMenu()">← Menú</button>
          </div>
          <div class="empty-state"><p>No hay movimientos registrados.</p></div>
        </div>`;
      return;
    }

    let historialHTML = `
      <div class="almacen-container">
        <div class="almacen-header">
          <h2>📋 Historial de Movimientos</h2>
          <button class="btn-back-mini" onclick="almacen.mostrarMenu()">← Menú</button>
        </div>
        <div class="search-container" style="align-items: center; flex-wrap: wrap; gap: 8px; background: #f8f9fa; padding: 10px; border-radius: 8px;">
          <label for="fechaInicio" style="font-size:13px;font-weight:bold;">Desde:</label>
          <input type="date" id="fechaInicio" style="padding:8px;border:1px solid #ccc;border-radius:6px;">
          <label for="fechaFin" style="font-size:13px;font-weight:bold;">Hasta:</label>
          <input type="date" id="fechaFin" style="padding:8px;border:1px solid #ccc;border-radius:6px;">
          <button id="btnFiltrarFecha" class="btn-action" style="padding:8px 12px;">Filtrar</button>
          <button id="btnLimpiarFiltro" class="btn-action btn-secondary" style="padding:8px 12px;">Limpiar</button>
        </div>
        <div class="movimientos-list" id="lista-movimientos">`;

    // Invertir el array de movimientos para mostrar los más recientes primero
    const movimientosRecientesPrimero = [...this.movimientos].reverse();
    movimientosRecientesPrimero.forEach(mov => {
      const fecha      = new Date(mov.fecha).toLocaleString();
      
      // Lógica para clasificar el tipo de movimiento
      let tipo, badgeClass, icono;
      if (mov.tipo === 'entrada') {
        tipo = 'Entrada';
        badgeClass = 'entrada';
        icono = '📥';
      } else if (String(mov.motivo || '').toLowerCase().includes('consumo')) {
        tipo = 'Consumo';
        badgeClass = 'salida'; // Usamos el mismo estilo visual que la salida
        icono = '🍴';
      } else {
        tipo = 'Salida';
        badgeClass = 'salida';
        icono = '📤';
      }
      const unidadMov  = mov.unidad || 'unidades';

      historialHTML += `
        <div class="movimiento-item ${mov.tipo}">
          <div class="movimiento-info">
            <span class="movimiento-badge ${badgeClass}">${icono} ${tipo}</span>
            <strong>${mov.producto}</strong> — ${mov.cantidad} ${unidadMov}
            ${mov.motivo ? `<span style="color:#666;">(${mov.motivo})</span>` : ''}
            ${mov.destino ? `<span style="color:#888;font-size:12px;"> → ${mov.destino}</span>` : ''}
            <div class="movimiento-fecha">${fecha}</div>
            ${mov.numero_guia   ? `<div style="color:#555;font-size:12px;margin-top:3px;">Guía: ${mov.numero_guia}</div>` : ''}
            ${mov.observaciones ? `<div style="color:#666;font-size:12px;margin-top:3px;">${mov.observaciones}</div>` : ''}
          </div>
        </div>`;
    });

    historialHTML += `</div></div>`;
    vista.innerHTML = historialHTML;

    document.getElementById('btnFiltrarFecha').onclick = () => this.filtrarMovimientosPorFecha();
    document.getElementById('btnLimpiarFiltro').onclick = () => {
      document.getElementById('fechaInicio').value = '';
      document.getElementById('fechaFin').value = '';
      this.renderizarListaMovimientos(this.movimientos);
    };

    this.renderizarListaMovimientos(this.movimientos);
  },

  filtrarMovimientosPorFecha() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    if (!fechaInicio || !fechaFin) {
      Swal.fire('Atención', 'Por favor, seleccione una fecha de inicio y una fecha de fin.', 'warning');
      return;
    }

    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);

    const movimientosFiltrados = this.movimientos.filter(mov => {
      const fechaMov = new Date(mov.fecha);
      return fechaMov >= inicio && fechaMov <= fin;
    });

    this.renderizarListaMovimientos(movimientosFiltrados);
  },

  renderizarListaMovimientos(movimientos) {
    const listaDiv = document.getElementById('lista-movimientos');
    if (!listaDiv) return;

    if (movimientos.length === 0) {
      listaDiv.innerHTML = '<div class="empty-state"><p>No se encontraron movimientos para el filtro aplicado.</p></div>';
      return;
    }

    let historialHTML = '';
    const movimientosRecientesPrimero = [...movimientos].reverse();

    movimientosRecientesPrimero.forEach(mov => {
      const fecha = new Date(mov.fecha).toLocaleString();
      let tipo, badgeClass, icono;
      if (mov.tipo === 'entrada') {
        tipo = 'Entrada'; badgeClass = 'entrada'; icono = '📥';
      } else if (String(mov.motivo || '').toLowerCase().includes('consumo')) {
        tipo = 'Consumo'; badgeClass = 'salida'; icono = '🍴';
      } else {
        tipo = 'Salida'; badgeClass = 'salida'; icono = '📤';
      }
      const unidadMov = mov.unidad || 'unidades';

      historialHTML += `
        <div class="movimiento-item ${mov.tipo}">
          <div class="movimiento-info">
            <span class="movimiento-badge ${badgeClass}">${icono} ${tipo}</span>
            <strong>${mov.producto}</strong> — ${mov.cantidad} ${unidadMov}
            ${mov.motivo ? `<span style="color:#666;">(${mov.motivo})</span>` : ''}
            ${mov.destino ? `<span style="color:#888;font-size:12px;"> → ${mov.destino}</span>` : ''}
            <div class="movimiento-fecha">${fecha}</div>
            ${mov.numero_guia ? `<div style="color:#555;font-size:12px;margin-top:3px;">Guía: ${mov.numero_guia}</div>` : ''}
            ${mov.observaciones ? `<div style="color:#666;font-size:12px;margin-top:3px;">${mov.observaciones}</div>` : ''}
          </div>
        </div>`;
    });

    listaDiv.innerHTML = historialHTML;
  },

  // ─────────────────────────────────────────────
  //  MENÚ PRINCIPAL
  // ─────────────────────────────────────────────
  mostrarMenu() {
    const sesion = JSON.parse(localStorage.getItem("sesion"));
    const esJefeGranja = (sesion.rol === "JEFE_DE_GRANJA" || sesion.rol === "Jefe de Granja");
    const vista = document.getElementById("vistaAlmacen");
    vista.innerHTML = `
      <div class="menu-principal-almacen">
        <div class="menu-header">
          <h1>🏪 Almacén</h1>
          <p class="subtitle">Granja ${this.granjaActiva}</p>
        </div>
        <div class="menu-grid">
          <button class="menu-card" onclick="almacen.mostrarInventario()">
            <div class="card-icon">📦</div><div class="card-title">Inventario</div><div class="card-desc">Ver el stock actual</div>
          </button>
          <button class="menu-card" onclick="almacen.mostrarFormularioEntrada()">
            <div class="card-icon">📥</div><div class="card-title">Entrada</div><div class="card-desc">Registrar nuevos productos</div>
          </button>
          <button class="menu-card" onclick="almacen.mostrarFormularioSalida()">
            <div class="card-icon">📤</div><div class="card-title">Salida</div><div class="card-desc">Transferencias y devoluciones</div>
          </button>
          <button class="menu-card" onclick="almacen.mostrarFormularioConsumo()">
            <div class="card-icon">🍴</div><div class="card-title">Consumo</div><div class="card-desc">Registrar consumo en granja</div>
          </button>
          <button class="menu-card" onclick="almacen.mostrarHistorial()">
            <div class="card-icon">📋</div><div class="card-title">Historial</div><div class="card-desc">Revisar todos los movimientos</div>
          </button>
        </div>
        ${!esJefeGranja ? `
          <button class="btn-back-main" onclick="window.location.href='menu-granja.html'">← Regresar al Menú de Granjas</button>
        ` : ''}
      </div>`;
  },

  mostrarError(mensaje) {
    document.getElementById("vistaAlmacen").innerHTML =
      `<p style="color:red;text-align:center;padding:20px;">${mensaje}</p>`;
  }
};

document.addEventListener("DOMContentLoaded", () => { almacen.init(); });
