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
    <section
      aria-label="Connexion GM"
      className="grid place-items-start rounded-b-[18px] border border-t-0 border-command-border bg-command-surface px-4 py-8 pb-11 shadow-[0_18px_48px_rgba(16,24,40,0.08)]"
    >
      <SignInForm callbackURL={callbackURL} />
    </section>
  );
}

function sanitizeCallbackURL(callbackURL: string | undefined) {
  if (!callbackURL?.startsWith("/") || callbackURL.startsWith("//")) {
    return "/draft/franchises";
  }

  return callbackURL;
}
