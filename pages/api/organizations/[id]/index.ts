import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: organizationId } = req.query;
  const { name } = req.body;

  if (!organizationId || (req.method === "PUT" && !name)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (req.method === "PUT") {
    try {
      // First check if authenticated user is the organization owner
      const orgResult = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId.toString())
        .single();
      
      const { data: organization, error: orgError } = orgResult as {
        data: { owner_id: string } | null;
        error: any;
      };

      if (orgError || !organization) {
        return res.status(500).json({ error: "Error checking organization ownership" });
      }

      // Check if authenticated user is the actual owner
      if (organization.owner_id !== user.id) {
        // If not the owner, check their role in organization_users
        const membershipResult = await supabase
          .from("organization_users")
          .select("role")
          .eq("organization_id", organizationId.toString())
          .eq("user_id", user.id)
          .single();
        
        const { data: membership, error: membershipError } = membershipResult as {
          data: { role: string } | null;
          error: any;
        };

        if (membershipError || !membership || membership.role !== "Owner") {
          return res
            .status(403)
            .json({ error: "Only owners can update organization details" });
        }
      }

      // Update the organization
      const updateData: Database["public"]["Tables"]["organizations"]["Update"] = {
        name,
      };
      const updateQuery = (supabase
        .from("organizations") as any)
        .update(updateData)
        .eq("id", organizationId.toString())
        .select()
        .single();
      const updateResult = await updateQuery as any;
      const { data, error } = updateResult as {
        data: Database["public"]["Tables"]["organizations"]["Row"] | null;
        error: any;
      };

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      // First check if authenticated user is the organization owner
      const orgResult2 = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId.toString())
        .single();
      
      const { data: organization, error: orgError } = orgResult2 as {
        data: { owner_id: string } | null;
        error: any;
      };

      if (orgError || !organization) {
        return res.status(500).json({ error: "Error checking organization ownership" });
      }

      // Check if authenticated user is the actual owner
      if (organization.owner_id !== user.id) {
        // If not the owner, check their role in organization_users
        const membershipResult2 = await supabase
          .from("organization_users")
          .select("role")
          .eq("organization_id", organizationId.toString())
          .eq("user_id", user.id)
          .single();
        
        const { data: membership, error: membershipError } = membershipResult2 as {
          data: { role: string } | null;
          error: any;
        };

        if (membershipError || !membership || membership.role !== "Owner") {
          return res
            .status(403)
            .json({ error: "Only owners can delete organizations" });
        }
      }

      // Delete the organization (cascade will handle related records)
      const deleteQuery = (supabase
        .from("organizations") as any)
        .delete()
        .eq("id", organizationId.toString());
      const { error: deleteError } = await deleteQuery as { error: any };

      if (deleteError) throw deleteError;

      return res
        .status(200)
        .json({ message: "Organization deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
