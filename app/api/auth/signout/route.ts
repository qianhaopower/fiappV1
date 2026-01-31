import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies(); // ← FIX: await
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.headers.set("Cache-Control", "no-store");

  for (const c of cookieStore.getAll()) {
    res.cookies.set({
      name: c.name,
      value: "",
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}
