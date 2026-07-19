import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { areFriends, db, makeFriends } from "./db.js";

const app = express();
app.use(cors());
// Límite alto porque la foto de la ficha viaja como data URI en el body
app.use(express.json({ limit: "15mb" }));

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
  SELECT loans.*, items.name AS item_name, items.photo AS item_photo,
         items.category AS item_category,
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

// Solo se ven los objetos propios y los de tus amigos. Se incluye el préstamo
// activo (si lo hay) para que la app sepa si el objeto está disponible.
app.get("/api/items", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const rows = db
    .prepare(
      `SELECT items.*, users.name AS owner_name,
              loans.status AS loan_status, borrower.name AS loan_borrower_name
       FROM items
       JOIN users ON users.id = items.owner_id
       LEFT JOIN loans ON loans.item_id = items.id AND loans.status IN ('pendiente', 'aceptado')
       LEFT JOIN users AS borrower ON borrower.id = loans.borrower_id
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

// Registrar la ficha de un objeto: nombre, foto, estado y categoría, todo
// obligatorio (lo único opcional del flujo es la fecha de devolución, en el préstamo).
app.post("/api/items", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const name = (req.body?.name ?? "").trim();
  const description = (req.body?.description ?? "").trim();
  const category = (req.body?.category ?? "").trim();
  const photo = req.body?.photo ?? "";
  if (!name) return res.status(400).json({ error: "Falta el nombre del objeto" });
  if (!description)
    return res.status(400).json({ error: "Falta la descripción del estado del objeto" });
  if (!category) return res.status(400).json({ error: "Falta la categoría" });
  if (!photo) return res.status(400).json({ error: "Falta la foto del objeto" });
  const info = db
    .prepare(
      "INSERT INTO items (owner_id, name, description, category, photo) VALUES (?, ?, ?, ?, ?)"
    )
    .run(user.id, name, description, category, photo);
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

// Prestar un objeto: el dueño crea el préstamo y se lo ofrece a un amigo.
// Queda 'pendiente' hasta que el amigo lo acepte. La fecha de devolución es opcional.
app.post("/api/loans", (req, res) => {
  const user = currentUser(req, res);
  if (!user) return;
  const { item_id, borrower_id, start_date, due_date = null, message = "" } = req.body;
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(item_id);
  if (!item) return res.status(404).json({ error: "Objeto no encontrado" });
  if (item.owner_id !== user.id)
    return res.status(403).json({ error: "Solo puedes prestar tus propios objetos" });
  const borrower = db.prepare("SELECT * FROM users WHERE id = ?").get(borrower_id);
  if (!borrower) return res.status(404).json({ error: "Amigo no encontrado" });
  if (borrower.id === user.id)
    return res.status(400).json({ error: "No puedes prestarte un objeto a ti mismo" });
  if (!areFriends(user.id, borrower.id))
    return res.status(403).json({ error: "Solo puedes prestar a tus amigos" });
  if (!start_date) return res.status(400).json({ error: "Falta la fecha del préstamo" });

  const active = db
    .prepare("SELECT id FROM loans WHERE item_id = ? AND status IN ('pendiente', 'aceptado')")
    .get(item_id);
  if (active)
    return res.status(409).json({ error: "Ese objeto ya tiene un préstamo activo o pendiente" });

  const info = db
    .prepare(
      `INSERT INTO loans (item_id, owner_id, borrower_id, message, start_date, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(item_id, user.id, borrower.id, message, start_date, due_date);
  res.status(201).json(db.prepare(`${loanQuery} WHERE loans.id = ?`).get(info.lastInsertRowid));
});

// Transiciones de estado. Quién puede hacer qué:
//   aceptar/rechazar -> solo el amigo invitado (borrower), sobre una invitación pendiente
//   devolver         -> solo el dueño, cuando le devuelven el objeto
const transitions = {
  accept: { from: "pendiente", to: "aceptado", by: "borrower", stamp: "accepted_at" },
  reject: { from: "pendiente", to: "rechazado", by: "borrower", stamp: null },
  return: { from: "aceptado", to: "devuelto", by: "owner", stamp: "returned_at" },
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
  const allowed = t.by === "owner" ? loan.owner_id === user.id : loan.borrower_id === user.id;
  if (!allowed) return res.status(403).json({ error: "No puedes hacer eso en este préstamo" });

  const stamp = t.stamp ? `, ${t.stamp} = datetime('now')` : "";
  db.prepare(`UPDATE loans SET status = ?${stamp} WHERE id = ?`).run(t.to, loan.id);
  res.json(db.prepare(`${loanQuery} WHERE loans.id = ?`).get(loan.id));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`LoTienes backend en http://localhost:${PORT}`));
