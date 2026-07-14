import { redirect } from "next/navigation";

import { LoginScreen } from "@/components/LoginScreen";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign In · SWORD",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const initialError = typeof params.error === "string" ? params.error.trim() : null;

  return (
    <LoginScreen
      redirectTo="/dashboard"
      initialError={initialError || null}
    />
  );
}
