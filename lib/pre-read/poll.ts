import type { SupabaseClient } from "@supabase/supabase-js";

import { getServiceRoleClient } from "@/lib/supabase/admin";

export type PollSnapshot = {
  totals: number[];
  totalVotes: number;
  userVote: number | null;
};

export const emptySnapshot = (length: number): PollSnapshot => ({
  totals: Array.from({ length }, () => 0),
  totalVotes: 0,
  userVote: null,
});

export async function fetchPollSnapshot({
  preReadId,
  optionCount,
  supabase,
  userId,
}: {
  preReadId: string;
  optionCount: number;
  supabase: SupabaseClient;
  userId: string | null;
}): Promise<PollSnapshot> {
  if (optionCount <= 0) {
    return emptySnapshot(0);
  }

  const adminClient = getServiceRoleClient();
  const totals = Array.from({ length: optionCount }, () => 0);

  type PollResponseRow = { option_index: number | null };

  const { data: responses, error } = await adminClient
    .from<PollResponseRow>("pre_read_poll_responses")
    .select("option_index")
    .eq("pre_read_id", preReadId);

  if (error) {
    throw new Error(error.message);
  }

  for (const response of responses ?? []) {
    if (
      typeof response.option_index === "number" &&
      response.option_index >= 0 &&
      response.option_index < optionCount
    ) {
      totals[response.option_index] += 1;
    }
  }

  const totalVotes = totals.reduce((sum, count) => sum + count, 0);

  let userVote: number | null = null;
  if (userId) {
    const { data: ownResponse } = await supabase
      .from("pre_read_poll_responses")
      .select("option_index")
      .eq("pre_read_id", preReadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (typeof ownResponse?.option_index === "number") {
      userVote = ownResponse.option_index;
    }
  }

  return { totals, totalVotes, userVote };
}
