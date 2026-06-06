import { NextResponse } from "next/server";
import { getResortById } from "@/lib/resorts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resort = getResortById(id);

  if (!resort) {
    return NextResponse.json({ error: "Resort not found" }, { status: 404 });
  }

  return NextResponse.json({ resort });
}
