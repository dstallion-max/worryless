import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
