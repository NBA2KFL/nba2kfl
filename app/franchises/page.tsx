import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FranchiseOwnershipManager } from "../_components/FranchiseOwnershipManager";
import { AppHeader } from "../_components/AppHeader";
import { auth } from "@/lib/auth";

export default async function FranchisesPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/franchises");
  }

  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/franchises"
        description="Sépare l'historique de draft des propriétaires long terme des franchises."
        eyebrow="NBA2KFL Admin"
        title="Gestion franchises"
      />

      <section className="workflow-page" aria-label="Gestion propriétaires franchises">
        <FranchiseOwnershipManager />
      </section>
    </main>
  );
}
