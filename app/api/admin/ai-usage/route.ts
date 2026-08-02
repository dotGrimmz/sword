import { NextResponse } from "next/server";

import { requireMasterOnly } from "@/lib/admin/auth";
import {
  fetchOpenAiMonthToDateUsage,
  OpenAiUsageError,
} from "@/lib/ai/usage";

/**
 * GET /api/admin/ai-usage
 * Live month-to-date OpenAI completion tokens. Master role only.
 */
export async function GET(request: Request) {
  const auth = await requireMasterOnly(request);
  if (auth.error) return auth.error;

  try {
    const usage = await fetchOpenAiMonthToDateUsage();
    return NextResponse.json(usage, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    if (error instanceof OpenAiUsageError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load OpenAI usage",
      },
      { status: 500 },
    );
  }
}
