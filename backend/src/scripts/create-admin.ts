import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const [, , emailArg, passwordArg, displayNameArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error('Usage: npx tsx backend/src/scripts/create-admin.ts admin@example.com password123 "Admin Name"');
  process.exit(1);
}

const email = emailArg.toLowerCase();
const passwordHash = await bcrypt.hash(passwordArg, 10);
const id = nanoid();
const displayName = displayNameArg ?? 'Admin';
const now = Date.now();

function escapeSql(value: string) {
  return value.replaceAll("'", "''");
}

console.log(`INSERT INTO users (id, email, password_hash, display_name, niveau, role, created_at, last_seen_at)
VALUES ('${id}', '${escapeSql(email)}', '${escapeSql(passwordHash)}', '${escapeSql(displayName)}', 'B1', 'admin', ${now}, ${now})
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  display_name = excluded.display_name,
  role = 'admin',
  last_seen_at = excluded.last_seen_at;`);

console.log('\nRun with: wrangler d1 execute telc-prep --local --command "<SQL above>"');
