const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const ADMIN_KEY = process.env.ADMIN_KEY || "brote1234"; // CÁMBIALA al publicar
const PRECIO = 349;
const ESTADOS = ["Recibido", "Preparando", "Enviado", "Entregado", "Cancelado"];
const PAGOS = ["Transferencia", "Contra entrega"];

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "brote.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS Pedidos(
    IdPedido INTEGER PRIMARY KEY AUTOINCREMENT,
    Folio TEXT UNIQUE NOT NULL,
    Nombre TEXT NOT NULL,
    Correo TEXT NOT NULL,
    Telefono TEXT,
    Direccion TEXT NOT NULL,
    Cantidad INTEGER NOT NULL,
    Total REAL NOT NULL,
    Pago TEXT NOT NULL,
    Estado TEXT NOT NULL DEFAULT 'Recibido',
    Fecha TEXT NOT NULL
  )
`);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (_req, res) => res.json({ precio: PRECIO }));

app.post("/api/pedidos", (req, res) => {
  const b = req.body || {};
  const nombre = String(b.nombre || "").trim();
  const correo = String(b.correo || "").trim().toLowerCase();
  const telefono = String(b.telefono || "").trim().slice(0, 20);
  const direccion = String(b.direccion || "").trim();
  const cantidad = Number(b.cantidad);
  const pago = String(b.pago || "");

  if (nombre.length < 3 || nombre.length > 100)
    return res.status(400).json({ error: "Escribe tu nombre completo." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    return res.status(400).json({ error: "Escribe un correo válido." });
  if (direccion.length < 10 || direccion.length > 300)
    return res.status(400).json({ error: "Escribe una dirección de envío completa." });
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10)
    return res.status(400).json({ error: "La cantidad debe ser de 1 a 10 kits." });
  if (!PAGOS.includes(pago))
    return res.status(400).json({ error: "Elige una forma de pago." });

  const folio = "BR-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  const total = cantidad * PRECIO; // el total lo calcula el servidor

  db.prepare(
    `INSERT INTO Pedidos (Folio,Nombre,Correo,Telefono,Direccion,Cantidad,Total,Pago,Fecha)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(folio, nombre, correo, telefono, direccion, cantidad, total, pago, new Date().toISOString());

  res.status(201).json({ folio, total });
});

app.get("/api/pedidos/:folio", (req, res) => {
  const p = db
    .prepare("SELECT Folio,Cantidad,Total,Estado FROM Pedidos WHERE Folio=? AND Correo=?")
    .get(req.params.folio.toUpperCase(), String(req.query.correo || "").trim().toLowerCase());
  if (!p) return res.status(404).json({ error: "No encontramos ese pedido. Revisa el folio y el correo." });
  res.json({ folio: p.Folio, cantidad: p.Cantidad, total: p.Total, estado: p.Estado });
});

/* ---------- Administrador ---------- */
function admin(req, res, next) {
  const a = Buffer.from(String(req.get("x-admin-key") || ""));
  const b = Buffer.from(ADMIN_KEY);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return res.status(401).json({ error: "Clave incorrecta" });
  next();
}

app.get("/api/admin/pedidos", admin, (_req, res) => {
  res.json(db.prepare("SELECT * FROM Pedidos ORDER BY IdPedido DESC").all());
});

app.put("/api/admin/pedidos/:id", admin, (req, res) => {
  const estado = req.body && req.body.estado;
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: "Estado inválido" });
  db.prepare("UPDATE Pedidos SET Estado=? WHERE IdPedido=?").run(estado, req.params.id);
  res.json({ ok: true });
});

app.use((_err, _req, res, _next) => res.status(400).json({ error: "Solicitud inválida" }));

app.listen(PORT, () => console.log("Brote corriendo en puerto " + PORT));
