"use client";

import { useState, useEffect } from "react";
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
import { TallButton } from "@/components/ui/tall-button";

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
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Member">("Member");
  const [loading, setLoading] = useState(false);
  const { selectedOrganization } = useOrganization();
  const { data: user } = useUser();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization || !user) return;
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address");
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
            email,
            role,
            user_id: user.id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add member");
      }

      const result = await response.json();
      toast.success(result.message);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={addMember} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
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
        <p className="text-sm text-gray-500">
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
          disabled={loading || !isValidEmail(email)}
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

  useEffect(() => {
    if (open && selectedOrganization) {
      fetchMembers();
    }
  }, [open, selectedOrganization?.id]);

  const fetchMembers = async () => {
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
  };

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
                  <div className="flex-none py-4">
                    <div
                      className="relative mb-8 w-full"
                      style={{ height: "200px" }}
                    >
                      <TallButton onClick={() => setShowAddMember(true)}>
                        <div className="flex flex-col items-center justify-center gap-4">
                          <Plus size={48} className="text-white" />
                          <span className="text-white text-2xl font-semibold">
                            Add Member
                          </span>
                        </div>
                      </TallButton>
                    </div>
                  </div>
                )}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {sortedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-white"
                    >
                      <div>
                        <p className="font-medium">
                          {member.name || member.email}
                        </p>
                        {member.name && (
                          <p className="text-sm text-gray-500">
                            {member.email}
                          </p>
                        )}
                        {member.status === "pending" && (
                          <p className="text-sm text-orange-600">
                            Invited{" "}
                            {new Date(member.invited_at!).toLocaleDateString()}{" "}
                            by {member.invited_by}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm px-2 py-1 rounded",
                            member.status === "pending"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {member.status === "pending"
                            ? `Pending ${member.role}`
                            : member.role}
                        </span>
                        {member.status === "pending" ? (
                          (selectedOrganization?.role === "Owner" ||
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
                          )
                        ) : (
                          <>
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
                    <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-sm text-red-800 font-medium">
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
    </Dialog>
  );
}
