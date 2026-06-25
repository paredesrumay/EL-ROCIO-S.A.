// menu-granja.js — depende de js/config.js (API_URL definida ahí)

let cantidadGalponesGlobal = 0;

document.addEventListener("DOMContentLoaded", function () {

  const sesion = JSON.parse(localStorage.getItem("sesion"));
  if (!sesion) { window.location.href = "index.html"; return; }

  const vistaGranjas  = document.getElementById("vistaGranjas");
  const vistaModulo   = document.getElementById("vistaModulo");
  const nombreGranja  = document.getElementById("nombreGranja");
  const menuSistema   = document.getElementById("menuSistema");
  const btnRegresar   = document.getElementById("btnRegresar");
  const grid          = document.getElementById("gridGranjas");
  const rolAcceso     = document.getElementById("rolAcceso");
  const loadingEl     = document.getElementById("loading");

  // --- NAVEGACIÓN ---
  document.getElementById("btnCerrar").onclick = () => {
    localStorage.clear();
    window.location.href = "index.html";
  };

  document.getElementById("btnToggle").onclick = () => {
    document.getElementById("sidebar").classList.toggle("sidebar-cerrada");
  };

  btnRegresar.onclick = () => {
    localStorage.removeItem("granjaActiva");
    cantidadGalponesGlobal = 0;
    vistaGranjas.style.display  = "block";
    menuSistema.style.display   = "none";
    nombreGranja.style.display  = "none";
    btnRegresar.style.display   = "none";
    vistaModulo.style.display   = "none";
    vistaModulo.innerHTML       = "";
  };

  // Botones del menú lateral
  document.getElementById("btnMenuIngreso").onclick  = () => {
    window.mostrarOpcionesIngreso();
    document.getElementById("sidebar").classList.add("sidebar-cerrada");
  };
  document.getElementById("btnMenuPesos").onclick    = () => {
    window.mostrarOpcionesPesos();
    document.getElementById("sidebar").classList.add("sidebar-cerrada");
  };

  // Botón Mortalidad (referenciado por ID)
  if (document.getElementById("btnMenuMortalidad")) {
    document.getElementById("btnMenuMortalidad").onclick = () => {
      window.mostrarOpcionesMortalidad();
      document.getElementById("sidebar").classList.add("sidebar-cerrada");
    };
  }

  // Botón Consumo Directo (redirige a almacén y muestra formulario de consumo)
  if (document.getElementById("btnMenuConsumoDirecto")) {
    document.getElementById("btnMenuConsumoDirecto").onclick = () => {
      localStorage.setItem("sidebarState", "closed");
      window.abrirAlmacenConsumo();
    };
  }

  // Botón Almacén (solo visible en Malvinas 3)
  const btnAlmacen = document.getElementById("btnMenuAlmacen");
  if (btnAlmacen) {
    btnAlmacen.onclick = () => {
      localStorage.setItem("sidebarState", "closed");
      window.abrirAlmacen();
    };
    // Ocultar almacén si no es Malvinas 3
    const esPersonalGranja = (sesion.rol === "OFICINISTA" || sesion.rol === "JEFE_DE_GRANJA" || sesion.rol === "Jefe de Granja");
    if (esPersonalGranja && sesion.granjas.toUpperCase() !== "MALVINAS 3") {
      btnAlmacen.style.display = "none";
    }
  }

  // --- INICIO según rol ---
  const esJefeGranja = (sesion.rol === "JEFE_DE_GRANJA" || sesion.rol === "Jefe de Granja");
  if (sesion.rol === "OFICINISTA" || esJefeGranja) {
    seleccionarGranja(sesion.granjas);
    btnRegresar.style.display = "none";

    if (esJefeGranja) {
      // Ocultar módulos que no pertenecen al Jefe de Granja (Almacén)
      if (document.getElementById("btnMenuIngreso")) document.getElementById("btnMenuIngreso").style.display = "none";
      if (document.getElementById("btnMenuPesos")) document.getElementById("btnMenuPesos").style.display = "none";
      if (document.getElementById("btnMenuMortalidad")) document.getElementById("btnMenuMortalidad").style.display = "none";
      if (document.getElementById("btnMenuConsumoDirecto")) document.getElementById("btnMenuConsumoDirecto").style.display = "none";
    }
  } else {
    if (rolAcceso) {
      rolAcceso.textContent =
        sesion.rol === "GERENTE_GENERAL" ? "Acceso: Gerente General" : "Acceso: Administrador";
    }
    cargarListaGranjas();
  }

  // ─────────────────────────────────────────────
  //  CARGA DE GRANJAS
  // ─────────────────────────────────────────────
  function cargarListaGranjas() {
    if (loadingEl) loadingEl.style.display = "block";
    grid.innerHTML = "";

    window.apiFetch("obtener_granjas")
      .then(d => {
        const loadingEl = document.getElementById("loading"); // Re-fetch inside promise
        const grid = document.getElementById("gridGranjas"); // Re-fetch inside promise
        if (loadingEl) loadingEl.style.display = "none";

        if (!d.ok) {
          grid.innerHTML = `<p style="color:red;">Error al cargar granjas: ${d.mensaje || ""}</p>`;
          return;
        }

        let granjas = d.granjas;

        // Filtrar por granjas permitidas si es ADMINISTRADOR
        if (sesion.rol === "ADMINISTRADOR" && sesion.granjas) {
          const permitidas = sesion.granjas.split(",").map(x => x.trim().toUpperCase());
          granjas = granjas.filter(g => permitidas.includes(g.toUpperCase()));
        }

        if (granjas.length === 0) {
          grid.innerHTML = "<p>No hay granjas disponibles.</p>";
          return;
        }

        granjas.forEach(g => {
          const btn = document.createElement("button");
          btn.className   = "granja-card";
          btn.textContent = g;
          btn.onclick     = () => seleccionarGranja(g);
          grid.appendChild(btn);
        });
      })
      .catch(err => {
        if (loadingEl) loadingEl.style.display = "none";
        grid.innerHTML = `<p style="color:red;">Error: ${err.message || "Error de conexión"}</p>`;
      });
  }

  // ─────────────────────────────────────────────
  //  SELECCIÓN DE GRANJA
  // ─────────────────────────────────────────────
  function seleccionarGranja(granja) {
    localStorage.setItem("granjaActiva", granja);
    vistaGranjas.style.display  = "none";
    vistaModulo.style.display   = "block";
    vistaModulo.innerHTML       = "<p style='color:#555;'>Cargando información...</p>";
    nombreGranja.textContent    = granja;
    nombreGranja.style.display  = "block";
    menuSistema.style.display   = "flex";

    const esPersonalGranja = (sesion.rol === "OFICINISTA" || sesion.rol === "JEFE_DE_GRANJA" || sesion.rol === "Jefe de Granja");
    if (!esPersonalGranja) btnRegresar.style.display = "block";

    window.apiFetch("obtener_info_granja", { granja })
    .then(res => {
      if (!res.ok) {
        vistaModulo.innerHTML = `<p style="color:red;">Error: ${res.mensaje}</p>`;
        return;
      }
      cantidadGalponesGlobal = res.galpones || 0;
      vistaModulo.innerHTML = `
        <h2>${granja}</h2>
        <p>Granja con <strong>${cantidadGalponesGlobal}</strong> galpón(es).</p>
        <p style="color:#555;">Use el menú lateral para registrar datos.</p>`;
    })
    .catch(() => {
      vistaModulo.innerHTML = `<p style="color:red;">Error de conexión. Verifique la URL del API o los permisos.</p>`;
    });
  }

  // ─────────────────────────────────────────────
  //  AUXILIAR: opciones de galpones
  // ─────────────────────────────────────────────
  window.generarOpcionesGalpones = function () {
    if (cantidadGalponesGlobal === 0) return `<option value="">Sin galpones registrados</option>`;
    let opciones = "";
    for (let i = 1; i <= cantidadGalponesGlobal; i++) {
      opciones += `<option value="GALPON ${i}">GALPON ${i}</option>`;
    }
    return opciones;
  };

  // ─────────────────────────────────────────────
  //  MÓDULO: INGRESO DE POLLITAS
  // ─────────────────────────────────────────────
  window.mostrarOpcionesIngreso = function () {
    vistaModulo.innerHTML = `
      <h2>Ingreso de Pollitas</h2>
      <div class="box-selection">
        <button class="btn-sexo" onclick="window.cargarFormularioPollitas('HEMBRAS')">♀ HEMBRAS</button>
        <button class="btn-sexo" onclick="window.cargarFormularioPollitas('MACHOS')">♂ MACHOS</button>
      </div>`;
  };

  window.cargarFormularioPollitas = function (sexo) {
    const granja    = localStorage.getItem("granjaActiva");
    let listaCajas  = [];

    vistaModulo.innerHTML = `
      <div class="form-container">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h3>Ingreso ${sexo}</h3>
          <button onclick="window.mostrarOpcionesIngreso()" class="btn-back">Atrás</button>
        </div>
        <div class="form-group"><label>Galpón</label><select id="galpon">${window.generarOpcionesGalpones()}</select></div>
        <div class="form-group"><label>Corral</label><input type="text" id="corral" placeholder="Ej: A1" required></div>

        <div style="background:#f0f4f8; padding:15px; border-radius:10px; margin-bottom:15px;">
          <label><b>Cantidad de Pollitas por Caja</b></label>
          <div style="display:flex; gap:10px; margin-top:8px;">
            <input type="number" id="cantCaja" placeholder="Cantidad" min="1" style="flex:1;">
            <button type="button" id="btnAddC" class="btn-submit" style="width:auto; padding:10px 18px;">+ Agregar</button>
          </div>
          <div id="listaVisual" style="margin-top:10px; font-size:13px;"></div>
          <div id="totalCajas" style="margin-top:8px; font-weight:bold; color:#1e5fa8;"></div>
        </div>

        <button type="button" class="btn-submit" id="btnS" disabled onclick="window._guardarIngresoPollitas()">
          Guardar Registro
        </button>
        <p id="msgIngreso" style="color:red; margin-top:8px;"></p>
      </div>`;

    document.getElementById("btnAddC").onclick = () => {
      const input = document.getElementById("cantCaja");
      // CORREGIDO: convertir a número entero
      const cantidad = parseInt(input.value, 10);
      if (!cantidad || cantidad <= 0) {
        document.getElementById("msgIngreso").textContent = "Ingrese una cantidad válida.";
        return;
      }
      document.getElementById("msgIngreso").textContent = "";
      listaCajas.push({ numeroCaja: listaCajas.length + 1, cantidad: cantidad });

      const listaEl = document.getElementById("listaVisual");
      listaEl.innerHTML = listaCajas
        .map(x => `<div class="caja-item"><span>Caja ${x.numeroCaja}</span><span>${x.cantidad} aves</span></div>`)
        .join("");

      const total = listaCajas.reduce((sum, x) => sum + x.cantidad, 0);
      document.getElementById("totalCajas").textContent = `Total: ${total} aves en ${listaCajas.length} caja(s)`;

      document.getElementById("btnS").disabled = false;
      input.value = "";
      input.focus();
    };

    // Permitir agregar con Enter en el campo de cantidad
    document.getElementById("cantCaja").addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); document.getElementById("btnAddC").click(); }
    });

    window._guardarIngresoPollitas = function () {
      const corral = document.getElementById("corral").value.trim();
      if (!corral) {
        document.getElementById("msgIngreso").textContent = "Ingrese el número de corral.";
        return;
      }
      if (listaCajas.length === 0) {
        document.getElementById("msgIngreso").textContent = "Agregue al menos una caja.";
        return;
      }

      const btnS = document.getElementById("btnS");
      btnS.textContent = "Guardando...";
      btnS.disabled = true;

      window.apiFetch("registrar_ingreso_pollitas", {
        usuario: sesion.usuario,
        granja,
        fecha:   new Date().toISOString().split("T")[0],
        galpon:  document.getElementById("galpon").value,
        corral,
        sexo,
        cajas:   listaCajas
      })
      .then(res => {
        Swal.fire("¡Éxito!", res.mensaje || "Ingreso guardado correctamente.", "success")
          .then(() => window.mostrarOpcionesIngreso());
      })
      .catch(err => {
        Swal.fire("Error", err.message || "No se pudo guardar el registro.", "error");
        btnS.textContent = "Guardar Registro";
        btnS.disabled = false;
      });
    };
  };

  // ─────────────────────────────────────────────
  //  MÓDULO: CONTROL DE PESOS
  // ─────────────────────────────────────────────
  window.mostrarOpcionesPesos = function () {
    vistaModulo.innerHTML = `
      <h2>Control de Pesos</h2>
      <div class="box-selection">
        <button class="btn-sexo" onclick="window.cargarFormularioPesos('HEMBRAS')">♀ HEMBRAS</button>
        <button class="btn-sexo" onclick="window.cargarFormularioPesos('MACHOS')">♂ MACHOS</button>
      </div>`;
  };

  window.cargarFormularioPesos = function (sexo) {
    let listaPesos = [];

    vistaModulo.innerHTML = `
      <div class="form-container">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h3>Pesaje ${sexo}</h3>
          <button onclick="window.mostrarOpcionesPesos()" class="btn-back">Atrás</button>
        </div>

        <div class="form-group"><label>Galpón</label><select id="gP">${window.generarOpcionesGalpones()}</select></div>
        <div class="form-group"><label>Corral</label><input type="text" id="cP" placeholder="Ej: A1" required></div>
        <div class="form-group"><label>Edad (semanas)</label><input type="number" id="eP" min="1" max="80" required></div>

        <div style="background:#fdf2f2; padding:15px; border-radius:10px; border:1px solid #ebccd1;">
          <label><b>Registrar Peso (g)</b></label>
          <div style="display:flex; gap:10px; margin-top:5px;">
            <input type="number" id="iP" step="0.1" min="0.1" placeholder="Peso en gramos" style="flex:1;">
            <button type="button" id="btnAP" class="btn-submit" style="width:auto; padding:10px 18px;">+ Agregar</button>
          </div>

          <div id="panelEstadistico" style="margin-top:15px; display:none; background:white; padding:10px; border-radius:8px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px;">
              <div><b>Aves:</b> <span id="stCant">0</span></div>
              <div><b>Promedio:</b> <span id="stProm" style="color:blue; font-weight:bold;">0</span> g</div>
              <div><b>CV:</b> <span id="stCV">0</span>%</div>
              <div><b>Uniformidad:</b> <span id="stUni">0</span>%</div>
            </div>
            <div id="listaPesosVisual" style="margin-top:8px; font-size:12px; color:#555; max-height:100px; overflow-y:auto;"></div>
          </div>
        </div>

        <button type="button" class="btn-submit" id="btnGP" disabled style="margin-top:15px;"
          onclick="window._guardarPesos()">Guardar Pesaje</button>
        <p id="msgPesos" style="color:red; margin-top:8px;"></p>
      </div>`;

    const iP    = document.getElementById("iP");
    const btnAP = document.getElementById("btnAP");

    const actualizarEstadisticas = () => {
      const n = listaPesos.length;
      if (n === 0) return;

      const promedio    = listaPesos.reduce((a, b) => a + b, 0) / n;
      const varianza    = listaPesos.reduce((a, b) => a + Math.pow(b - promedio, 2), 0) / n;
      const cv          = (Math.sqrt(varianza) / promedio) * 100;
      const uniformidad = (listaPesos.filter(p => p >= promedio * 0.9 && p <= promedio * 1.1).length / n) * 100;

      document.getElementById("panelEstadistico").style.display = "block";
      document.getElementById("stCant").innerText = n;
      document.getElementById("stProm").innerText = promedio.toFixed(2);
      document.getElementById("stCV").innerText   = cv.toFixed(2);
      document.getElementById("stUni").innerText  = uniformidad.toFixed(2);
      document.getElementById("listaPesosVisual").innerHTML =
        listaPesos.map((p, i) => `Ave ${i + 1}: ${p} g`).join(" | ");
    };

    const agregarPeso = () => {
      const valor = parseFloat(iP.value);
      if (isNaN(valor) || valor <= 0) {
        document.getElementById("msgPesos").textContent = "Ingrese un peso válido.";
        return;
      }
      document.getElementById("msgPesos").textContent = "";
      listaPesos.push(valor);
      iP.value = "";
      iP.focus();
      actualizarEstadisticas();
      document.getElementById("btnGP").disabled = false;
    };

    btnAP.onclick = agregarPeso;
    iP.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); agregarPeso(); } });

    window._guardarPesos = function () {
      const corral = document.getElementById("cP").value.trim();
      const edad   = document.getElementById("eP").value.trim();
      if (!corral || !edad) {
        document.getElementById("msgPesos").textContent = "Ingrese corral y edad.";
        return;
      }
      if (listaPesos.length === 0) {
        document.getElementById("msgPesos").textContent = "Agregue al menos un peso.";
        return;
      }

      const btnGP = document.getElementById("btnGP");
      btnGP.textContent = "Guardando...";
      btnGP.disabled = true;

      window.apiFetch("registrar_pesos", {
        usuario:  sesion.usuario,
        granja:   localStorage.getItem("granjaActiva"),
        fecha:    new Date().toISOString().split("T")[0],
        galpon:   document.getElementById("gP").value,
        corral,
        edad:     parseInt(edad, 10),
        sexo,
        muestras: listaPesos
      })
      .then(res => {
        Swal.fire("¡Éxito!", res.mensaje || "Pesaje guardado correctamente.", "success")
          .then(() => window.mostrarOpcionesPesos());
      })
      .catch(err => {
        Swal.fire("Error", err.message || "No se pudo guardar el pesaje.", "error");
        btnGP.textContent = "Guardar Pesaje";
        btnGP.disabled = false;
      });
    };
  };

  // ─────────────────────────────────────────────
  //  MÓDULO: MORTALIDAD Y SELECCIÓN
  // ─────────────────────────────────────────────
  window.mostrarOpcionesMortalidad = function () {
    const granjaActiva = localStorage.getItem("granjaActiva") || "Sin especificar";

    let corralSeleccionado = null;
    const datosPorCorral   = {};
    const NUM_CORRALES     = 10; // puedes parametrizar esto si lo obtienes de la BD

    for (let i = 1; i <= NUM_CORRALES; i++) {
      datosPorCorral[i] = { hM:0, hSD:0, hLab:0, hTS:0, hV:0, mM:0, mSR:0, mSD:0, mLab:0, mTS:0, mV:0 };
    }

    // Inventario inicial (placeholder — idealmente viene de la BD)
    const invGalponH = 0;
    const invGalponM = 0;
    const invCorralH = 0;
    const invCorralM = 0;

    vistaModulo.innerHTML = `
      <div class="form-container" style="max-width:900px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h3 style="margin:0;">Mortalidad y Selección</h3>
          <button onclick="window.mostrarOpcionesMortalidad()" class="btn-back">Atrás</button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px;
                    background:#f8f9fa; padding:10px; border:1px solid #ddd;
                    border-radius:8px; margin-bottom:15px; font-size:11px;">
          <div><b>GRANJA:</b><br><span style="color:blue">${granjaActiva}</span></div>
          <div><b>GALPÓN:</b><br><select id="mG" style="font-size:10px;">${window.generarOpcionesGalpones()}</select></div>
          <!-- CORREGIDO: Edad editable, no hardcodeada -->
          <div><b>EDAD (sem):</b><br><input type="number" id="mEdad" min="1" max="80" style="font-size:10px; width:100%;" placeholder="Semanas"></div>
          <div><b>FECHA:</b><br><input type="date" id="mFecha" style="font-size:10px;"
               value="${new Date().toISOString().split("T")[0]}"></div>
        </div>

        <div style="margin-bottom:15px;">
          <label style="display:block; margin-bottom:8px;"><b>Corrales:</b></label>
          <div id="contenedorCorrales" style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px;"></div>
        </div>

        <div id="formMortalidadWrap">
          <p style="color:#aaa; text-align:center;">Seleccione un corral para ingresar datos.</p>
        </div>

        <p id="msgMortalidad" style="color:red; margin-top:8px;"></p>
        <button type="button" class="btn-submit" id="btnSM" style="margin-top:15px; width:100%;"
          onclick="window._guardarMortalidad()">Guardar Todo el Galpón</button>
      </div>`;

    // ── Formulario de corral (se inyecta al seleccionar) ──
    const renderFormCorral = () => {
      document.getElementById("formMortalidadWrap").innerHTML = `
        <h4 style="text-align:center; color:#555; margin-bottom:5px;">
          REGISTRO CORRAL <span id="numCorralTitulo">${corralSeleccionado}</span>
        </h4>
        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:center; background:white;">
          <thead>
            <tr style="background:#eee;">
              <th style="padding:8px; border:1px solid #ddd;">CATEGORÍA</th>
              <th style="background:#fff5f5; color:#cc0000; padding:8px; border:1px solid #ddd;">HEMBRAS (H)</th>
              <th style="background:#f0f7ff; color:#0055cc; padding:8px; border:1px solid #ddd;">MACHOS (M)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:left; padding:8px; border:1px solid #ddd;">Muertos y Elim.</td>
              <td style="border:1px solid #ddd;"><input type="number" id="hM" placeholder="0" min="0" class="inp-m"></td>
              <td style="border:1px solid #ddd;"><input type="number" id="mM" placeholder="0" min="0" class="inp-m"></td>
            </tr>
            <tr>
              <td style="text-align:left; padding:8px; border:1px solid #ddd;">Selección (Reserva)</td>
              <td style="border:1px solid #ddd;"><input type="text" readonly style="background:#eee; border:none; width:100%; text-align:center;" placeholder="-"></td>
              <td style="border:1px solid #ddd;"><input type="number" id="mSR" placeholder="0" min="0" class="inp-m"></td>
            </tr>
            <tr>
              <td style="text-align:left; padding:8px; border:1px solid #ddd;">Selección (Descarte)</td>
              <td style="border:1px solid #ddd;"><input type="number" id="hSD" placeholder="0" min="0" class="inp-m"></td>
              <td style="border:1px solid #ddd;"><input type="number" id="mSD" placeholder="0" min="0" class="inp-m"></td>
            </tr>
            <tr>
              <td style="text-align:left; padding:8px; border:1px solid #ddd;">Laboratorio</td>
              <td style="border:1px solid #ddd;"><input type="number" id="hLab" placeholder="0" min="0" class="inp-m"></td>
              <td style="border:1px solid #ddd;"><input type="number" id="mLab" placeholder="0" min="0" class="inp-m"></td>
            </tr>
            <tr>
              <td style="text-align:left; padding:8px; border:1px solid #ddd;">Traslados</td>
              <td style="border:1px solid #ddd;"><input type="number" id="hTS" placeholder="0" min="0" class="inp-m"></td>
              <td style="border:1px solid #ddd;"><input type="number" id="mTS" placeholder="0" min="0" class="inp-m"></td>
            </tr>
            <tr>
              <td style="text-align:left; padding:8px; border:1px solid #ddd;">Ventas</td>
              <td style="border:1px solid #ddd;"><input type="number" id="hV" placeholder="0" min="0" class="inp-m"></td>
              <td style="border:1px solid #ddd;"><input type="number" id="mV" placeholder="0" min="0" class="inp-m"></td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background:#f1f1f1; font-weight:bold;">
              <td style="text-align:left; padding:8px; border:1px solid #ddd;">SALDO DEL CORRAL</td>
              <td id="saldoCorralH" style="border:1px solid #ddd; color:red;">—</td>
              <td id="saldoCorralM" style="border:1px solid #ddd; color:blue;">—</td>
            </tr>
          </tfoot>
        </table>

        <div style="background:#2c3e50; color:white; border-radius:8px; padding:10px; margin-top:20px;">
          <h4 style="margin:0 0 10px; font-size:13px; text-align:center; background:#1a252f; padding:5px;">RESUMEN TOTAL DEL GALPÓN</h4>
          <table style="width:100%; font-size:11px; border-collapse:collapse; text-align:center;">
            <thead><tr style="border-bottom:1px solid #555;">
              <th style="text-align:left; padding:4px;">CATEGORÍA</th><th>TOTAL H</th><th>TOTAL M</th>
            </tr></thead>
            <tbody id="resumenCuerpo"></tbody>
            <tfoot>
              <tr style="background:#1a252f; font-weight:bold; font-size:13px;">
                <td style="text-align:left; padding:8px;">SALDO FINAL GALPÓN</td>
                <td id="resSaldoH" style="color:#ff8a8a;">—</td>
                <td id="resSaldoM" style="color:#8ab4ff;">—</td>
              </tr>
            </tfoot>
          </table>
        </div>`;

      // Cargar valores guardados en memoria
      const datos = datosPorCorral[corralSeleccionado];
      document.querySelectorAll(".inp-m").forEach(inp => {
        if (datos[inp.id] !== undefined) inp.value = datos[inp.id] || "";
      });

      document.querySelectorAll(".inp-m").forEach(inp => inp.addEventListener("input", () => {
        salvarEnMemoria();
        calcularTodo();
      }));

      calcularTodo();
    };

    const salvarEnMemoria = () => {
      if (!corralSeleccionado) return;
      document.querySelectorAll(".inp-m").forEach(inp => {
        datosPorCorral[corralSeleccionado][inp.id] = Number(inp.value) || 0;
      });
    };

    const calcularTodo = () => {
      // Saldo del corral actual
      let bajasCH = 0, bajasCM = 0;
      document.querySelectorAll(".inp-m").forEach(inp => {
        if (inp.id.startsWith("h")) bajasCH += Number(inp.value) || 0;
        if (inp.id.startsWith("m")) bajasCM += Number(inp.value) || 0;
      });
      const saldoH = document.getElementById("saldoCorralH");
      const saldoM = document.getElementById("saldoCorralM");
      if (saldoH) saldoH.textContent = invCorralH - bajasCH;
      if (saldoM) saldoM.textContent = invCorralM - bajasCM;

      // Resumen galpón
      const totales = { hM:0, hSD:0, hLab:0, hTS:0, hV:0, mM:0, mSR:0, mSD:0, mLab:0, mTS:0, mV:0 };
      Object.values(datosPorCorral).forEach(c => {
        Object.keys(totales).forEach(k => { totales[k] += c[k] || 0; });
      });

      const cats = [
        { lab: "Muertos y Elim.",  h: totales.hM,   m: totales.mM   },
        { lab: "Sel. Reserva",     h: "—",           m: totales.mSR  },
        { lab: "Sel. Descarte",    h: totales.hSD,   m: totales.mSD  },
        { lab: "Laboratorio",      h: totales.hLab,  m: totales.mLab },
        { lab: "Traslados",        h: totales.hTS,   m: totales.mTS  },
        { lab: "Ventas",           h: totales.hV,    m: totales.mV   }
      ];

      const resumen = document.getElementById("resumenCuerpo");
      if (resumen) {
        resumen.innerHTML = cats
          .map(c => `<tr style="border-bottom:1px solid #444;">
            <td style="text-align:left; padding:4px;">${c.lab}</td>
            <td>${c.h}</td><td>${c.m}</td></tr>`)
          .join("");
      }

      const sumaH = totales.hM + totales.hSD + totales.hLab + totales.hTS + totales.hV;
      const sumaM = totales.mM + totales.mSR + totales.mSD + totales.mLab + totales.mTS + totales.mV;
      const rH = document.getElementById("resSaldoH");
      const rM = document.getElementById("resSaldoM");
      if (rH) rH.textContent = invGalponH - sumaH;
      if (rM) rM.textContent = invGalponM - sumaM;
    };

    // Botones de corrales
    const contenedor = document.getElementById("contenedorCorrales");
    for (let i = 1; i <= NUM_CORRALES; i++) {
      const btn = document.createElement("button");
      btn.type      = "button";
      btn.textContent = i;
      btn.style.cssText = "padding:12px; border:1px solid #ccc; background:white; border-radius:8px; cursor:pointer; font-weight:bold; transition:all 0.2s;";

      btn.onclick = () => {
        salvarEnMemoria();
        corralSeleccionado = i;

        document.querySelectorAll("#contenedorCorrales button").forEach(b => {
          b.style.background = "white";
          b.style.color      = "black";
          b.style.transform  = "scale(1)";
        });
        btn.style.background = "#1e5fa8";
        btn.style.color      = "white";
        btn.style.transform  = "scale(1.15)";

        renderFormCorral();
      };
      contenedor.appendChild(btn);
    }

    // ── Guardar todo el galpón ──
    // El Apps Script espera UNA petición por corral con:
    // { accion, usuario, granja, galpon, corral, fecha, registros: [{sexo, muertos, eliminados}] }
    window._guardarMortalidad = function () {
      const galpon = document.getElementById("mG").value;
      const fecha  = document.getElementById("mFecha").value;
      const edad   = document.getElementById("mEdad").value;

      if (!edad) {
        document.getElementById("msgMortalidad").textContent = "Ingrese la edad (semanas).";
        return;
      }

      // Guardar corral activo antes de procesar
      salvarEnMemoria();

      // Construir una petición por cada corral que tenga datos
      const peticiones = [];
      for (let i = 1; i <= NUM_CORRALES; i++) {
        const d = datosPorCorral[i];
        const tieneData = Object.values(d).some(v => v > 0);
        if (!tieneData) continue;

        // Enviamos cada categoría en su propio campo
        const registros = [
          {
            sexo:         "HEMBRAS",
            muertos:      d.hM,
            sel_reserva:  0,        // Hembras no tienen reserva
            sel_descarte: d.hSD,
            laboratorio:  d.hLab,
            traslados:    d.hTS,
            ventas:       d.hV
          },
          {
            sexo:         "MACHOS",
            muertos:      d.mM,
            sel_reserva:  d.mSR,
            sel_descarte: d.mSD,
            laboratorio:  d.mLab,
            traslados:    d.mTS,
            ventas:       d.mV
          }
        ];

        peticiones.push(
          window.apiFetch("registrar_mortalidad", {
            usuario:  sesion.usuario,
            granja:   granjaActiva,
            galpon,
            corral:   String(i),
            fecha,
            edad:     parseInt(edad, 10),
            registros
          })
        );
      }

      if (peticiones.length === 0) {
        document.getElementById("msgMortalidad").textContent = "No hay datos para guardar.";
        return;
      }

      document.getElementById("msgMortalidad").textContent = "";
      const btnSM = document.getElementById("btnSM");
      btnSM.textContent = "Guardando...";
      btnSM.disabled = true;

      // Esperar todas las peticiones
      Promise.all(peticiones)
        .then(resultados => {
          Swal.fire("¡Éxito!", "Mortalidad guardada correctamente para todos los corrales.", "success")
            .then(() => window.mostrarOpcionesMortalidad());
        })
        .catch(err => {
          // apiFetch ya lanza error si !ok, Promise.all fallará si uno solo falla
          Swal.fire("Error", "Ocurrió un error al guardar la información: " + err.message, "error");
          btnSM.textContent = "Guardar Todo el Galpón";
          btnSM.disabled = false;
        });
    };
  };

  // ─────────────────────────────────────────────
  //  MÓDULO: ALMACÉN
  // ─────────────────────────────────────────────
  window.abrirAlmacen = function () {
    const granja = localStorage.getItem("granjaActiva");
    if (!granja) {
      alert("No hay granja seleccionada.");
      return;
    }
    window.location.href = "almacen.html";
  };

  // ─────────────────────────────────────────────
  //  MÓDULO: CONSUMO (ACCESO DIRECTO)
  // ─────────────────────────────────────────────
  window.abrirAlmacenConsumo = function () {
    const granja = localStorage.getItem("granjaActiva");
    if (!granja) { alert("No hay granja seleccionada."); return; }
    localStorage.setItem("almacenVistaInicial", "consumo"); // Flag para que almacen.js sepa qué vista mostrar
    window.location.href = "almacen.html";
  };

}); // fin DOMContentLoaded
