"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

type SignInFormProps = {
  callbackURL: string;
};

export function SignInForm({ callbackURL }: SignInFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({
              email,
              password,
              callbackURL
            })
          : await authClient.signUp.email({
              email,
              password,
              name: name.trim() || email,
              callbackURL
            });

      if (result.error) {
        setErrorMessage(result.error.message ?? "Connexion impossible.");
        return;
      }

      router.push(callbackURL);
      router.refresh();
    });
  }

  const authModeButtonClass =
    "grid min-h-[38px] cursor-pointer place-items-center rounded-[10px] border border-command-border px-3.5 text-center text-[0.83rem] font-[670] leading-none transition duration-150 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgba(94,106,210,0.22)] bg-command-surface text-command-muted-strong shadow-[0_1px_0_rgba(16,24,40,0.03)] hover:border-command-border-strong hover:bg-command-surface-muted hover:text-command-ink";
  const authModeButtonActiveClass =
    "border-command-border-strong bg-command-surface text-command-accent shadow-[0_8px_20px_rgba(16,24,40,0.08),inset_0_0_0_1px_rgba(94,106,210,0.14)]";

  return (
    <form
      className="grid w-[min(440px,100%)] gap-3.5"
      onSubmit={handleSubmit}
    >
      <div
        aria-label="Mode d'authentification"
        className="grid grid-cols-2 gap-2 rounded-[14px] border border-command-border bg-command-surface-muted p-1"
      >
        <button
          aria-pressed={mode === "sign-in"}
          className={cn(
            authModeButtonClass,
            mode === "sign-in" && authModeButtonActiveClass
          )}
          onClick={() => setMode("sign-in")}
          type="button"
        >
          Connexion
        </button>
        <button
          aria-pressed={mode === "sign-up"}
          className={cn(
            authModeButtonClass,
            mode === "sign-up" && authModeButtonActiveClass
          )}
          onClick={() => setMode("sign-up")}
          type="button"
        >
          Creation
        </button>
      </div>

      {mode === "sign-up" ? (
        <label className="grid gap-2">
          <span className="text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Nom
          </span>
          <Input
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            type="text"
            value={name}
          />
        </label>
      ) : null}

      <label className="grid gap-2">
        <span className="text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
          Email GM
        </span>
        <Input
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
          Mot de passe
        </span>
        <Input
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {errorMessage ? (
        <p className="m-0 rounded-[12px] border border-command-red-border bg-command-red-soft p-3 text-[0.85rem] font-[680] text-command-red-text">
          {errorMessage}
        </p>
      ) : null}

      <Button disabled={isPending} type="submit">
        {isPending
          ? "Traitement..."
          : mode === "sign-in"
            ? "Se connecter"
            : "Creer le compte"}
      </Button>
    </form>
  );
}
