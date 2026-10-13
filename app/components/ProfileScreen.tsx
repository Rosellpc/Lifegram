"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/client";
import { defaultAvatar } from "../utils/assets";
import {
  fetchFollowingIds,
  fetchProfileById,
  fetchPostsByIds,
  fetchSavedPostIds,
  fetchPostsBundle,
} from "../utils/social";
import type { Post } from "../mocks/posts";

type ProfileData = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ViewMode = "posts" | "saved";

export default function ProfileScreen({
  profileId,
}: {
  profileId: string;
}) {
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [mode, setMode] = useState<ViewMode>("posts");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    full_name: "",
    bio: "",
    website: "",
    avatar_url: "",
  });

  const isOwnProfile = useMemo(() => viewerId === profileId, [viewerId, profileId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setViewerId(user.id);

      const [profileData, profilePosts, followingIds, viewerSavedIds] = await Promise.all([
        fetchProfileById(supabase, profileId),
        fetchPostsBundle(supabase, { viewerId: user.id, userIds: [profileId] }),
        fetchFollowingIds(supabase, user.id),
        profileId === user.id ? fetchSavedPostIds(supabase, user.id) : Promise.resolve(new Set<string>()),
      ]);

      const followersRows = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profileId);

      const followingRows = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", profileId);

      if (followersRows.error) throw followersRows.error;
      if (followingRows.error) throw followingRows.error;

      if (!active) {
        return;
      }

      setProfile(profileData as ProfileData);
      setPosts(profilePosts);
      setSavedPosts(
        profileId === user.id && viewerSavedIds.size
          ? await fetchPostsByIds(supabase, Array.from(viewerSavedIds), user.id)
          : []
      );
      setFollowersCount(followersRows.data?.length ?? 0);
      setFollowingCount(followingRows.data?.length ?? 0);
      setIsFollowing(followingIds.includes(profileId));
      setEditForm({
        username: profileData?.username || "",
        full_name: profileData?.full_name || "",
        bio: profileData?.bio || "",
        website: profileData?.website || "",
        avatar_url: profileData?.avatar_url || "",
      });
      setLoading(false);
    };

    load().catch((error) => {
      console.error("Error al cargar el perfil:", error);
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [profileId, router]);

  const handleFollowToggle = async () => {
    if (!viewerId || viewerId === profileId) {
      return;
    }

    setSaving(true);
    setMessage(null);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", viewerId)
        .eq("following_id", profileId);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setIsFollowing(false);
      setFollowersCount((count) => Math.max(0, count - 1));
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: viewerId,
        following_id: profileId,
      });

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setIsFollowing(true);
      setFollowersCount((count) => count + 1);

      if (profileId !== viewerId) {
        await supabase.from("notifications").insert({
          recipient_id: profileId,
          actor_id: viewerId,
          type: "follow",
        });
      }
    }

    setSaving(false);
  };

  const handleSaveProfile = async () => {
    if (!viewerId || !profile || viewerId !== profileId) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = {
      username: editForm.username.trim(),
      full_name: editForm.full_name.trim() || null,
      bio: editForm.bio.trim() || null,
      website: editForm.website.trim() || null,
      avatar_url: editForm.avatar_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", viewerId);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setProfile((current) =>
      current
        ? {
            ...current,
            ...payload,
          }
        : current
    );
    setMessage("Perfil actualizado");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card-bg p-6 text-sm text-foreground/60">
        Cargando perfil...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card-bg p-8 text-center text-sm text-foreground/60">
        No encontramos este perfil.
      </div>
    );
  }

  const activePosts = mode === "posts" ? posts : savedPosts;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card-bg p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-primary/20">
            <Image
              src={profile.avatar_url || defaultAvatar}
              alt={profile.username || "profile"}
              fill
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{profile.username || "default_user"}</h1>
                <p className="text-sm text-foreground/60">{profile.full_name || "Sin nombre"}</p>
              </div>

              {!isOwnProfile ? (
                <button
                  onClick={handleFollowToggle}
                  disabled={saving}
                  className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isFollowing ? "Siguiendo" : "Seguir"}
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="font-bold text-foreground">{posts.length}</div>
                <div className="text-foreground/50">posts</div>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="font-bold text-foreground">{followersCount}</div>
                <div className="text-foreground/50">followers</div>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="font-bold text-foreground">{followingCount}</div>
                <div className="text-foreground/50">following</div>
              </div>
            </div>

            {profile.bio ? <p className="mt-4 whitespace-pre-line text-sm text-foreground/80">{profile.bio}</p> : null}
            {profile.website ? (
              <a href={profile.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary">
                {profile.website}
              </a>
            ) : null}

            {message ? <p className="mt-3 text-sm text-foreground/60">{message}</p> : null}
          </div>
        </div>

        {isOwnProfile ? (
          <div className="mt-6 grid gap-3 border-t border-border pt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Username
                <input
                  value={editForm.username}
                  onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-primary"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Nombre
                <input
                  value={editForm.full_name}
                  onChange={(event) => setEditForm((current) => ({ ...current, full_name: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-primary"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Bio
              <textarea
                rows={3}
                value={editForm.bio}
                onChange={(event) => setEditForm((current) => ({ ...current, bio: event.target.value }))}
                className="rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Website
                <input
                  value={editForm.website}
                  onChange={(event) => setEditForm((current) => ({ ...current, website: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-primary"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Avatar URL
                <input
                  value={editForm.avatar_url}
                  onChange={(event) => setEditForm((current) => ({ ...current, avatar_url: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-primary"
                />
              </label>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Guardar cambios
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card-bg shadow-sm">
        <div className="flex border-b border-border">
          <button
            onClick={() => setMode("posts")}
            className={`flex-1 px-4 py-3 text-sm font-semibold ${
              mode === "posts" ? "text-primary" : "text-foreground/50"
            }`}
          >
            Posts
          </button>
          {isOwnProfile ? (
            <button
              onClick={() => setMode("saved")}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${
                mode === "saved" ? "text-primary" : "text-foreground/50"
              }`}
            >
              Guardados
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-1 p-1">
          {activePosts.length ? (
            activePosts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`} className="relative aspect-square overflow-hidden">
                <Image src={post.image_url || defaultAvatar} alt={post.caption} fill className="object-cover" />
              </Link>
            ))
          ) : (
            <div className="col-span-3 p-8 text-center text-sm text-foreground/60">
              No hay publicaciones para mostrar.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
