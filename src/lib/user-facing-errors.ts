const errorMessages: Record<string, string> = {
  "auth-failed": "Login failed. Check your email and password, then try again.",
  "signup-failed": "Account creation failed. Check your details, then try again.",
  "missing-supabase": "Supabase is not configured for this environment.",
  "invalid-profile": "Profile details need a quick check before saving.",
  "profile-save-failed": "Profile could not be saved right now.",
  "invalid-trip-update": "Trip update details were invalid.",
  "trip-update-failed": "Trip could not be updated right now.",
  "missing-trip": "Trip could not be found.",
  "trip-delete-failed": "Trip could not be deleted right now.",
  "invalid-duplicate": "Trip duplicate details were invalid.",
  "trip-duplicate-failed": "Trip could not be duplicated right now.",
  "invalid-share-update": "Trip sharing details were invalid.",
  "trip-share-failed": "Trip sharing could not be updated right now.",
  "invalid-trip-status": "Trip status update was invalid.",
};

export function getUserFacingErrorMessage(error?: string) {
  if (!error) return null;

  const decoded = safeDecode(error).toLowerCase();
  return errorMessages[decoded] ?? "Something went wrong. Please try again.";
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
