export type AdminSessionLike = {
  user?: {
    email?: string | null;
  } | null;
};

export class AdminAuthRequiredError extends Error {
  constructor() {
    super("Authentication required.");
  }
}

export class AdminForbiddenError extends Error {
  constructor() {
    super("Admin access required.");
  }
}

export function requireAdminEmail(session: AdminSessionLike | null) {
  if (!session) {
    throw new AdminAuthRequiredError();
  }

  const email = session.user?.email?.trim().toLowerCase();

  if (!email || !getAdminEmails().has(email)) {
    throw new AdminForbiddenError();
  }

  return email;
}

function getAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}
