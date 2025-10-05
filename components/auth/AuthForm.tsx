"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { createClient } from "@/lib/supabase/client";

const FORM_MODES = {
  signin: "Sign In",
  signup: "Create Account",
} as const;

type FormMode = keyof typeof FORM_MODES;

type FormState = {
  email: string;
  password: string;
  username: string;
};

const initialState: FormState = {
  email: "",
  password: "",
  username: "",
};

const inputClassName =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

const labelClassName = "block text-sm font-medium text-slate-700";

const errorClassName = "mt-2 text-sm text-rose-600";

const submitButtonClassName =
  "flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

const toggleButtonClassName = "text-sm font-semibold text-slate-900 hover:underline";

const AuthForm = ({ redirectTo = "/" }: { redirectTo?: string }) => {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<FormMode>("signin");
  const [state, setState] = useState<FormState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isLoading) {
        return;
      }

      setIsLoading(true);
      setError(null);

      const email = state.email.trim().toLowerCase();
      const password = state.password.trim();
      const username = state.username.trim();

      try {
        if (!email || !password) {
          setError("Email and password are required.");
          return;
        }

        if (isSignup && !username) {
          setError("Username is required.");
          return;
        }

        if (isSignup) {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: username ? { username } : undefined,
              emailRedirectTo:
                typeof window !== "undefined"
                  ? `${window.location.origin}/auth/callback`
                  : undefined,
            },
          });

          if (signUpError) {
            setError(signUpError.message);
            return;
          }
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setError(signInError.message);
            return;
          }
        }

        router.replace(redirectTo);
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [isSignup, state, supabase, router, isLoading, redirectTo]
  );

  const handleGoogleSignIn = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "consent",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setIsLoading(false);
        return;
      }
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "Unable to start Google sign-in.");
      setIsLoading(false);
    }
  }, [supabase, isLoading]);

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900">
          <Image src="/file.svg" alt="SWORD" width={28} height={28} priority />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back to SWORD</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isSignup ? "Create your study account." : "Sign in to continue your study."}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className={`${toggleButtonClassName} ${mode === "signin" ? "text-slate-900" : "text-slate-500"}`}
          onClick={() => {
            setMode("signin");
            resetState();
          }}
          disabled={isLoading}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`${toggleButtonClassName} ${mode === "signup" ? "text-slate-900" : "text-slate-500"}`}
          onClick={() => {
            setMode("signup");
            resetState();
          }}
          disabled={isLoading}
        >
          Create Account
        </button>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {isSignup && (
          <label className="flex flex-col gap-1">
            <span className={labelClassName}>Username</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              className={inputClassName}
              placeholder="SwordSeeker"
              value={state.username}
              onChange={(event) => updateField("username", event.target.value)}
              disabled={isLoading}
            />
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className={labelClassName}>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className={inputClassName}
            placeholder="you@example.com"
            value={state.email}
            onChange={(event) => updateField("email", event.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClassName}>Password</span>
          <input
            type="password"
            name="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={inputClassName}
            placeholder="••••••••"
            value={state.password}
            onChange={(event) => updateField("password", event.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        {error && <p className={errorClassName}>{error}</p>}

        <button type="submit" className={submitButtonClassName} disabled={isLoading}>
          {isLoading ? "Please wait..." : FORM_MODES[mode]}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase tracking-wide text-slate-500">or continue with</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <Image src="/globe.svg" width={18} height={18} alt="Google" />
        Continue with Google
      </button>
    </div>
  );
};

export default AuthForm;
