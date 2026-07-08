import { redirect } from "next/navigation";

import { LoginScreen } from "@/components/LoginScreen";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign In · SWORD",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LoginScreen redirectTo="/dashboard" />;
}
