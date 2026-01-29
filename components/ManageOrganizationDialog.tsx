"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization, Organization } from "@/contexts/OrganizationContext";
import { Settings, Users, Info, Plus } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";
import useUser from "@/app/hook/useUser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Member = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  status?: "active" | "pending";
  invited_at?: string;
  invited_by?: string;
};

function AddMemberForm({ onClose }: { onClose: () => void }) {
  const [emailsInput, setEmailsInput] = useState("");
  const [role, setRole] = useState<"Admin" | "Member">("Member");
  const [loading, setLoading] = useState(false);
  const { selectedOrganization } = useOrganization();
  const { data: user } = useUser();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const parseEmails = (input: string) => {
    const parts = input
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    // keep user intent order, de-dupe by normalized email
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const p of parts) {
      const normalized = p.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      unique.push(p);
    }
    return unique;
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization || !user) return;
    const emails = parseEmails(emailsInput);
    if (emails.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }
    const invalidEmails = emails.filter((em) => !isValidEmail(em.trim()));
    if (invalidEmails.length > 0) {
      toast.error(
        `Invalid email${invalidEmails.length > 1 ? "s" : ""}: ${invalidEmails
          .slice(0, 3)
          .join(", ")}${invalidEmails.length > 3 ? "…" : ""}`,
      );
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/organizations/${selectedOrganization.id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emails,
            role,
            user_id: user.id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add member");
      }

      const result = (await response.json()) as {
        message?: string;
        results?: { email: string; status: string; error?: string }[];
        successCount?: number;
        errorCount?: number;
      };

      const errorResults = (result.results || []).filter(
        (r) => r.status === "error",
      );
      const successCount =
        typeof result.successCount === "number"
          ? result.successCount
          : Math.max(0, emails.length - errorResults.length);

      if (errorResults.length === 0) {
        toast.success(result.message || "Member(s) added successfully");
        onClose();
      } else {
        toast.success(`Processed ${successCount}/${emails.length} email(s)`);
        toast.error(
          `Failed: ${errorResults
            .slice(0, 3)
            .map((r) => r.email)
            .join(", ")}${errorResults.length > 3 ? "…" : ""}`,
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const parsedEmails = parseEmails(emailsInput);
  const invalidCount = parsedEmails.filter((e) => !isValidEmail(e)).length;

  return (
    <form onSubmit={addMember} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="emails">Emails</Label>
        <Input
          id="emails"
          type="text"
          placeholder="member1@example.com, member2@example.com"
          value={emailsInput}
          onChange={(e) => setEmailsInput(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Separate multiple emails with commas.
          {parsedEmails.length > 1 && (
            <span className={invalidCount ? "text-destructive" : ""}>
              {" "}
              ({parsedEmails.length} detected
              {invalidCount ? `, ${invalidCount} invalid` : ""})
            </span>
          )}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={role}
          onValueChange={(value: "Admin" | "Member") => setRole(value)}
          disabled={selectedOrganization?.role !== "Owner"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Member">Member</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {selectedOrganization?.role !== "Owner"
            ? "Only owners can add admins"
            : "Admins can manage members and view all data"}
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10"
          disabled={loading || parsedEmails.length === 0 || invalidCount > 0}
        >
          {loading ? "Adding..." : "Add Member"}
        </Button>
      </div>
    </form>
  );
}

export function ManageOrganizationDialog() {
  const { data: user } = useUser();
  const { selectedOrganization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [orgName, setOrgName] = useState(selectedOrganization?.name || "");
  const [showAddMember, setShowAddMember] = useState(false);
  const [removingInviteId, setRemovingInviteId] = useState<string | null>(null);
  const [deletingOrg, setDeletingOrg] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    memberId: string;
    newRole: string;
    memberName: string;
  } | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!selectedOrganization) return;

    try {
      const response = await fetch(
        `/api/organizations/${selectedOrganization.id}/members`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }

      const data = await response.json();
      setMembers(data);
    } catch (error) {
      toast.error("Failed to fetch organization members");
    }
  }, [selectedOrganization]);

  useEffect(() => {
    if (open && selectedOrganization) {
      fetchMembers();
    }
  }, [open, selectedOrganization, fetchMembers]);

  const removeMember = async (memberId: string) => {
    if (!selectedOrganization || !user) return;

    try {
      setRemovingMemberId(memberId);
      const response = await fetch(
        `/api/organizations/${selectedOrganization.id}/remove-member`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ deleteId: memberId, user_id: user.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }

      // Update the local state to remove the member
      setMembers(members.filter((member) => member.id !== memberId));
      toast.success("Member removed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const updateOrganization = async () => {
    if (!selectedOrganization || !user) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/organizations/${selectedOrganization.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: orgName, user_id: user.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update organization");
      }

      toast.success("Organization updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update organization");
    } finally {
      setLoading(false);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    if (!selectedOrganization || !user) return;

    try {
      setRemovingInviteId(inviteId);
      const response = await fetch(
        `/api/organizations/${selectedOrganization.id}/invites/${inviteId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: user.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete invite");
      }

      // Update the local state to remove the invite
      setMembers(members.filter((member) => member.id !== inviteId));
      toast.success("Invite deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete invite");
    } finally {
      setRemovingInviteId(null);
    }
  };

  const deleteOrganization = async () => {
    if (!selectedOrganization || !user) return;

    try {
      setDeletingOrg(true);
      const response = await fetch(
        `/api/organizations/${selectedOrganization.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: user.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete organization");
      }

      toast.success("Organization deleted successfully");
      setOpen(false);
      // Refresh the page to update the organization list
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete organization");
    } finally {
      setDeletingOrg(false);
      setShowDeleteConfirm(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    if (!selectedOrganization || !user) return;

    try {
      setUpdatingRoleId(memberId);
      const response = await fetch(
        `/api/organizations/${selectedOrganization.id}/update-role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            target_user_id: memberId,
            new_role: newRole,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      toast.success("Role updated successfully");
      setShowOwnerConfirm(false);
      setPendingRoleChange(null);
      
      // Refresh members list
      await fetchMembers();
      
      // If role changed to Owner, refresh the page to update organization context
      if (newRole === "Owner") {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRoleChange = (memberId: string, memberName: string, newRole: string) => {
    if (newRole === "Owner") {
      // Show confirmation dialog for Owner role
      setPendingRoleChange({ memberId, newRole, memberName });
      setShowOwnerConfirm(true);
    } else {
      // Directly update for non-Owner roles
      updateMemberRole(memberId, newRole);
    }
  };

  const confirmOwnerChange = () => {
    if (pendingRoleChange) {
      updateMemberRole(
        pendingRoleChange.memberId,
        pendingRoleChange.newRole
      );
    }
  };

  // Sort members with owner first, then by role and name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === "Owner" && b.role !== "Owner") return -1;
    if (a.role !== "Owner" && b.role === "Owner") return 1;
    if (a.role === "Admin" && b.role === "Member") return -1;
    if (a.role === "Member" && b.role === "Admin") return 1;
    // Compare names if both exist, otherwise fall back to email
    const nameA = a.name || a.email;
    const nameB = b.name || b.email;
    return nameA.localeCompare(nameB);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Manage Organization</span>
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Manage Organization</DialogTitle>
          <DialogDescription>
            Manage your organization settings, members, and more.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="details"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="details"
            className="flex-1 mt-0 border-none data-[state=active]:flex data-[state=active]:flex-col overflow-y-auto px-6 py-4"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="orgName" className="text-right">
                  Organization Name
                </Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="col-span-3"
                  disabled={selectedOrganization?.role !== "Owner"}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Owner</Label>
                <div className="col-span-3">
                  {members.find((member) => member.role === "Owner")?.email}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Created</Label>
                <div className="col-span-3">
                  {selectedOrganization?.created_at &&
                    new Date(
                      selectedOrganization.created_at
                    ).toLocaleDateString()}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="members"
            className="flex-1 mt-0 border-none data-[state=active]:flex data-[state=active]:flex-col overflow-y-auto px-6 py-4"
          >
            {showAddMember ? (
              <AddMemberForm
                onClose={() => {
                  setShowAddMember(false);
                  fetchMembers(); // Refresh the members list
                }}
              />
            ) : (
              <>
                {(selectedOrganization?.role === "Owner" ||
                  selectedOrganization?.role === "Admin") && (
                  <div className="flex-none mb-4">
                    <Button
                      onClick={() => setShowAddMember(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add member</span>
                    </Button>
                  </div>
                )}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {sortedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div>
                        <p className="font-medium">
                          {member.name || member.email}
                        </p>
                        {member.name && (
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        )}
                        {member.status === "pending" && (
                          <p className="text-sm text-orange-400">
                            Invited{" "}
                            {new Date(member.invited_at!).toLocaleDateString()}{" "}
                            by {member.invited_by}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {member.status === "pending" ? (
                          <>
                            <span
                              className={cn(
                                "text-sm px-2 py-1 rounded",
                                "bg-orange-500/10 text-orange-400"
                              )}
                            >
                              Pending {member.role}
                            </span>
                            {(selectedOrganization?.role === "Owner" ||
                              selectedOrganization?.role === "Admin") && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteInvite(member.id)}
                                disabled={removingInviteId === member.id}
                              >
                                {removingInviteId === member.id
                                  ? "Deleting..."
                                  : "Delete Invite"}
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            {selectedOrganization?.role === "Owner" &&
                            member.id !== user?.id ? (
                              <Select
                                value={member.role}
                                onValueChange={(newRole) =>
                                  handleRoleChange(
                                    member.id,
                                    member.name || member.email,
                                    newRole
                                  )
                                }
                                disabled={updatingRoleId === member.id}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Member">Member</SelectItem>
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Owner">Owner</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span
                                className={cn(
                                  "text-sm px-2 py-1 rounded",
                                  "bg-blue-500/10 text-blue-400"
                                )}
                              >
                                {member.role}
                              </span>
                            )}
                            {selectedOrganization?.role === "Owner" &&
                              member.id !== user?.id &&
                              member.role !== "Owner" && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeMember(member.id)}
                                  disabled={removingMemberId === member.id}
                                >
                                  {removingMemberId === member.id
                                    ? "Removing..."
                                    : "Remove"}
                                </Button>
                              )}
                            {selectedOrganization?.role === "Admin" &&
                              member.role === "Member" &&
                              member.id !== user?.id && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeMember(member.id)}
                                  disabled={removingMemberId === member.id}
                                >
                                  {removingMemberId === member.id
                                    ? "Removing..."
                                    : "Remove"}
                                </Button>
                              )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent
            value="settings"
            className="flex-1 mt-0 border-none data-[state=active]:flex data-[state=active]:flex-col overflow-y-auto px-6 py-4"
          >
            <div className="space-y-4">
              {selectedOrganization?.role === "Owner" && (
                <>
                  <Button
                    onClick={updateOrganization}
                    disabled={loading || orgName === selectedOrganization?.name}
                    className="w-full"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>

                  {showDeleteConfirm ? (
                    <div className="space-y-4 p-4 border border-red-500/30 rounded-lg bg-red-500/10">
                      <p className="text-sm text-red-400 font-medium">
                        Are you sure you want to delete this organization? This
                        action cannot be undone.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deletingOrg}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={deleteOrganization}
                          disabled={deletingOrg}
                        >
                          {deletingOrg ? "Deleting..." : "Yes, Delete"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete Organization
                    </Button>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog open={showOwnerConfirm} onOpenChange={setShowOwnerConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Organization Ownership</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to make{" "}
              <strong>{pendingRoleChange?.memberName}</strong> the owner of this
              organization? This action cannot be undone. You will become an Admin
              after the transfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowOwnerConfirm(false);
                setPendingRoleChange(null);
              }}
              disabled={!!updatingRoleId}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmOwnerChange}
              disabled={!!updatingRoleId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updatingRoleId ? "Transferring..." : "Transfer Ownership"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
