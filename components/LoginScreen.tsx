"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Mail, Lock, User } from "lucide-react";

import { cn } from "@/components/ui/utils";
import { createClient } from "@/lib/supabase/client";

import styles from "./LoginScreen.module.css";

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

interface LoginScreenProps {
  redirectTo?: string;
}

export function LoginScreen({ redirectTo = "/dashboard" }: LoginScreenProps) {
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
      const redirectToUrl =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectToUrl,
          queryParams: {
            prompt: "consent",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "Unable to start Google sign-in.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, isLoading]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.logoBadge}>
            <Image
              src="/sword_logo.png"
              alt="SWORD logo"
              width={48}
              height={48}
              priority
              className={styles.logoImage}
            />
          </div>
          <div>
            <h1 className={styles.heading}>SWORD</h1>
            <p className={styles.subheading}>Scripture • Wisdom • Order • Reflection • Devotion</p>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.inner}>
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
              <div className={styles.formIconCircle}>
                <Image
                  src="/sword_logo.png"
                  alt="SWORD logo"
                  width={40}
                  height={40}
                  className={styles.formHeaderImage}
                />
              </div>
                <div>
                  <h2 className={styles.formTitle}>Welcome to SWORD</h2>
                  <p className={styles.formSubtitle}>
                    {isSignup ? "Create an account to begin your study journey." : "Sign in to continue your study."}
                  </p>
                </div>
              </div>

              <div
                className={styles.formTabList}
                role="tablist"
                aria-label="Authentication mode"
                data-active={mode}
              >
                <button
                  type="button"
                  className={cn(styles.formTabButton, mode === "signin" && styles.formTabButtonActive)}
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
                  className={cn(styles.formTabButton, mode === "signup" && styles.formTabButtonActive)}
                  onClick={() => {
                    setMode("signup");
                    resetState();
                  }}
                  disabled={isLoading}
                >
                  Create Account
                </button>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                {isSignup && (
                  <div className={styles.formField}>
                    <label htmlFor="username" className={styles.formLabel}>
                      Username
                    </label>
                    <div className={styles.formInputWrapper}>
                      <User className={styles.formInputIcon} aria-hidden="true" />
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder="SwordSeeker"
                        value={state.username}
                        onChange={(event) => updateField("username", event.target.value)}
                        disabled={isLoading}
                        className={styles.formInput}
                      />
                    </div>
                  </div>
                )}

                <div className={styles.formField}>
                  <label htmlFor="email" className={styles.formLabel}>
                    Email
                  </label>
                  <div className={styles.formInputWrapper}>
                    <Mail className={styles.formInputIcon} aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={state.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      disabled={isLoading}
                      required
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <label htmlFor="password" className={styles.formLabel}>
                    Password
                  </label>
                  <div className={styles.formInputWrapper}>
                    <Lock className={styles.formInputIcon} aria-hidden="true" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      placeholder="••••••••"
                      value={state.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      disabled={isLoading}
                      required
                      className={styles.formInput}
                    />
                  </div>
                </div>

                {error ? (
                  <div className={styles.formAlert} role="alert">
                    <p className={styles.formAlertTitle}>Something went wrong</p>
                    <p className={styles.formAlertDescription}>{error}</p>
                  </div>
                ) : null}

                <button type="submit" className={styles.formSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className={styles.formSubmitIcon} aria-hidden="true" />
                      Processing...
                    </>
                  ) : (
                    FORM_MODES[mode]
                  )}
                </button>
              </form>

              <div className={styles.formDivider}>
                <span className={styles.formDividerLine} />
                <span>or continue with</span>
                <span className={styles.formDividerLine} />
              </div>

              <button
                type="button"
                className={styles.formOauthButton}
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Image src="/globe.svg" width={18} height={18} alt="Google" className={styles.formOauthIcon} />
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
