"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "../utils/client";
import { getErrorMessage } from "../utils/errors";
import { defaultAvatar } from "../utils/assets";
import AvatarEditor from "./AvatarEditor";
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
  const [postsCount, setPostsCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [mode, setMode] = useState<ViewMode>("posts");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editing, setEditing] = useState(false);
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
      } = await getCurrentUser();

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
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", profileId);

      const followingRows = await supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", profileId);

      if (followersRows.error) throw followersRows.error;
      if (followingRows.error) throw followingRows.error;
      const total = await supabase.from("posts").select("id",{count:"exact",head:true}).eq("user_id",profileId);
      if (total.error) throw total.error;

      if (!active) {
        return;
      }

      setProfile(profileData as ProfileData);
      setPosts(profilePosts);
      setPostsCount(total.count ?? 0);
      setHasMore(profilePosts.length === 20);
      setSavedPosts(
        profileId === user.id && viewerSavedIds.size
          ? await fetchPostsByIds(supabase, Array.from(viewerSavedIds), user.id)
          : []
      );
      setFollowersCount(followersRows.count ?? 0);
      setFollowingCount(followingRows.count ?? 0);
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
      setMessage(getErrorMessage(error,"No se pudo cargar el perfil."));
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [profileId, router, retry]);

  const loadMorePosts = async () => {
    if (!viewerId || saving || !posts.length) return;
    setSaving(true); setMessage(null);
    try {
      const last = posts[posts.length-1];
      const more = await fetchPostsBundle(supabase,{viewerId,userIds:[profileId],before:{created_at:typeof last.created_at === "string" ? last.created_at : last.created_at.toISOString(),id:last.id}});
      setPosts(previous=>[...previous,...more.filter(post=>!previous.some(item=>item.id===post.id))]);
      setHasMore(more.length===20);
    } catch(error) {setMessage(getErrorMessage(error,"No se pudo cargar más publicaciones."));}
    finally {setSaving(false);}
  };

  const handleFollowToggle = async () => {
    if (!viewerId || viewerId === profileId || saving) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
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

    } catch(error) {setMessage(getErrorMessage(error,"No se pudo actualizar el seguimiento."));}
    finally {setSaving(false);}
  };

  const handleSaveProfile = async () => {
    if (!viewerId || !profile || viewerId !== profileId || saving || avatarBusy) {
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,40}$/.test(editForm.username.trim())) {
      setMessage("El usuario debe tener entre 3 y 40 letras, números o guiones bajos."); return;
    }
    for (const value of [editForm.website.trim(), editForm.avatar_url.trim()]) {
      if (!value) continue;
      try { if (!/^https?:$/.test(new URL(value).protocol)) throw new Error(); }
      catch {setMessage("El sitio web y el avatar deben usar una URL http o https válida.");return;}
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
      .eq("id", viewerId).select("id").single();

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
    window.dispatchEvent(new Event("lifegram:profile-updated"));
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-[24px] border border-border bg-card-bg p-6 text-sm text-foreground/60">
        Cargando perfil...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card-bg p-8 text-center text-sm text-foreground/60">
        {message || "No encontramos este perfil."}
        {message && <button className="ml-3 underline" onClick={()=>{setMessage(null);setRetry(value=>value+1);}}>Reintentar</button>}
      </div>
    );
  }

  const activePosts = mode === "posts" ? posts : savedPosts;

  return (
    <div className="flex flex-col gap-6">
      <section className="glass-panel profile-card overflow-hidden rounded-[28px] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{isOwnProfile ? "Tu perfil" : "Lifegram"}</p>
          {isOwnProfile && <button type="button" disabled={saving || avatarBusy} onClick={()=>setEditing(value=>!value)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">{editing ? "Cerrar edición" : "Editar perfil"}</button>}
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          {isOwnProfile ? <AvatarEditor profileId={profileId} currentUrl={profile.avatar_url} disabled={saving} onBusyChange={setAvatarBusy} onSaved={url=>{
            setProfile(current=>current ? {...current,avatar_url:url} : current);
            setEditForm(current=>({...current,avatar_url:url}));
          }} /> : <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-primary/20">
            <Image
              src={profile.avatar_url || defaultAvatar}
              alt={profile.username || "profile"}
              sizes="112px" fill
              className="object-cover"
            />
          </div>}

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{profile.full_name || profile.username || "Tu perfil"}</h1>
                <p className="text-sm text-foreground/60">@{profile.username || "usuario"}</p>
              </div>

              {!isOwnProfile ? (
                <button
                  onClick={handleFollowToggle}
                  disabled={saving}
                  className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isFollowing ? "Dejar de seguir" : "Seguir"}
                </button>
              ) : null}
              {!isOwnProfile && <Link href={`/messages/${profileId}`} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Mensaje</Link>}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="border-r border-border px-3 py-2 last:border-0">
                <div className="font-bold text-foreground">{postsCount}</div>
                <div className="text-[11px] text-foreground/65 sm:text-sm">publicaciones</div>
              </div>
              <div className="border-r border-border px-3 py-2 last:border-0">
                <div className="font-bold text-foreground">{followersCount}</div>
                <div className="text-[11px] text-foreground/65 sm:text-sm">seguidores</div>
              </div>
              <div className="border-r border-border px-3 py-2 last:border-0">
                <div className="font-bold text-foreground">{followingCount}</div>
                <div className="text-[11px] text-foreground/65 sm:text-sm">siguiendo</div>
              </div>
            </div>

            {profile.bio ? <p className="mt-4 whitespace-pre-line text-sm text-foreground/80">{profile.bio}</p> : null}
            {profile.website ? (
              <a href={/^https?:\/\//i.test(profile.website) ? profile.website : undefined} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary">
                {profile.website}
              </a>
            ) : null}

            {message ? <p role="status" aria-live="polite" className="mt-3 text-sm text-foreground/60">{message}</p> : null}
          </div>
        </div>

        {isOwnProfile && editing ? (
          <div className="mt-6 grid gap-3 border-t border-border pt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Usuario
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
                Sitio web
                <input
                  value={editForm.website}
                  onChange={(event) => setEditForm((current) => ({ ...current, website: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-primary"
                />
              </label>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving || avatarBusy}
              className="justify-self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Guardar cambios
            </button>
          </div>
        ) : null}
      </section>

      <section className="glass-panel rounded-[28px] border border-border bg-card-bg">
        <div className="flex border-b border-border">
          <button
            onClick={() => setMode("posts")}
            className={`flex-1 px-4 py-3 text-sm font-semibold ${
              mode === "posts" ? "text-primary" : "text-foreground/65"
            }`}
          >
            Publicaciones
          </button>
          {isOwnProfile ? (
            <button
              onClick={() => setMode("saved")}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${
                mode === "saved" ? "text-primary" : "text-foreground/65"
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
                <Image src={post.image_url || defaultAvatar} alt={post.caption} sizes="(max-width: 768px) 33vw, 240px" fill className="object-cover" />
              </Link>
            ))
          ) : (
            <div className="col-span-3 p-8 text-center text-sm text-foreground/60">
              No hay publicaciones para mostrar.
            </div>
          )}
        </div>
        {mode === "posts" && hasMore && <button disabled={saving} onClick={loadMorePosts} className="m-3 rounded border p-3">Cargar más publicaciones</button>}
        {mode === "saved" && <Link href="/saved" className="m-3 inline-block underline">Ver todos los guardados</Link>}
      </section>
    </div>
  );
}
