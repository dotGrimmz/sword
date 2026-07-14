import { NextResponse } from "next/server";

import { ensureProfile } from "@/lib/auth/ensure-profile";
import { sanitizeAuthNextPath } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeAuthNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set(
      "error",
      "Missing confirmation code. Try signing in, or request a new confirmation email.",
    );
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  const user = data.session?.user;
  if (user) {
    // Persist / fill profiles from provider-normalized identity (Google, email confirm, etc.).
    await ensureProfile(supabase, user);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
