import express from "express";
import cors from "cors";
import { db } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// Auth provisional: el usuario "logueado" viene en el header x-user-id.
// Cuando haya auth de verdad, esto se sustituye por tokens.
function currentUser(req, res) {
  const id = Number(req.header("x-user-id"));
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) {
    res.status(401).json({ error: "Falta o es inválido el header x-user-id" });
    return null;
  }
  return user;
}

const loanQuery = `
  SELECT loans.*, items.name AS item_name,
         owner.name AS owner_name, borrower.name AS borrower_name
  FROM loans
  JOIN items ON items.id = loans.item_id
  JOIN users AS owner ON owner.id = loans.owner_id
  JOIN users AS borrower ON borrower.id = loans.borrower_id
`;

// ---- Usuarios ----
app.get("/api/users", (req, res) => {
  res.json(db.prepare("SELECT id, name, email FROM users").all());
});

// ---- Objetos ----
app.get("/api/items", (req, res) => {
  const rows = db
    .prepare(
      `SELECT items.*, users.name AS owner_name
       FROM items JOIN users ON users.id = items.owner_id`
    )
    .all();
  res.json(rows);
});

app.post("/api/items", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "Falta el nombre del objeto" });
  const info = db
    .prepare("INSERT INTO items (owner_id, name, description) VALUES (?, ?, ?)")
    .run(user.id, name, description);
  res.status(201).json(db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid));
});

// ---- Préstamos / solicitudes ----

// Todos los préstamos en los que participo (como dueño o como prestatario)
app.get("/api/loans", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const rows = db
    .prepare(`${loanQuery} WHERE loans.owner_id = ? OR loans.borrower_id = ? ORDER BY loans.requested_at DESC`)
    .all(user.id, user.id);
  res.json(rows);
});

// Pedir prestado un objeto: crea la solicitud en estado 'pendiente'
app.post("/api/loans", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const { item_id, message = "", due_date = null } = req.body;
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(item_id);
  if (!item) return res.status(404).json({ error: "Objeto no encontrado" });
  if (item.owner_id === user.id)
    return res.status(400).json({ error: "No puedes pedirte prestado tu propio objeto" });

  const active = db
    .prepare("SELECT id FROM loans WHERE item_id = ? AND status IN ('pendiente', 'aceptado')")
    .get(item_id);
  if (active)
    return res.status(409).json({ error: "Ese objeto ya tiene una solicitud o préstamo activo" });

  const info = db
    .prepare(
      `INSERT INTO loans (item_id, owner_id, borrower_id, message, due_date)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(item_id, item.owner_id, user.id, message, due_date);
  res.status(201).json(db.prepare(`${loanQuery} WHERE loans.id = ?`).get(info.lastInsertRowid));
});

// Transiciones de estado. Quién puede hacer qué:
//   aceptar/rechazar -> solo el dueño, sobre una solicitud pendiente
//   devolver         -> dueño o prestatario, sobre un préstamo aceptado
const transitions = {
  accept: { from: "pendiente", to: "aceptado", ownerOnly: true, stamp: "accepted_at" },
  reject: { from: "pendiente", to: "rechazado", ownerOnly: true, stamp: null },
  return: { from: "aceptado", to: "devuelto", ownerOnly: false, stamp: "returned_at" },
};

app.post("/api/loans/:id/:action", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const t = transitions[req.params.action];
  if (!t) return res.status(404).json({ error: "Acción desconocida" });

  const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(req.params.id);
  if (!loan) return res.status(404).json({ error: "Préstamo no encontrado" });
  if (loan.status !== t.from)
    return res.status(409).json({ error: `El préstamo está en estado '${loan.status}'` });
  const allowed = t.ownerOnly
    ? loan.owner_id === user.id
    : loan.owner_id === user.id || loan.borrower_id === user.id;
  if (!allowed) return res.status(403).json({ error: "No puedes hacer eso en este préstamo" });

  const stamp = t.stamp ? `, ${t.stamp} = datetime('now')` : "";
  db.prepare(`UPDATE loans SET status = ?${stamp} WHERE id = ?`).run(t.to, loan.id);
  res.json(db.prepare(`${loanQuery} WHERE loans.id = ?`).get(loan.id));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`LoTienes backend en http://localhost:${PORT}`));
