import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.62rem] font-[760] uppercase leading-none tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "bg-command-accent-soft text-command-accent-dark",
        success: "bg-command-green-soft text-command-green-dark"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
