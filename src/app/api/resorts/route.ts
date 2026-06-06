import { NextResponse } from "next/server";
import { resorts } from "@/lib/resorts";

export async function GET() {
  return NextResponse.json({ resorts });
}
