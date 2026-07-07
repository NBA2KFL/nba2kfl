import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "../../_components/AppHeader";
import { FranchiseSelectionBoard } from "../../_components/FranchiseSelectionBoard";

export default async function FranchiseSelectionPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/draft/franchises");
  }

  return (
    <main className="mx-auto w-[min(1240px,calc(100%-40px))] py-5 pb-10 max-[620px]:w-[min(100%-16px,1240px)] max-[620px]:pt-2.5">
      <AppHeader
        activeHref="/draft/franchises"
        description="Attribue les franchises NBA aux GMs selon le rang tiré au sort hors app."
        eyebrow="NBA2KFL Draft Room"
        title="Franchises"
      />

      <section aria-label="Sélection des franchises" className="mt-4">
        <FranchiseSelectionBoard />
      </section>
    </main>
  );
}
