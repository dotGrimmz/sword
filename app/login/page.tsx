import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-slate-900"
        >
          <Image src="/file.svg" width={28} height={28} alt="SWORD" priority />
          <span>SWORD</span>
        </Link>
        <Link
          href="/"
          className="rounded-full border border-transparent bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          Back to Home
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <section className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
              SWORD Bible Study
            </p>
            <h1 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
              Study Scripture with focus and clarity.
            </h1>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Sign in to sync your notes, highlights, and reading progress
              across devices. Join the community of students digging deeper into
              the Word.
            </p>
            <div className="mt-8 grid gap-4 text-left text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
                <h2 className="text-sm font-semibold text-slate-900">
                  Personal Notes
                </h2>
                <p className="mt-2 text-slate-600">
                  Capture insights and prayers alongside every passage.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
                <h2 className="text-sm font-semibold text-slate-900">
                  Cross-Platform
                </h2>
                <p className="mt-2 text-slate-600">
                  Pick up where you left off on any device, anytime.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md lg:mx-0">
            <AuthForm />
          </section>
        </div>
      </main>
    </div>
  );
}
