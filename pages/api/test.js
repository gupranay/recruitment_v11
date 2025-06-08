import { supabaseServer } from "@/lib/supabase/server";

// inside handler
const supabase = supabaseServer();

const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  console.log(authError);
}

console.log(user);
