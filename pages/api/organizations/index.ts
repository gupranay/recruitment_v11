import { supabaseApi } from "@/lib/supabase/api";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // This endpoint intentionally derives identity from the authenticated session/cookie.
  // It rejects forged identity fields coming from the client.
  const body = req.body as unknown;
  const forbiddenIdentityKeys = [
    "user",
    "id",
    "user_id",
    "owner_id",
    "ownerId",
    "userId",
    "email",
    "uid",
  ] as const;

  const hasForbiddenIdentity = (value: unknown) => {
    if (!value || typeof value !== "object") return false;
    const obj = value as Record<string, unknown>;
    const topLevelForbidden = forbiddenIdentityKeys.some((k) =>
      Object.prototype.hasOwnProperty.call(obj, k)
    );
    // Common pattern: client sends `{ user: { id, ... } }`
    const nestedUser =
      Object.prototype.hasOwnProperty.call(obj, "user") && typeof obj.user === "object"
        ? (obj.user as Record<string, unknown>)
        : null;
    const nestedForbidden = nestedUser
      ? forbiddenIdentityKeys.some((k) => Object.prototype.hasOwnProperty.call(nestedUser, k))
      : false;
    return topLevelForbidden || nestedForbidden;
  };

  if (body !== undefined && body !== null) {
    let parsedBody: unknown = body;

    // Some clients/framework paths can send an empty string for "no body" POSTs.
    // Treat empty payload as valid for this endpoint.
    if (typeof body === "string") {
      const trimmedBody = body.trim();
      if (trimmedBody.length === 0) {
        parsedBody = null;
      } else {
        try {
          parsedBody = JSON.parse(trimmedBody);
        } catch {
          return res.status(400).json({ error: "Invalid request payload" });
        }
      }
    }

    if (hasForbiddenIdentity(parsedBody)) {
      console.warn("Rejected forged identity payload on /api/organizations", {
        method: req.method,
      });
      return res.status(400).json({ error: "Invalid request payload" });
    }
  }

  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn("Unauthorized request to /api/organizations");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Fetch organizations where the authenticated user is a part of (via organization_users table)
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
      .eq("user_id", user.id);
    
    const { data: memberOrganizations, error: memberFetchError } = memberResult as {
      data: MemberOrganization[] | null;
      error: any;
    };

    if (memberFetchError || !memberOrganizations) {
      console.error("Failed to fetch organizations:", memberFetchError);
      return res.status(500).json({ error: "Failed to fetch organizations" });
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
