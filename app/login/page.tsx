import { redirect } from "next/navigation";

import { LoginScreen } from "@/components/LoginScreen";
import AuthForm from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign In · SWORD",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <LoginScreen>
      <AuthForm className="border-0 bg-transparent p-0 shadow-none" />
    </LoginScreen>
  );
}
