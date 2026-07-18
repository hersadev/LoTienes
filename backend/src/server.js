import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { areFriends, db, makeFriends } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// Base pública de la web, para construir los enlaces de invitación que se
// comparten. En producción sería el dominio real (con universal links).
const WEB_URL = process.env.PUBLIC_WEB_URL || "http://localhost:8081";
const inviteUrl = (token) => `${WEB_URL}/invitacion/${token}`;

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

// Registro sin contraseña (la auth de verdad está pendiente): crea la cuenta
// con la que luego se entra mandando su id en x-user-id.
app.post("/api/register", (req, res) => {
  const name = (req.body?.name ?? "").trim();
  const email = (req.body?.email ?? "").trim().toLowerCase();
  if (!name || !email) return res.status(400).json({ error: "Faltan el nombre o el email" });
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email))
    return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
  const info = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)").run(name, email);
  res
    .status(201)
    .json(db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(info.lastInsertRowid));
});

// ---- Amigos e invitaciones ----

app.get("/api/friends", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const rows = db
    .prepare(
      `SELECT users.id, users.name, users.email, friendships.created_at AS friends_since
       FROM friendships
       JOIN users ON users.id = CASE WHEN friendships.user_a = ? THEN friendships.user_b ELSE friendships.user_a END
       WHERE friendships.user_a = ? OR friendships.user_b = ?
       ORDER BY users.name`
    )
    .all(user.id, user.id, user.id);
  res.json(rows);
});

// Crear una invitación: devuelve el enlace para compartir por WhatsApp, etc.
app.post("/api/invites", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const token = crypto.randomBytes(12).toString("base64url");
  const info = db
    .prepare("INSERT INTO invites (token, inviter_id) VALUES (?, ?)")
    .run(token, user.id);
  const invite = db.prepare("SELECT * FROM invites WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ ...invite, url: inviteUrl(token) });
});

// Mis invitaciones enviadas, para poder recuperar el enlace o ver si se usaron
app.get("/api/invites", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const rows = db
    .prepare(
      `SELECT invites.*, users.name AS accepted_by_name
       FROM invites LEFT JOIN users ON users.id = invites.accepted_by
       WHERE invites.inviter_id = ?
       ORDER BY invites.created_at DESC, invites.id DESC`
    )
    .all(user.id);
  res.json(rows.map((row) => ({ ...row, url: inviteUrl(row.token) })));
});

// Info pública de una invitación: lo que ve quien abre el enlace sin cuenta
app.get("/api/invites/:token", (req, res) => {
  const row = db
    .prepare(
      `SELECT invites.status, invites.inviter_id, users.name AS inviter_name
       FROM invites JOIN users ON users.id = invites.inviter_id
       WHERE invites.token = ?`
    )
    .get(req.params.token);
  if (!row) return res.status(404).json({ error: "Invitación no encontrada" });
  res.json(row);
});

// Aceptar una invitación. Quien acepta es el usuario logueado (header) o, si no
// hay sesión, el nombre + email del body: si el email ya existe entra con esa
// cuenta y si no, se registra al vuelo (sin contraseñas hasta que haya auth).
app.post("/api/invites/:token/accept", (req, res) => {
  const invite = db.prepare("SELECT * FROM invites WHERE token = ?").get(req.params.token);
  if (!invite) return res.status(404).json({ error: "Invitación no encontrada" });

  let user;
  if (req.header("x-user-id")) {
    user = currentUser(req, res);
    if (!user) return;
  } else {
    const name = (req.body?.name ?? "").trim();
    const email = (req.body?.email ?? "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Falta el email para aceptar la invitación" });
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      if (!name) return res.status(400).json({ error: "Falta el nombre para crear tu cuenta" });
      const info = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)").run(name, email);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    }
  }

  if (user.id === invite.inviter_id)
    return res.status(400).json({ error: "No puedes aceptar tu propia invitación" });
  if (invite.status === "aceptada" && invite.accepted_by !== user.id)
    return res.status(409).json({ error: "Esta invitación ya la usó otra persona" });

  db.transaction(() => {
    makeFriends(user.id, invite.inviter_id);
    if (invite.status !== "aceptada")
      db.prepare(
        "UPDATE invites SET status = 'aceptada', accepted_by = ?, accepted_at = datetime('now') WHERE id = ?"
      ).run(user.id, invite.id);
  })();

  const inviter = db.prepare("SELECT id, name FROM users WHERE id = ?").get(invite.inviter_id);
  res.json({ user: { id: user.id, name: user.name, email: user.email }, inviter });
});

// ---- Objetos ----

// Solo se ven los objetos propios y los de tus amigos
app.get("/api/items", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const rows = db
    .prepare(
      `SELECT items.*, users.name AS owner_name
       FROM items JOIN users ON users.id = items.owner_id
       WHERE items.owner_id = ?
          OR EXISTS (
            SELECT 1 FROM friendships
            WHERE (user_a = items.owner_id AND user_b = ?)
               OR (user_b = items.owner_id AND user_a = ?)
          )`
    )
    .all(user.id, user.id, user.id);
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
  if (!areFriends(user.id, item.owner_id))
    return res.status(403).json({ error: "Solo puedes pedir prestado a tus amigos" });

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
