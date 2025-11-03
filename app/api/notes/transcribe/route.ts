import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const runtime = "nodejs";

type OpenAIErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
};

const FORBIDDEN_STATUS = new Set([401, 403]);

const handleOpenAIError = async (response: Response) => {
  let errorType: string | undefined;
  let errorMessage: string | undefined;

  try {
    const data = (await response.json()) as OpenAIErrorResponse;
    errorType = data?.error?.type;
    errorMessage = data?.error?.message;
  } catch {
    // ignore parsing failures
  }

  if (errorType === "insufficient_quota") {
    return NextResponse.json(
      { error: "Voice note service temporarily unavailable." },
      { status: 503 }
    );
  }

  if (response.status === 429) {
    return NextResponse.json(
      { error: "Rate limit reached, please retry soon." },
      { status: 429 }
    );
  }

  if (FORBIDDEN_STATUS.has(response.status)) {
    return NextResponse.json(
      { error: "API authentication failed." },
      { status: response.status }
    );
  }

  const fallback =
    errorMessage && errorMessage.length > 0
      ? errorMessage
      : "Failed to process voice note.";

  return NextResponse.json(
    { error: fallback },
    { status: response.status >= 400 ? response.status : 500 }
  );
};

const buildJSONSchema = () => ({
  type: "json_schema",
  json_schema: {
    name: "voice_note_parse",
    schema: {
      type: "object",
      properties: {
        reference: {
          type: ["object", "null"],
          nullable: true,
          properties: {
            book: { type: "string" },
            chapter: { type: "integer" },
            verseStart: { type: ["integer", "null"], nullable: true },
            verseEnd: { type: ["integer", "null"], nullable: true },
          },
          required: ["book", "chapter"],
          additionalProperties: false,
        },
        bodyText: { type: "string" },
        transcript: { type: "string" },
      },
      required: ["bodyText", "transcript"],
      additionalProperties: false,
    },
  },
});

export async function POST(request: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI key missing or invalid." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Audio file missing from request." },
      { status: 400 }
    );
  }

  const audioArrayBuffer = await file.arrayBuffer();
  const audioBlob = new Blob([audioArrayBuffer], {
    type: file.type || "audio/webm",
  });

  const audioForm = new FormData();
  audioForm.append("model", "whisper-1");
  audioForm.append(
    "file",
    audioBlob,
    file.name || `voice-note.${file.type?.split("/")[1] ?? "webm"}`
  );

  const transcriptionResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: audioForm,
    }
  );

  if (!transcriptionResponse.ok) {
    return handleOpenAIError(transcriptionResponse);
  }

  const transcriptionData = (await transcriptionResponse.json()) as {
    text?: string;
  };

  const transcript = transcriptionData.text?.trim();

  if (!transcript) {
    return NextResponse.json(
      { error: "Transcription failed. No text returned." },
      { status: 502 }
    );
  }

  const parseResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: buildJSONSchema(),
        messages: [
          {
            role: "system",
            content:
              "You convert transcripts of spoken Bible study notes into structured JSON. Return a JSON object with: reference (object with book, chapter, optional verseStart/verseEnd) when possible, otherwise null; bodyText summarizing the note content; transcript echoing the original words. Only return JSON.",
          },
          {
            role: "user",
            content: transcript,
          },
        ],
      }),
    }
  );

  if (!parseResponse.ok) {
    return handleOpenAIError(parseResponse);
  }

  const parseData = (await parseResponse.json()) as {
    choices?: Array<{
      message?: { content?: string };
    }>;
  };

  const content = parseData.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json(
      { error: "Parsing failed. No response from language model." },
      { status: 502 }
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json(
      { error: "Parsing failed. Invalid JSON returned by language model." },
      { status: 502 }
    );
  }

  const result = parsed as {
    reference?: {
      book: string;
      chapter: number;
      verseStart?: number | null;
      verseEnd?: number | null;
    } | null;
    bodyText?: string;
    transcript?: string;
  };

  return NextResponse.json({
    reference: result.reference ?? null,
    bodyText: result.bodyText ?? transcript,
    transcript: result.transcript ?? transcript,
  });
}
