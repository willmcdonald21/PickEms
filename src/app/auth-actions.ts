"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LEAGUE_COOKIE } from "@/lib/auth";

/** Only same-site absolute paths, so a crafted form can't turn this into an open redirect. */
function safePath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function unlock(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const to = safePath(formData.get("redirectTo"));

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    redirect(`${to}?msg=${encodeURIComponent("Incorrect password.")}`);
  }

  const store = await cookies();
  store.set(LEAGUE_COOKIE, password, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  });

  redirect(to);
}

export async function lock(formData: FormData) {
  const to = safePath(formData.get("redirectTo"));
  const store = await cookies();
  store.delete(LEAGUE_COOKIE);
  redirect(to);
}
