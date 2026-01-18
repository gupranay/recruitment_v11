// import { supabaseBrowser } from "@/lib/supabase/browser";
// import { NextApiRequest, NextApiResponse } from "next";

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const supabase = supabaseBrowser();
//   const user = req.body;

//   const id = user.id;

//   if (!id) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }
//   console.log(id);
//   const { data, error: fetchError } = await supabase
//     .from("organizations")
//     .select("*")
//     .eq("owner_id", id);

//     console.log("data:",data);

//   if (fetchError) {
//     console.log("fetchError:", fetchError);
//     return res.status(400).json({ error: fetchError.message });
//   }

//   res.status(200).json(data);
// }

import { supabaseBrowser } from "@/lib/supabase/browser";
import { NextApiRequest, NextApiResponse } from "next";
import { Database } from "@/lib/types/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = supabaseBrowser();
  const user = req.body;

  const id = user.id;
  // console.log("id:", id);

  if (!id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Fetch organizations where the user is a part of (via organization_users table)
    type MemberOrganization = {
      organization_id: string;
      role: string;
      organizations: {
        id: string;
        name: string;
        owner_id: string;
        created_at: string;
      } | null;
    };
    
    const memberResult = await supabase
      .from("organization_users")
      .select(
        `
        organization_id,
        role,
        organizations (
          id,
          name,
          owner_id,
          created_at
        )
      `
      )
      .eq("user_id", id);
    
    const { data: memberOrganizations, error: memberFetchError } = memberResult as {
      data: MemberOrganization[] | null;
      error: any;
    };

    if (memberFetchError || !memberOrganizations) {
      console.log("memberFetchError:", memberFetchError);
      return res.status(400).json({ error: memberFetchError?.message || "Failed to fetch organizations" });
    }

    // Transform the data to include role information
    const organizations = memberOrganizations
      .filter((entry) => entry.organizations !== null)
      .map((entry) => ({
        ...entry.organizations!,
        role: entry.role,
      }));

    return res.status(200).json(organizations);
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
