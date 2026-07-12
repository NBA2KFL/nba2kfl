"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-[rgba(11,15,21,0.5)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className
    )}
    ref={ref}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-[min(720px,calc(100%-32px))] max-h-[min(680px,calc(100%-64px))] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] gap-0 overflow-hidden rounded-[18px] border border-command-border bg-command-surface shadow-[0_24px_64px_rgba(16,24,40,0.24)]",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Fermer"
        className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-[10px] text-command-muted transition duration-150 ease-out hover:bg-command-surface-muted hover:text-command-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgba(94,106,210,0.22)]"
      >
        <X aria-hidden size={16} />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid gap-1 border-b border-command-border px-5 py-4 pr-12",
        className
      )}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-command-border bg-command-surface-muted/45 px-5 py-3.5",
        className
      )}
      {...props}
    />
  );
}

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    className={cn(
      "text-[1.05rem] font-[730] leading-[1.2] tracking-[-0.02em] text-command-ink",
      className
    )}
    ref={ref}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    className={cn("text-[0.82rem] leading-[1.5] text-command-muted-strong", className)}
    ref={ref}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
