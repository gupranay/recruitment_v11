"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Crown,
  LogOut,
  Mail,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import useUser from "@/app/hook/useUser";
import type { Organization } from "@/contexts/OrganizationContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase/browser";

function profileInitials(
  fullName: string | null | undefined,
  email: string | undefined
) {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function ProfilePage() {
  const { data: user, isFetching: userLoading } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    const supabase = supabaseBrowser();
    queryClient.clear();
    await supabase.auth.signOut();
    router.refresh();
    router.replace("/auth?next=%2Fprofile");
  }, [queryClient, router]);

  const fetchOrganizations = useCallback(async () => {
    if (!user?.id) {
      setOrganizations([]);
      setOrgsLoading(false);
      return;
    }
    setOrgsLoading(true);
    setOrgsError(null);
    try {
      const response = await fetch("/api/organizations", { method: "POST" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          typeof err?.error === "string" ? err.error : "Failed to load organizations"
        );
      }
      const data: Organization[] = await response.json();
      setOrganizations(data);
    } catch (e) {
      setOrgsError(e instanceof Error ? e.message : "Something went wrong");
      setOrganizations([]);
    } finally {
      setOrgsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (userLoading) return;
    void fetchOrganizations();
  }, [userLoading, fetchOrganizations]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Skeleton className="mb-8 h-9 w-40" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="mt-8 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground text-center text-sm">
          You need to sign in to view your profile.
        </p>
        <Button asChild>
          <Link href="/auth?next=%2Fprofile">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2 text-muted-foreground hover:text-foreground">
            <Link href="/dash">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border bg-card shadow-sm",
            "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(900px_circle_at_0%_-20%,hsl(var(--primary)/0.12),transparent_55%)]"
          )}
        >
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
            <Avatar className="h-24 w-24 shrink-0 ring-4 ring-background shadow-md">
              <AvatarImage
                src={
                  typeof user.avatar_url === "string" && user.avatar_url.trim()
                    ? user.avatar_url.trim()
                    : undefined
                }
                alt={user.full_name?.trim() || user.email || "Profile"}
              />
              <AvatarFallback className="font-display text-2xl font-semibold">
                {profileInitials(user.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {user.full_name?.trim() || "Your profile"}
              </h1>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Member since <span className="text-foreground/80">{formatDate(user.created_at)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Organizations
            </h2>
          </div>
          <Separator className="mb-6" />

          {orgsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : orgsError ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-destructive">{orgsError}</p>
                <Button variant="outline" size="sm" onClick={() => void fetchOrganizations()}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : organizations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No organizations yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Create one from the dashboard or ask an org owner to invite you.
                </p>
                <Button asChild className="mt-2" variant="secondary">
                  <Link href="/dash">Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-1">
              {organizations.map((org) => {
                const isOwner = org.owner_id === user.id;
                return (
                  <li key={org.id}>
                    <Card className="overflow-hidden border transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold">
                              {org.name}
                            </span>
                            {isOwner ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 font-normal"
                              >
                                <Crown className="h-3 w-3" />
                                Owner
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="font-normal">
                                {org.role}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Org created {formatDate(org.created_at)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
