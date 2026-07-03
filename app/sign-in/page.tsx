import { AppHeader } from "../_components/AppHeader";
import { SignInForm } from "../_components/SignInForm";

type SignInPageProps = {
  searchParams: Promise<{
    callbackURL?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackURL = sanitizeCallbackURL(params.callbackURL);

  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/"
        description="Connecte ton compte GM avant de modifier une franchise ou un pick joueur."
        eyebrow="NBA2KFL Draft Room"
        title="Connexion GM"
      />

      <section className="auth-page" aria-label="Connexion GM">
        <SignInForm callbackURL={callbackURL} />
      </section>
    </main>
  );
}

function sanitizeCallbackURL(callbackURL: string | undefined) {
  if (!callbackURL?.startsWith("/") || callbackURL.startsWith("//")) {
    return "/draft/franchises";
  }

  return callbackURL;
}
