import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    redirect("/login");
  }

  if (session) {
    redirect("/app");
  }

  redirect("/login");
}
