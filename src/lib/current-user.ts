import type { DraftDbClient } from "./draft-db";

export type StackUserLike = {
  displayName?: string | null;
  primaryEmail?: string | null;
};

export type CurrentDraftUser = {
  userId: string;
  email: string;
  displayName: string;
};

type NeonUserRow = {
  id: string;
  email: string;
};

export class AuthRequiredError extends Error {
  constructor() {
    super("Authentication required.");
  }
}

export class ForbiddenUserError extends Error {
  constructor(message: string = "User is not linked to a GM account.") {
    super(message);
  }
}

export async function resolveCurrentUser(
  db: DraftDbClient,
  stackUser: StackUserLike | null
): Promise<CurrentDraftUser> {
  if (!stackUser) {
    throw new AuthRequiredError();
  }

  const email = stackUser.primaryEmail?.trim().toLowerCase();

  if (!email) {
    throw new ForbiddenUserError("Signed-in user has no primary email.");
  }

  const rows = await db.query<NeonUserRow>(
    'SELECT id, email FROM neon_auth."user" WHERE lower(email) = lower($1) LIMIT 1',
    [email]
  );
  const row = rows[0];

  if (!row) {
    throw new ForbiddenUserError();
  }

  return {
    userId: row.id,
    email: row.email.toLowerCase(),
    displayName: stackUser.displayName?.trim() || row.email
  };
}
