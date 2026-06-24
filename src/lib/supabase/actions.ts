"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { geocodeLocationLabel } from "@/lib/geocode";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deleteTripForCurrentUser,
  duplicateTripForCurrentUser,
  setTripSharingForCurrentUser,
  updateTripForCurrentUser,
} from "@/lib/supabase/data";
import {
  profileSchema,
  tripDuplicateRequestSchema,
  tripShareRequestSchema,
  tripUpdateRequestSchema,
} from "@/lib/validation";

export async function signInWithPassword(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=missing-supabase");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=auth-failed");

  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=missing-supabase");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect("/login?error=signup-failed");

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

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse({
    seasons: formData.get("seasons"),
    abilityLevel: formData.get("abilityLevel"),
    rentsGear: formData.get("rentsGear") === "on",
    homeLocationLabel: formData.get("homeLocationLabel"),
    passAffiliations: formData.getAll("passAffiliations"),
  });

  if (!parsed.success) {
    redirect("/onboarding?error=invalid-profile");
  }

  const geocoded = geocodeLocationLabel(parsed.data.homeLocationLabel);
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    seasons: parsed.data.seasons,
    ability_level: parsed.data.abilityLevel,
    rents_gear: parsed.data.rentsGear,
    home_location_label: parsed.data.homeLocationLabel,
    home_latitude: geocoded?.latitude ?? null,
    home_longitude: geocoded?.longitude ?? null,
    pass_affiliations: parsed.data.passAffiliations,
    onboarding_completed_at: new Date().toISOString(),
  });

  if (error) redirect("/onboarding?error=profile-save-failed");

  revalidatePath("/");
  redirect("/plan");
}

export async function renameTrip(formData: FormData) {
  const id = String(formData.get("tripId") ?? "");
  const parsed = tripUpdateRequestSchema.safeParse({
    title: formData.get("title"),
  });

  if (!id || !parsed.success) redirect("/trips?error=invalid-trip-update");

  const { error } = await updateTripForCurrentUser(id, parsed.data);
  if (error) redirect("/trips?error=trip-update-failed");

  revalidateTripViews(id);
}

export async function archiveTrip(formData: FormData) {
  await setTripStatus(formData, "archived");
}

export async function restoreTrip(formData: FormData) {
  await setTripStatus(formData, "active");
}

export async function deleteTrip(formData: FormData) {
  const id = String(formData.get("tripId") ?? "");
  if (!id) redirect("/trips?error=missing-trip");

  const { error } = await deleteTripForCurrentUser(id);
  if (error) redirect("/trips?error=trip-delete-failed");

  revalidatePath("/trips");
  redirect("/trips");
}

export async function duplicateTrip(formData: FormData) {
  const id = String(formData.get("tripId") ?? "");
  const parsed = tripDuplicateRequestSchema.safeParse({
    title: formData.get("title") || undefined,
  });

  if (!id || !parsed.success) redirect("/trips?error=invalid-duplicate");

  const { tripId, error } = await duplicateTripForCurrentUser(id, parsed.data.title);
  if (error || !tripId) redirect("/trips?error=trip-duplicate-failed");

  revalidatePath("/trips");
  redirect(`/trips/${tripId}`);
}

export async function updateTripSharing(formData: FormData) {
  const id = String(formData.get("tripId") ?? "");
  const parsed = tripShareRequestSchema.safeParse({
    isPublic: formData.get("isPublic") === "true",
  });

  if (!id || !parsed.success) redirect("/trips?error=invalid-share-update");

  const { error } = await setTripSharingForCurrentUser(id, parsed.data.isPublic);
  if (error) redirect("/trips?error=trip-share-failed");

  revalidateTripViews(id);
}

async function setTripStatus(formData: FormData, status: "active" | "archived") {
  const id = String(formData.get("tripId") ?? "");
  const parsed = tripUpdateRequestSchema.safeParse({ status });

  if (!id || !parsed.success) redirect("/trips?error=invalid-trip-status");

  const { error } = await updateTripForCurrentUser(id, parsed.data);
  if (error) redirect("/trips?error=trip-update-failed");

  revalidateTripViews(id);
}

function revalidateTripViews(id: string) {
  revalidatePath("/trips");
  revalidatePath(`/trips/${id}`);
  redirect("/trips");
}
