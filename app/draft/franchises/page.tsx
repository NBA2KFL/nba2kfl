import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FranchiseSelectionBoard } from "../../_components/FranchiseSelectionBoard";

export default async function FranchiseSelectionPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/draft/franchises");
  }

  return (
    <section aria-label="Sélection des franchises" className="mt-4">
      <FranchiseSelectionBoard />
    </section>
  );
}
