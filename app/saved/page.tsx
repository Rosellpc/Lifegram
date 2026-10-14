"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { supabase, getCurrentUser } from "../utils/client";
import { getErrorMessage } from "../utils/errors";
import { defaultPostImage } from "../utils/assets";
import { fetchPostsByIds, fetchSavedPostIds } from "../utils/social";
import type { Post } from "../mocks/posts";

export default function SavedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await getCurrentUser();

      if (!user) {
        return;
      }

      const savedIds = await fetchSavedPostIds(supabase, user.id, page * 20);
      const savedPosts = await fetchPostsByIds(supabase, Array.from(savedIds), user.id);

      if (active) {
        setPosts(previous => page === 0 ? savedPosts : [...previous,...savedPosts.filter(item => !previous.some(post => post.id === item.id))]);
        setHasMore(savedIds.size === 20);
        setLoading(false);
      }
    };

    load().catch((error) => {
      setError(getErrorMessage(error,"No se pudieron cargar los guardados."));
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [page,retry]);

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <header className="glass-header sticky top-0 z-40 border-b">
          <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Guardados
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
          {error && <div role="alert" className="mb-4 text-red-500">{error}<button className="ml-3 underline" onClick={() => {setError(null);setRetry(value=>value+1);}}>Reintentar</button></div>}
          {loading ? (
            <p className="text-sm text-foreground/60">Cargando guardados...</p>
          ) : posts.length ? (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`} className="relative aspect-square overflow-hidden">
                  <Image src={post.image_url || defaultPostImage} alt={post.caption} sizes="(max-width: 768px) 33vw, 240px" fill className="object-cover" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card-bg p-8 text-center text-sm text-foreground/60">
              Aun no guardaste nada.
            </div>
          )}
          {!loading && hasMore && posts.length > 0 && <button className="mt-4 rounded border p-3" onClick={()=>setPage(value=>value+1)}>Cargar más guardados</button>}
        </main>
      </div>
    </RequireAuth>
  );
}
