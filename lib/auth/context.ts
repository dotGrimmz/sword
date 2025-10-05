import { NextResponse } from "next/server";

const USER_ID_HEADER = "x-user-id";

export const getUserIdFromRequest = (request: Request): string | null => {
  const header = request.headers.get(USER_ID_HEADER);

  if (!header) {
    return null;
  }

  const trimmed = header.trim();

  return trimmed.length === 0 ? null : trimmed;
};

export const unauthorizedResponse = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export const userIdHeaderName = USER_ID_HEADER;
