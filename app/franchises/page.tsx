import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FranchiseOwnershipManager } from "../_components/FranchiseOwnershipManager";
import { auth } from "@/lib/auth";

export default async function FranchisesPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in?callbackURL=/franchises");
  }

  return (
    <section aria-label="Gestion propriétaires franchises" className="mt-4">
      <FranchiseOwnershipManager />
    </section>
  );
}
