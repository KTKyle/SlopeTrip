"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profileSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=missing-supabase");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=missing-supabase");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/onboarding?error=missing-supabase");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse({
    seasons: formData.get("seasons"),
    abilityLevel: formData.get("abilityLevel"),
    rentsGear: formData.get("rentsGear") === "on",
    homeLocationLabel: formData.get("homeLocationLabel"),
  });

  if (!parsed.success) {
    redirect("/onboarding?error=invalid-profile");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    seasons: parsed.data.seasons,
    ability_level: parsed.data.abilityLevel,
    rents_gear: parsed.data.rentsGear,
    home_location_label: parsed.data.homeLocationLabel,
    onboarding_completed_at: new Date().toISOString(),
  });

  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  redirect("/plan");
}
