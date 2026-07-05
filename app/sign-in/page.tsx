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
    <main className="mx-auto w-[min(1240px,calc(100%-40px))] py-5 pb-10 max-[620px]:w-[min(100%-16px,1240px)] max-[620px]:pt-2.5">
      <AppHeader
        activeHref="/sign-in"
        description="Connecte ton compte GM avant de modifier une franchise ou un pick joueur."
        eyebrow="NBA2KFL Draft Room"
        title="Connexion GM"
      />

      <section
        aria-label="Connexion GM"
        className="grid place-items-start rounded-b-[18px] border border-t-0 border-command-border bg-command-surface px-4 py-8 pb-11 shadow-[0_18px_48px_rgba(16,24,40,0.08)]"
      >
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
