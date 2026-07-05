import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      className={cn(
        "min-h-[38px] w-full rounded-[10px] border border-command-border bg-command-surface px-3 py-2 text-[0.86rem] text-command-text shadow-[0_1px_0_rgba(16,24,40,0.03)] transition duration-150 ease-out focus:border-command-accent focus:shadow-[0_0_0_4px_rgba(94,106,210,0.12)] focus:outline-none disabled:bg-command-surface-muted disabled:text-command-muted",
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
);
Input.displayName = "Input";
