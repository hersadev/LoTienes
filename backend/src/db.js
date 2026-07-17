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

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT DEFAULT ''
  );

  -- Una solicitud/préstamo. Estados:
  --   pendiente  -> el amigo ha pedido el objeto, falta que el dueño acepte
  --   aceptado   -> préstamo activo, lo tiene el borrower
  --   rechazado  -> el dueño dijo que no
  --   devuelto   -> préstamo cerrado
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id),
    owner_id INTEGER NOT NULL REFERENCES users(id),
    borrower_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pendiente'
      CHECK (status IN ('pendiente', 'aceptado', 'rechazado', 'devuelto')),
    message TEXT DEFAULT '',
    due_date TEXT,
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_at TEXT,
    returned_at TEXT
  );
`);

// Datos de ejemplo para poder probar sin registro de usuarios todavía
const hasUsers = db.prepare("SELECT COUNT(*) AS n FROM users").get().n > 0;
if (!hasUsers) {
  const insertUser = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
  const juanjo = insertUser.run("Juanjo", "juanjosehersa@gmail.com").lastInsertRowid;
  const ana = insertUser.run("Ana", "ana@example.com").lastInsertRowid;
  insertUser.run("Luis", "luis@example.com");

  const insertItem = db.prepare(
    "INSERT INTO items (owner_id, name, description) VALUES (?, ?, ?)"
  );
  insertItem.run(juanjo, "Taladro", "Taladro percutor Bosch");
  insertItem.run(juanjo, "Dune (libro)", "Edición de bolsillo");
  insertItem.run(ana, "Tienda de campaña", "Para 4 personas");
}
