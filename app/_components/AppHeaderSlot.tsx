"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { PAGE_HEADER_CONTENT, type AppRoute } from "@/lib/navigation";

function resolveActiveHref(pathname: string): AppRoute | null {
  if (pathname in PAGE_HEADER_CONTENT) {
    return pathname as AppRoute;
  }

  return null;
}

export function AppHeaderSlot() {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname);

  if (!activeHref) {
    return null;
  }

  const { eyebrow, title, description } = PAGE_HEADER_CONTENT[activeHref];

  return (
    <AppHeader
      activeHref={activeHref}
      description={description}
      eyebrow={eyebrow}
      title={title}
    />
  );
}
