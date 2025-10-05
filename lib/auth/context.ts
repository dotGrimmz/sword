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

export const getAccessTokenFromRequest = (request: Request): string | null => {
  const authorization = request.headers.get("authorization") ?? request.headers.get("Authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  return token.length === 0 ? null : token;
};

export const unauthorizedResponse = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export const userIdHeaderName = USER_ID_HEADER;
