import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "../../_components/AppHeader";
import { RedraftRoom } from "../../_components/RedraftRoom";

export default async function RedraftPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/draft/redraft");
  }

  return (
    <main className="mx-auto w-[min(1240px,calc(100%-40px))] py-5 pb-10 max-[620px]:w-[min(100%-16px,1240px)] max-[620px]:pt-2.5">
      <AppHeader
        activeHref="/draft/redraft"
        description="Sélectionne les joueurs avec un ordre snake basé sur les franchises attribuées."
        eyebrow="NBA2KFL Draft Room"
        title="Redraft"
      />

      <section aria-label="Redraft joueurs" className="mt-4">
        <RedraftRoom currentUserEmail={session.user.email ?? null} />
      </section>
    </main>
  );
}
