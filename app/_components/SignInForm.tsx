"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

  return (
    <form className="auth-panel" onSubmit={handleSubmit}>
      <div className="auth-mode-switch" aria-label="Mode d'authentification">
        <button
          aria-pressed={mode === "sign-in"}
          className={mode === "sign-in" ? "is-active" : ""}
          onClick={() => setMode("sign-in")}
          type="button"
        >
          Connexion
        </button>
        <button
          aria-pressed={mode === "sign-up"}
          className={mode === "sign-up" ? "is-active" : ""}
          onClick={() => setMode("sign-up")}
          type="button"
        >
          Creation
        </button>
      </div>

      {mode === "sign-up" ? (
        <label className="field-stack">
          <span>Nom</span>
          <input
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            type="text"
            value={name}
          />
        </label>
      ) : null}

      <label className="field-stack">
        <span>Email GM</span>
        <input
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label className="field-stack">
        <span>Mot de passe</span>
        <input
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

      <button className="primary-action" disabled={isPending} type="submit">
        {isPending
          ? "Traitement..."
          : mode === "sign-in"
            ? "Se connecter"
            : "Creer le compte"}
      </button>
    </form>
  );
}
