/* ==========================================================================
   Brote – Lógica de la página principal
   Contenido:
     1. Utilidades
     2. PWA (service worker y botón de instalar)
     3. Menú móvil
     4. Precio y total
     5. Formulario de pedido
     6. Consulta de seguimiento
   ========================================================================== */


/* 1. UTILIDADES ----------------------------------------------------------- */

const $ = (selector) => document.querySelector(selector);

// Convierte un número en pesos mexicanos: 349 -> "$349.00"
const money = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const MENSAJE_SIN_CONEXION = "Sin conexión. Intenta de nuevo cuando estés en línea.";

// Muestra un mensaje de éxito (ok = true) o de error dentro de un elemento
function mostrarMensaje(elemento, ok, texto) {
  elemento.className = ok ? "ok" : "error";
  elemento.textContent = texto;
}

// Llama a la API y devuelve { ok, datos }. Si no hay internet, devuelve un error legible.
async function llamarApi(ruta, opciones) {
  try {
    const respuesta = await fetch(ruta, opciones);
    return { ok: respuesta.ok, datos: await respuesta.json() };
  } catch {
    return { ok: false, datos: { error: MENSAJE_SIN_CONEXION } };
  }
}


/* 2. PWA: SERVICE WORKER Y BOTÓN DE INSTALAR ------------------------------- */

if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

let instalador; // evento que guarda el navegador cuando la app se puede instalar

addEventListener("beforeinstallprompt", (evento) => {
  evento.preventDefault();
  instalador = evento;
  $("#instalar").hidden = false;
});

$("#instalar").onclick = async () => {
  instalador.prompt();
  await instalador.userChoice;
  $("#instalar").hidden = true;
};


/* 3. MENÚ MÓVIL ------------------------------------------------------------ */

const botonMenu = $("#menu");
const menu = $("#nav");

function cambiarMenu(abrir) {
  menu.classList.toggle("abierto", abrir);
  botonMenu.setAttribute("aria-expanded", String(abrir));
}

botonMenu.onclick = () => cambiarMenu(!menu.classList.contains("abierto"));

// Al elegir una opción, el menú se cierra
menu.onclick = (evento) => {
  if (evento.target.tagName === "A") cambiarMenu(false);
};


/* 4. PRECIO Y TOTAL -------------------------------------------------------- */

let precio = 349; // valor de respaldo; el servidor envía el precio vigente

function actualizarTotal() {
  const cantidad = Number($("#cantidad").value) || 0;
  $("#total").textContent = money(precio * cantidad);
}

fetch("/api/config")
  .then((respuesta) => respuesta.json())
  .then((config) => {
    precio = config.precio;
    $("#precio").textContent = money(precio);
    actualizarTotal();
  })
  .catch(() => {}); // sin conexión se conserva el precio de respaldo

$("#cantidad").oninput = actualizarTotal;


/* 5. FORMULARIO DE PEDIDO -------------------------------------------------- */

$("#form-pedido").onsubmit = async (evento) => {
  evento.preventDefault();
  const salida = $("#resultado");

  const { ok, datos } = await llamarApi("/api/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(evento.target))),
  });

  if (ok) {
    mostrarMensaje(
      salida,
      true,
      `¡Pedido recibido! Tu folio es ${datos.folio}. Total: ${money(datos.total)}. Guárdalo para consultar tu envío.`
    );
    evento.target.reset();
    actualizarTotal();
  } else {
    mostrarMensaje(salida, false, datos.error);
  }
};


/* 6. CONSULTA DE SEGUIMIENTO ----------------------------------------------- */

$("#form-seg").onsubmit = async (evento) => {
  evento.preventDefault();
  const salida = $("#estado");
  const { folio, correo } = Object.fromEntries(new FormData(evento.target));

  const ruta = `/api/pedidos/${encodeURIComponent(folio.trim())}?correo=${encodeURIComponent(correo.trim())}`;
  const { ok, datos } = await llamarApi(ruta);

  if (ok) {
    mostrarMensaje(
      salida,
      true,
      `Pedido ${datos.folio}: ${datos.estado} (${datos.cantidad} kit(s), ${money(datos.total)})`
    );
  } else {
    mostrarMensaje(salida, false, datos.error);
  }
};