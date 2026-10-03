/* ==========================================================================
   Brote – Lógica del panel de administración
   Muestra los pedidos y permite cambiar su estado.
   ========================================================================== */

const $ = (selector) => document.querySelector(selector);

const ESTADOS = ["Recibido", "Preparando", "Enviado", "Entregado", "Cancelado"];

let clave = ""; // clave de administrador escrita por la persona

// Escapa caracteres especiales para que un dato de un cliente no se interprete como HTML
const escapar = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

// Genera las opciones del selector de estado, marcando la actual
const opcionesEstado = (actual) =>
  ESTADOS.map((e) => `<option${e === actual ? " selected" : ""}>${e}</option>`).join("");

// Genera una fila de la tabla para un pedido
const filaPedido = (p) => `
  <tr>
    <td>${escapar(p.Folio)}</td>
    <td>${escapar(p.Nombre)}<br><small>${escapar(p.Telefono)}</small></td>
    <td>${escapar(p.Correo)}</td>
    <td>${escapar(p.Direccion)}</td>
    <td>${p.Cantidad}</td>
    <td>$${p.Total}</td>
    <td>${escapar(p.Pago)}</td>
    <td><select data-id="${p.IdPedido}">${opcionesEstado(p.Estado)}</select></td>
  </tr>`;

// Pide los pedidos al servidor y llena la tabla
async function cargarPedidos() {
  const mensaje = $("#msg");
  const respuesta = await fetch("/api/admin/pedidos", { headers: { "x-admin-key": clave } });

  if (!respuesta.ok) {
    mensaje.className = "error";
    mensaje.textContent = "Clave incorrecta";
    return;
  }

  const pedidos = await respuesta.json();
  mensaje.className = "ok";
  mensaje.textContent = `${pedidos.length} pedido(s)`;
  $("#tabla").hidden = false;
  $("#tabla tbody").innerHTML = pedidos.map(filaPedido).join("");
}

// Entrar con la clave
$("#f-clave").onsubmit = (evento) => {
  evento.preventDefault();
  clave = $("#clave").value;
  cargarPedidos();
};

// Cambiar el estado de un pedido
$("#tabla").onchange = async (evento) => {
  if (!evento.target.matches("select")) return;

  await fetch(`/api/admin/pedidos/${evento.target.dataset.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-key": clave },
    body: JSON.stringify({ estado: evento.target.value }),
  });
};