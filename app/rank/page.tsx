"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { supabase, getCurrentUser } from "../utils/client";
import { defaultPostImage } from "../utils/assets";
import { fetchRankedPosts } from "../utils/social";
import { getErrorMessage } from "../utils/errors";
import type { Post } from "../mocks/posts";

export default function RankPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await getCurrentUser();

      if (!user) {
        return;
      }

      const ranked = await fetchRankedPosts(supabase, user.id);

      if (active) {
        setPosts(ranked);
        setLoading(false);
      }
    };

    load().catch((error) => { if(active) {setError(getErrorMessage(error,"No se pudo cargar el ranking."));setLoading(false);} });

    return () => {
      active = false;
    };
  }, [retry]);

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <header className="glass-header sticky top-0 z-40 border-b">
          <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Explore
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-2 py-2 pb-28">
          {error && <p role="alert">No se pudo cargar el ranking.<button className="ml-3 underline" onClick={()=>{setError(null);setLoading(true);setRetry(value=>value+1);}}>Reintentar</button></p>}
          {loading ? <p>Cargando ranking...</p> : !error && !posts.length ? <p>Todavía no hay publicaciones.</p> : null}
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`} className="relative aspect-square overflow-hidden">
                <Image
                  src={post.image_url || defaultPostImage}
                  alt={post.caption}
                  sizes="(max-width: 768px) 33vw, 240px" fill
                  className="object-cover transition-transform hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity hover:opacity-100">
                  <span className="rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white">
                    {post.likes.toLocaleString()} likes
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
