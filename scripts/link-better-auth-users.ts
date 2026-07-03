import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

type GeneratedUser = {
  name: string;
  email: string;
  password: string;
};

type LinkResult = {
  fileUsers: number;
  neonUsersMatched: number;
  betterAuthUsersExisting: number;
  betterAuthAccountsExisting: number;
  createdBetterAuthUsers: number;
  skippedMissingNeonUsers: number;
};

export function parseUserPasswordRows(markdown: string): GeneratedUser[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.startsWith("|") &&
        !line.includes("---") &&
        !line.toLowerCase().includes("mot de passe")
    )
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === 3 && cells[1].includes("@"))
    .map(([name, email, password]) => ({
      name,
      email: email.toLowerCase(),
      password: unwrapInlineCode(password)
    }));
}

function unwrapInlineCode(value: string) {
  return value.startsWith("`") && value.endsWith("`")
    ? value.slice(1, -1)
    : value;
}

function loadEnvFile(path: string) {
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

function unwrapQuotedValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function linkBetterAuthUsers(dryRun: boolean): Promise<LinkResult> {
  loadEnvFile(".env.local");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const generatedUsers = parseUserPasswordRows(
    readFileSync(".env.user-passwords.md", "utf8")
  );
  const usersByEmail = new Map(
    generatedUsers.map((user) => [user.email, user] as const)
  );
  const users = [...usersByEmail.values()];
  const emails = users.map((user) => user.email);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const neonRows = await pool.query<{ email: string }>(
      'SELECT lower(email) AS email FROM neon_auth."user" WHERE lower(email) = ANY($1::text[])',
      [emails]
    );
    const betterAuthRows = await pool.query<{ email: string }>(
      'SELECT lower(email) AS email FROM public."user" WHERE lower(email) = ANY($1::text[])',
      [emails]
    );
    const betterAuthAccountRows = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM public.account WHERE "userId" IN (SELECT id FROM public."user" WHERE lower(email) = ANY($1::text[]))',
      [emails]
    );

    const neonEmails = new Set(neonRows.rows.map((row) => row.email));
    const betterAuthEmails = new Set(
      betterAuthRows.rows.map((row) => row.email)
    );

    let createdBetterAuthUsers = 0;
    let skippedMissingNeonUsers = 0;

    if (!dryRun) {
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

      for (const user of users) {
        if (!neonEmails.has(user.email)) {
          skippedMissingNeonUsers += 1;
          continue;
        }

        if (betterAuthEmails.has(user.email)) {
          continue;
        }

        await auth.api.signUpEmail({
          body: {
            name: user.name,
            email: user.email,
            password: user.password
          }
        });

        createdBetterAuthUsers += 1;
        betterAuthEmails.add(user.email);
      }
    } else {
      skippedMissingNeonUsers = users.filter(
        (user) => !neonEmails.has(user.email)
      ).length;
    }

    return {
      fileUsers: users.length,
      neonUsersMatched: neonEmails.size,
      betterAuthUsersExisting: betterAuthRows.rowCount ?? 0,
      betterAuthAccountsExisting: Number(
        betterAuthAccountRows.rows[0]?.count ?? 0
      ),
      createdBetterAuthUsers,
      skippedMissingNeonUsers
    };
  } finally {
    await pool.end();
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await linkBetterAuthUsers(dryRun);
  console.log(JSON.stringify({ dryRun, ...result }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
