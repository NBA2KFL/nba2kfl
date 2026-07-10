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

  if (!isAdminEmail(email)) {
    throw new AdminForbiddenError();
  }

  return email;
}

export function isAdminEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();

  return Boolean(normalizedEmail && getAdminEmails().has(normalizedEmail));
}

function getAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}
