import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiError(
  error: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(details ? { error, details } : { error }, { status });
}

export async function parseJsonBody(request: Request) {
  try {
    return { data: await request.json(), error: null };
  } catch {
    return { data: null, error: "Malformed JSON request body" };
  }
}

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
