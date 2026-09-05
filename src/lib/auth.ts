import { cookies } from "next/headers";

export const LEAGUE_COOKIE = "pickems_admin";

export async function isUnlocked(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(LEAGUE_COOKIE)?.value;
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && value === expected);
}

export async function requireUnlocked(): Promise<void> {
  if (!(await isUnlocked())) {
    throw new Error("Enter the league password first.");
  }
}
