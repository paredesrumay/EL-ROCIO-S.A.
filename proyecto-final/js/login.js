// login.js — depende de js/config.js (API_URL definida ahí)

document.addEventListener("DOMContentLoaded", () => {

  const form          = document.getElementById("formLogin");
  const usuarioInput  = document.getElementById("usuario");
  const passwordInput = document.getElementById("password");
  const btn           = document.getElementById("btnLogin");
  const text          = document.getElementById("btnText");
  const loader        = document.getElementById("loader");
  const msg           = document.getElementById("msg");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const usuario  = usuarioInput.value.trim();
    const password = passwordInput.value.trim();

    msg.innerText = "";

    if (!usuario || !password) {
      msg.innerText = "Ingrese usuario y contraseña";
      return;
    }

    // Mostrar loader
    btn.disabled = true;
    text.classList.add("hidden");
    loader.classList.remove("hidden");

    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ accion: "login", usuario, password })
    })
    .then(r => r.json())
    .then(d => {
      if (!d.ok) {
        msg.innerText = d.mensaje || "Error al iniciar sesión";
        return;
      }

      // Guardar sesión y limpiar granja anterior
      localStorage.setItem("sesion", JSON.stringify(d));
      localStorage.removeItem("granjaActiva");

      // Redirección por rol
      if (d.rol === "GERENTE_GENERAL" || d.rol === "ADMINISTRADOR") {
        window.location.href = "menu-granja.html";
      } else if (d.rol === "OFICINISTA") {
        localStorage.setItem("granjaActiva", d.granjas);
        window.location.href = "menu-granja.html";
      } else if (d.rol === "JEFE_DE_GRANJA" || d.rol === "Jefe de Granja") {
        localStorage.setItem("granjaActiva", d.granjas);
        window.location.href = "almacen.html";
      } else {
        msg.innerText = "Rol no reconocido: " + d.rol;
      }
    })
    .catch((error) => {
      msg.innerText = "Error: " + (error.message || "No se pudo conectar con el servidor.");
    })
    .finally(() => {
      btn.disabled = false;
      text.classList.remove("hidden");
      loader.classList.add("hidden");
    });
  });
});
