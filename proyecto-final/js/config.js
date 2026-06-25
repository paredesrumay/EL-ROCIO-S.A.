// ============================================================
//  CONFIGURACIÓN GLOBAL - Cambiar solo aquí si cambia el API
// ============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbx4yhB6QQmiQFzTy6tEyTFFJdhNIyOFc5KdfDjD_T2mGueX7EYVJkuGitjWuTGb18oC/exec";

// Función auxiliar para centralizar las llamadas a la API
window.apiFetch = async function (action, payload = {}) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      // Eliminamos el header Content-Type para evitar errores de CORS (Preflight) con Apps Script.
      // El cuerpo se envía como un string JSON que el backend parseará correctamente.
      body: JSON.stringify({ accion: action, ...payload }),
    });

    if (!response.ok) {
      throw new Error(`Error de red: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.ok) {
      // Si el backend envía { ok: false, mensaje: "..." }
      throw new Error(data.mensaje || `Error desconocido en la acción: ${action}`);
    }

    return data; // Retorna el objeto completo si ok es true
  } catch (error) {
    console.error(`Error en apiFetch para acción '${action}':`, error);
    // Propagar el error para que el componente que llama pueda manejarlo
    throw error;
  }
};
