import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** Returns the app User for the signed-in Supabase user, creating it on first sign-in. */
export const getUserOrNull = cache(async () => {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const fallbackName = authUser.email ? authUser.email.split("@")[0] : null;
  return prisma.user.upsert({
    where: { authId: authUser.id },
    update: {},
    create: {
      authId: authUser.id,
      email: authUser.email ?? `${authUser.id}@no-email.local`,
      name: (authUser.user_metadata?.name as string | undefined) || fallbackName,
    },
  });
});

export async function requireUser() {
  const user = await getUserOrNull();
  if (!user) redirect("/login");
  return user;
}
