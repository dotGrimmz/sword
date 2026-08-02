export type OpenAiMonthUsage = {
  /** Month-to-date spend in USD (from OpenAI Costs API). */
  spentUsd: number;
  /** Prepaid credit allotment in USD (default $9.99). */
  creditBalanceUsd: number;
  remainingUsd: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
  fetchedAt: string;
  startTime: number;
  endTime: number;
  projectId: string | null;
};

type CompletionsUsageResult = {
  input_tokens?: number;
  output_tokens?: number;
  num_model_requests?: number;
};

type UsageBucket = {
  results?: CompletionsUsageResult[];
};

type CompletionsUsageResponse = {
  data?: UsageBucket[];
  has_more?: boolean;
  next_page?: string | null;
};

type CostsBucketResult = {
  amount?: {
    value?: number | string;
    currency?: string;
  };
};

type CostsBucket = {
  results?: CostsBucketResult[];
};

type CostsResponse = {
  data?: CostsBucket[];
  has_more?: boolean;
  next_page?: string | null;
};

export class OpenAiUsageError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "OpenAiUsageError";
    this.status = status;
  }
}

const startOfUtcMonthUnix = (date = new Date()) =>
  Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000,
  );

/** Your prepaid OpenAI credit pack. */
const DEFAULT_CREDIT_BALANCE_USD = 9.99;

const parseCreditBalance = () => {
  const raw = process.env.OPENAI_CREDIT_BALANCE_USD?.trim();
  if (raw) {
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return DEFAULT_CREDIT_BALANCE_USD;
};

async function fetchOpenAiJson<T>(
  adminKey: string,
  path: string,
  params: URLSearchParams,
): Promise<T> {
  const response = await fetch(`https://api.openai.com${path}?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = response.statusText || "OpenAI usage request failed";
    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      if (body.error?.message) detail = body.error.message;
    } catch {
      // keep statusText
    }
    throw new OpenAiUsageError(detail, response.status >= 500 ? 502 : 400);
  }

  return (await response.json()) as T;
}

const buildMonthParams = (
  startTime: number,
  endTime: number,
  projectId: string | null,
  page?: string,
) => {
  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    bucket_width: "1d",
    limit: "31",
  });
  if (projectId) params.append("project_ids", projectId);
  if (page) params.set("page", page);
  return params;
};

async function fetchMonthCompletionsTokens(
  adminKey: string,
  startTime: number,
  endTime: number,
  projectId: string | null,
) {
  let inputTokens = 0;
  let outputTokens = 0;
  let requestCount = 0;
  let page: string | undefined;

  for (let guard = 0; guard < 12; guard += 1) {
    const payload = await fetchOpenAiJson<CompletionsUsageResponse>(
      adminKey,
      "/v1/organization/usage/completions",
      buildMonthParams(startTime, endTime, projectId, page),
    );

    for (const bucket of payload.data ?? []) {
      for (const result of bucket.results ?? []) {
        const input = Number(result.input_tokens ?? 0);
        const output = Number(result.output_tokens ?? 0);
        const requests = Number(result.num_model_requests ?? 0);
        if (Number.isFinite(input)) inputTokens += input;
        if (Number.isFinite(output)) outputTokens += output;
        if (Number.isFinite(requests)) requestCount += requests;
      }
    }

    const next =
      typeof payload.next_page === "string" && payload.next_page.trim()
        ? payload.next_page.trim()
        : null;
    if (!next || payload.has_more === false) break;
    page = next;
  }

  return { inputTokens, outputTokens, requestCount };
}

async function fetchMonthSpendUsd(
  adminKey: string,
  startTime: number,
  endTime: number,
  projectId: string | null,
) {
  let spentUsd = 0;
  let page: string | undefined;

  for (let guard = 0; guard < 12; guard += 1) {
    const payload = await fetchOpenAiJson<CostsResponse>(
      adminKey,
      "/v1/organization/costs",
      buildMonthParams(startTime, endTime, projectId, page),
    );

    for (const bucket of payload.data ?? []) {
      for (const result of bucket.results ?? []) {
        const value = Number(result.amount?.value ?? 0);
        if (Number.isFinite(value)) spentUsd += value;
      }
    }

    const next =
      typeof payload.next_page === "string" && payload.next_page.trim()
        ? payload.next_page.trim()
        : null;
    if (!next || payload.has_more === false) break;
    page = next;
  }

  return spentUsd;
}

/**
 * Live month-to-date spend + tokens against your prepaid credit balance.
 * Requires OPENAI_ADMIN_KEY (Admin API key).
 */
export async function fetchOpenAiMonthToDateUsage(): Promise<OpenAiMonthUsage> {
  const adminKey = process.env.OPENAI_ADMIN_KEY?.trim();
  if (!adminKey) {
    throw new OpenAiUsageError(
      "OPENAI_ADMIN_KEY is not configured",
      503,
    );
  }

  const projectId = process.env.OPENAI_API_PROJECT_ID?.trim() || null;
  const startTime = startOfUtcMonthUnix();
  const endTime = Math.floor(Date.now() / 1000);
  const creditBalanceUsd = parseCreditBalance();

  const [tokenUsage, spentUsd] = await Promise.all([
    fetchMonthCompletionsTokens(adminKey, startTime, endTime, projectId),
    fetchMonthSpendUsd(adminKey, startTime, endTime, projectId),
  ]);

  const remainingUsd = Math.max(0, creditBalanceUsd - spentUsd);

  return {
    spentUsd,
    creditBalanceUsd,
    remainingUsd,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    totalTokens: tokenUsage.inputTokens + tokenUsage.outputTokens,
    requestCount: tokenUsage.requestCount,
    fetchedAt: new Date().toISOString(),
    startTime,
    endTime,
    projectId,
  };
}
