import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(dir, "..", "lotienes.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  );

  -- Ficha del objeto: nombre, foto (data URI), estado y categoría (para filtrar)
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    photo TEXT DEFAULT '',
    category TEXT DEFAULT ''
  );

  -- Un préstamo. Lo crea el dueño ofreciéndoselo a un amigo. Estados:
  --   pendiente  -> invitación enviada, falta que el amigo acepte
  --   aceptado   -> préstamo activo, lo tiene el borrower
  --   rechazado  -> el amigo dijo que no
  --   devuelto   -> el dueño lo marcó como devuelto (préstamo pasado)
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id),
    owner_id INTEGER NOT NULL REFERENCES users(id),
    borrower_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pendiente'
      CHECK (status IN ('pendiente', 'aceptado', 'rechazado', 'devuelto')),
    message TEXT DEFAULT '',
    start_date TEXT,
    due_date TEXT,
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_at TEXT,
    returned_at TEXT
  );

  -- Amistad entre dos usuarios. Se guarda una sola fila por pareja,
  -- siempre con user_a < user_b (usar los helpers areFriends/makeFriends).
  CREATE TABLE IF NOT EXISTS friendships (
    user_a INTEGER NOT NULL REFERENCES users(id),
    user_b INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_a, user_b)
  );

  -- Invitación por enlace: el que invita genera un token y comparte la URL.
  -- Quien la acepta (registrándose o con su cuenta) se hace amigo del que invita.
  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    inviter_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aceptada')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_by INTEGER REFERENCES users(id),
    accepted_at TEXT
  );
`);

// Migración mínima para bases creadas antes de estas columnas
function addColumnIfMissing(table, column, ddl) {
  const exists = db.prepare(`SELECT 1 FROM pragma_table_info(?) WHERE name = ?`).get(table, column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}
addColumnIfMissing("items", "photo", "TEXT DEFAULT ''");
addColumnIfMissing("items", "category", "TEXT DEFAULT ''");
addColumnIfMissing("loans", "start_date", "TEXT");

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export function areFriends(a, b) {
  const [x, y] = pair(a, b);
  return !!db.prepare("SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?").get(x, y);
}

export function makeFriends(a, b) {
  const [x, y] = pair(a, b);
  db.prepare("INSERT OR IGNORE INTO friendships (user_a, user_b) VALUES (?, ?)").run(x, y);
}

// Datos de ejemplo para poder probar sin registro de usuarios todavía
const hasUsers = db.prepare("SELECT COUNT(*) AS n FROM users").get().n > 0;
if (!hasUsers) {
  const insertUser = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
  const juanjo = insertUser.run("Juanjo", "juanjosehersa@gmail.com").lastInsertRowid;
  const ana = insertUser.run("Ana", "ana@example.com").lastInsertRowid;
  insertUser.run("Luis", "luis@example.com");

  const insertItem = db.prepare(
    "INSERT INTO items (owner_id, name, description, category) VALUES (?, ?, ?, ?)"
  );
  insertItem.run(juanjo, "Taladro", "Taladro percutor Bosch, buen estado", "Herramientas");
  insertItem.run(juanjo, "Dune (libro)", "Edición de bolsillo, algo desgastado", "Libros");
  insertItem.run(ana, "Tienda de campaña", "Para 4 personas, como nueva", "Deporte");
}

// Los objetos ahora solo se ven entre amigos: si la base es anterior a la tabla
// friendships (o recién creada), deja a Juanjo y Ana como amigos de ejemplo.
// Luis se queda fuera a propósito: sirve para probar el flujo de invitación.
const hasFriendships = db.prepare("SELECT COUNT(*) AS n FROM friendships").get().n > 0;
if (!hasFriendships) {
  const juanjo = db.prepare("SELECT id FROM users WHERE email = ?").get("juanjosehersa@gmail.com");
  const ana = db.prepare("SELECT id FROM users WHERE email = ?").get("ana@example.com");
  if (juanjo && ana) makeFriends(juanjo.id, ana.id);
}
