import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = supabaseBrowser();
  const { id: organizationId } = req.query;
  const { name, user_id } = req.body;

  if (!organizationId || !user_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (req.method === "PUT") {
    try {
      // Check if the user making the request has Owner role
      const { data: membership, error: membershipError } = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId.toString())
        .eq("user_id", user_id)
        .single();

      if (membershipError || !membership || membership.role !== "Owner") {
        return res
          .status(403)
          .json({ error: "Only owners can update organization details" });
      }

      // Update the organization
      const { data, error } = await supabase
        .from("organizations")
        .update({ name })
        .eq("id", organizationId.toString())
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Check if user is the owner
      const { data: membership, error: membershipError } = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId.toString())
        .eq("user_id", user_id)
        .single();

      if (membershipError || !membership || membership.role !== "Owner") {
        return res
          .status(403)
          .json({ error: "Only owners can delete organizations" });
      }

      // Delete the organization (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId.toString());

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
