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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = supabaseBrowser();
  const user = req.body;
  
  const id = user.id;

  if (!id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Fetch organizations owned by the user
    const { data: ownedOrganizations, error: ownerFetchError } = await supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", id);

    if (ownerFetchError) {
      console.log("ownerFetchError:", ownerFetchError);
      return res.status(400).json({ error: ownerFetchError.message });
    }

    // Fetch organizations where the user is a part of (via organization_users table)
    const { data: memberOrganizations, error: memberFetchError } = await supabase
      .from("organization_users")
      .select("organization_id, role")
      .eq("user_id", id);

    if (memberFetchError) {
      console.log("memberFetchError:", memberFetchError);
      return res.status(400).json({ error: memberFetchError.message });
    }

    // Get all organization IDs from the memberOrganizations result
    const organizationIds = memberOrganizations.map((entry) => entry.organization_id);

    // Fetch the details of the organizations the user is a part of
    let memberOrganizationDetails: { created_at: string | null; id: string; name: string; owner_id: string; }[] = [];
    if (organizationIds.length > 0) {
      const { data: memberDetails, error: detailsFetchError } = await supabase
        .from("organizations")
        .select("*")
        .in("id", organizationIds);
      
      if (detailsFetchError) {
        console.log("detailsFetchError:", detailsFetchError);
        return res.status(400).json({ error: detailsFetchError.message });
      }
      memberOrganizationDetails = memberDetails;
    }

    // Combine both owned organizations and member organizations
    const allOrganizations = [...ownedOrganizations, ...memberOrganizationDetails];

    return res.status(200).json(allOrganizations);
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
