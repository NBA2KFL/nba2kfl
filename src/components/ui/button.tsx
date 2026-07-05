import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "grid min-h-[38px] cursor-pointer place-items-center rounded-[10px] border border-command-border px-3.5 text-center text-[0.83rem] font-[670] leading-none transition duration-150 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgba(94,106,210,0.22)]",
  {
    variants: {
      variant: {
        primary:
          "border-command-accent bg-command-accent text-white shadow-[0_10px_24px_rgba(94,106,210,0.22)] hover:-translate-y-px hover:border-command-accent-dark hover:bg-command-accent-dark hover:shadow-[0_13px_28px_rgba(94,106,210,0.28)] disabled:cursor-not-allowed disabled:border-command-border disabled:bg-command-border-strong disabled:text-white disabled:opacity-[0.56] disabled:shadow-none disabled:[transform:none]",
        secondary:
          "bg-command-surface text-command-muted-strong shadow-[0_1px_0_rgba(16,24,40,0.03)] hover:border-command-border-strong hover:bg-command-surface-muted hover:text-command-ink disabled:cursor-not-allowed disabled:opacity-[0.56] disabled:[transform:none]",
        tertiary:
          "bg-command-surface text-command-muted-strong shadow-[0_1px_0_rgba(16,24,40,0.03)] hover:border-command-border-strong hover:bg-command-surface-muted hover:text-command-ink"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, type, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant }), className)}
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
