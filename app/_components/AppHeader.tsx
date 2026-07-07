import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { APP_NAV_ITEMS, type AppRoute } from "@/lib/navigation";

type AppHeaderProps = {
  activeHref: AppRoute;
  eyebrow: string;
  title: string;
  description?: string;
};

export function AppHeader({
  activeHref,
  eyebrow,
  title,
  description
}: AppHeaderProps) {
  return (
    <header
      aria-labelledby="page-title"
      className="sticky top-4 z-20 grid min-h-[86px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-5 rounded-[18px] border border-command-border bg-command-surface/90 p-3.5 shadow-[0_14px_44px_rgba(16,24,40,0.08)] backdrop-blur-xl max-[1040px]:static max-[1040px]:grid-cols-1 max-[620px]:rounded-[16px] max-[620px]:p-3"
    >
      <div className="flex min-w-0 items-center gap-3 max-[620px]:items-start">
        <Link
          aria-label="Retour à l'accueil"
          className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] border border-command-border bg-[#0f1117] text-[0.72rem] font-[820] leading-none tracking-[0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_rgba(15,17,23,0.12)] transition duration-150 ease-out hover:bg-[#1d2030] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgba(94,106,210,0.22)] max-[620px]:h-10 max-[620px]:w-10 max-[620px]:rounded-[11px] max-[620px]:text-[0.68rem]"
          href="/"
        >
          N2K
        </Link>
        <div>
          <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-accent">
            {eyebrow}
          </p>
          <h1 id="page-title">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-[680px] text-[0.88rem] leading-[1.42] text-command-muted-strong max-[620px]:text-[0.86rem]">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 max-[1040px]:w-full max-[1040px]:justify-between">
        <nav
          aria-label="Navigation principale"
          className="flex flex-wrap content-center justify-end gap-1.5 rounded-[14px] border border-command-border bg-command-surface-muted/70 p-1 max-[1040px]:justify-start"
        >
          {APP_NAV_ITEMS.map((item) => (
            <Link
              aria-current={item.href === activeHref ? "page" : undefined}
              className={cn(
                "inline-flex min-h-8 items-center rounded-[10px] px-3 py-1.5 text-[0.81rem] font-[650] leading-none transition duration-150 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgba(94,106,210,0.22)] max-[620px]:min-h-[32px] max-[620px]:px-2.5 max-[620px]:py-1.5 max-[620px]:text-[0.77rem]",
                item.href === activeHref
                  ? "bg-command-surface text-command-ink shadow-[0_7px_18px_rgba(16,24,40,0.08),inset_0_0_0_1px_rgba(204,210,223,0.72)]"
                  : "text-command-muted-strong hover:bg-command-surface hover:text-command-ink hover:shadow-[0_1px_0_rgba(16,24,40,0.04)]"
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
