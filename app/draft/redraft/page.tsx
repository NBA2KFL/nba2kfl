import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RedraftRoom } from "../../_components/RedraftRoom";

export default async function RedraftPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/draft/redraft");
  }

  return (
    <section aria-label="Redraft joueurs" className="mt-4">
      <RedraftRoom currentUserEmail={session.user.email ?? null} />
    </section>
  );
}
