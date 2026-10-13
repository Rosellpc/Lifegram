"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { supabase } from "../utils/client";
import { defaultAvatar, defaultPostImage } from "../utils/assets";
import { fetchPostsBundle, toPost } from "../utils/social";
import type { Post } from "../mocks/posts";

type ProfileResult = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [explore, setExplore] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadExplore = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const ranked = await fetchPostsBundle(supabase, { viewerId: user.id });
      if (active) {
        setExplore([...ranked].sort((a, b) => b.likes - a.likes).slice(0, 12));
      }
    };

    loadExplore().catch((error) => console.error("Error al cargar explore:", error));

    return () => {
      active = false;
    };
  }, []);

  const runSearch = async (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();

    if (!term) {
      setProfiles([]);
      setPosts([]);
      return;
    }

    setLoading(true);

    const [profileRes, postRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio")
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        .order("username", { ascending: true }),
      supabase
        .from("posts")
        .select("id, user_id, image_url, caption, location, created_at, updated_at, profiles!posts_user_id_fkey (id, username, avatar_url, full_name, bio, website)")
        .ilike("caption", `%${term}%`)
        .order("created_at", { ascending: false }),
    ]);

    if (profileRes.error) {
      console.error(profileRes.error);
    } else {
      setProfiles((profileRes.data ?? []) as ProfileResult[]);
    }

    if (postRes.error) {
      console.error(postRes.error);
    } else {
      setPosts((postRes.data ?? []).map((row) => toPost(row)));
    }

    setLoading(false);
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-card-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Search
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
          <form onSubmit={runSearch} className="mb-6">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar personas o captions..."
              className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </form>

          {loading ? <p className="text-sm text-foreground/60">Buscando...</p> : null}

          {profiles.length ? (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/60">
                Profiles
              </h2>
              <div className="flex flex-col gap-3">
                {profiles.map((profile) => (
                  <Link key={profile.id} href={`/profile/${profile.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card-bg p-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full">
                      <Image src={profile.avatar_url || defaultAvatar} alt={profile.username || "profile"} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-foreground">{profile.username || "default_user"}</div>
                      <div className="truncate text-sm text-foreground/60">{profile.full_name || profile.bio || "Sin bio"}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {posts.length ? (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/60">
                Posts
              </h2>
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <Link key={post.id} href={`/posts/${post.id}`} className="relative aspect-square overflow-hidden">
                    <Image src={post.image_url || defaultPostImage} alt={post.caption} fill className="object-cover" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {!profiles.length && !posts.length && query ? (
            <p className="text-sm text-foreground/60">No encontramos coincidencias.</p>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/60">Explore</h2>
              <Link href="/rank" className="text-xs font-semibold text-primary">
                Top posts
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {explore.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`} className="relative aspect-square overflow-hidden">
                  <Image src={post.image_url || defaultPostImage} alt={post.caption} fill className="object-cover" />
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </RequireAuth>
  );
}
