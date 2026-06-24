import { NextResponse } from "next/server";
import type { ZodError } from "zod";

const defaultMaxJsonBodyBytes = 64 * 1024;

export function apiError(
  error: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(details ? { error, details } : { error }, { status });
}

export async function parseJsonBody(request: Request, maxBytes = defaultMaxJsonBodyBytes) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { data: null, error: "Request body is too large", status: 413 };
    }
  }

  try {
    const text = await request.text();
    const bytes = new TextEncoder().encode(text).byteLength;

    if (bytes > maxBytes) {
      return { data: null, error: "Request body is too large", status: 413 };
    }

    return { data: JSON.parse(text), error: null, status: undefined };
  } catch {
    return { data: null, error: "Malformed JSON request body", status: 400 };
  }
}

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
