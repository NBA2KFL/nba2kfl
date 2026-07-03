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
    <main className="app-shell">
      <AppHeader
        activeHref="/draft/franchises"
        description="Attribue les franchises NBA aux GMs selon le rang tiré au sort hors app."
        eyebrow="NBA2KFL Draft Room"
        title="Franchises"
      />

      <section className="workflow-page" aria-label="Sélection des franchises">
        <FranchiseSelectionBoard />
      </section>
    </main>
  );
}
