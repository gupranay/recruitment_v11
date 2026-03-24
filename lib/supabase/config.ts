export function getSupabaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!url) {
    throw new Error(
      "Supabase URL is not set. Please define NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in your environment."
    );
  }

  return url;
}

export function getSupabaseAnonKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      "Supabase anon key is not set. Please define NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY in your environment."
    );
  }

  return key;
}

