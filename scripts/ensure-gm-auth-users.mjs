import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = unwrapQuotedValue(match[2].trim());
  }
}

function unwrapQuotedValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function slugifyUserName(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadGmUsers() {
  const source = readFileSync("src/lib/redraft.ts", "utf8");
  const links = [
    ...source.matchAll(
      /createGmDraftSlotLink\(\s*\d+,\s*"[^"]+",\s*"([^"]+)"\s*\)/g
    )
  ].map((match) => match[1]);
  const usersByEmail = new Map();

  for (const name of links) {
    const email = `${slugifyUserName(name)}@nba2kfl.local`;
    usersByEmail.set(email, { name, email });
  }

  return [...usersByEmail.values()].toSorted((first, second) =>
    first.name.localeCompare(second.name)
  );
}

function generatePassword() {
  return `N2K-${randomBytes(9).toString("base64url")}`;
}

function appendGeneratedPasswords(users) {
  if (users.length === 0) {
    return;
  }

  const path = ".env.user-passwords.md";
  const now = new Date().toISOString();
  const block = [
    `# Generated GM users - ${now}`,
    "",
    "| Nom | Email | Mot de passe |",
    "| --- | --- | --- |",
    ...users.map(
      (user) => `| ${user.name} | ${user.email} | \`${user.password}\` |`
    ),
    ""
  ].join("\n");
  const previous = existsSync(path) ? readFileSync(path, "utf8").trim() : "";

  writeFileSync(path, previous ? `${previous}\n\n${block}` : block);
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const gmUsers = loadGmUsers();
  const emails = gmUsers.map((user) => user.email);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const existingNeonRows = await pool.query(
      'SELECT lower(email) AS email FROM neon_auth."user" WHERE lower(email) = ANY($1::text[])',
      [emails]
    );
    const existingPublicRows = await pool.query(
      'SELECT lower(email) AS email FROM public."user" WHERE lower(email) = ANY($1::text[])',
      [emails]
    );
    const existingNeonEmails = new Set(
      existingNeonRows.rows.map((row) => row.email)
    );
    const existingPublicEmails = new Set(
      existingPublicRows.rows.map((row) => row.email)
    );
    const missingNeonUsers = gmUsers.filter(
      (user) => !existingNeonEmails.has(user.email)
    );
    const missingPublicUsers = gmUsers.filter(
      (user) => !existingPublicEmails.has(user.email)
    );

    if (missingNeonUsers.length > 0) {
      await pool.query(
        `
          INSERT INTO neon_auth."user" (
            name,
            email,
            "emailVerified",
            "createdAt",
            "updatedAt"
          )
          SELECT
            input.name,
            input.email,
            true,
            now(),
            now()
          FROM jsonb_to_recordset($1::jsonb) AS input(
            name text,
            email text
          )
          WHERE NOT EXISTS (
            SELECT 1
            FROM neon_auth."user" existing_user
            WHERE lower(existing_user.email) = lower(input.email)
          )
        `,
        [JSON.stringify(missingNeonUsers)]
      );
    }

    const auth = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      secret:
        process.env.BETTER_AUTH_SECRET ||
        "migration-only-secret-0123456789abcdef",
      database: pool,
      emailAndPassword: {
        enabled: true
      }
    });
    const generatedPublicUsers = [];

    for (const user of missingPublicUsers) {
      const password = generatePassword();

      await auth.api.signUpEmail({
        body: {
          name: user.name,
          email: user.email,
          password
        }
      });

      generatedPublicUsers.push({ ...user, password });
    }

    appendGeneratedPasswords(generatedPublicUsers);

    const finalNeonRows = await pool.query(
      'SELECT count(*)::int AS count FROM neon_auth."user" WHERE lower(email) = ANY($1::text[])',
      [emails]
    );
    const finalPublicRows = await pool.query(
      'SELECT count(*)::int AS count FROM public."user" WHERE lower(email) = ANY($1::text[])',
      [emails]
    );

    console.log(
      JSON.stringify(
        {
          gmUsers: gmUsers.length,
          createdNeonUsers: missingNeonUsers.length,
          createdBetterAuthUsers: generatedPublicUsers.length,
          finalNeonUsers: finalNeonRows.rows[0]?.count ?? 0,
          finalBetterAuthUsers: finalPublicRows.rows[0]?.count ?? 0,
          passwordFile:
            generatedPublicUsers.length > 0 ? ".env.user-passwords.md" : null
        },
        null,
        2
      )
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
