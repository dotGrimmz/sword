import { notFound } from "next/navigation";

import { PRE_READ_SELECT } from "@/lib/study/normalize";
import { createClient } from "@/lib/supabase/server";
import type { HostProfile, PreRead } from "@/types/pre-read";

const HOST_SELECT = `
  id,
  username,
  avatar_url,
  stream_tagline,
  stream_url,
  is_host_active,
  role
`;

/** Server-side loaders — query Supabase directly (no HTTP self-fetch). */
export async function fetchPreReads(): Promise<PreRead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pre_reads")
    .select(PRE_READ_SELECT)
    .order("week_start", { ascending: false, nullsFirst: false })
    .order("visible_from", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PreRead[];
}

export async function fetchPreRead(id: string): Promise<PreRead> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pre_reads")
    .select(PRE_READ_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  return data as PreRead;
}

export async function fetchHostProfiles(options?: {
  activeOnly?: boolean;
}): Promise<HostProfile[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(HOST_SELECT)
    .in("role", ["host", "admin"])
    .order("username", { ascending: true, nullsFirst: false });

  if (options?.activeOnly) {
    query = query.or("role.eq.admin,and(role.eq.host,is_host_active.eq.true)");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as HostProfile[];
}
