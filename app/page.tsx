"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import RequireAuth from "./components/RequireAuth";
import NavAvatar from "./components/NavAvatar";
import BrandLogo from "./components/BrandLogo";
import { supabase, getCurrentUser } from "./utils/client";
import { getErrorMessage } from "./utils/errors";
import { defaultAvatar, defaultPostImage } from "./utils/assets";
import {
  fetchFollowingIds,
  fetchPostsBundle,
  fetchStoriesBundle,
  type StoryRow,
} from "./utils/social";
import { getTimeAgo } from "./utils/time";
import type { Post } from "./mocks/posts";

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-red-500">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M6 3.75A2.25 2.25 0 008.25 1.5h7.5A2.25 2.25 0 0118 3.75V21a.75.75 0 01-1.203.597L12 17.98l-4.797 3.617A.75.75 0 016 21V3.75z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75A2.25 2.25 0 018.25 1.5h7.5A2.25 2.25 0 0118 3.75V21a.75.75 0 01-1.203.597L12 17.98l-4.797 3.617A.75.75 0 016 21V3.75z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0 4.556 4.03 8.25 9 8.25.945 0 1.857-.127 2.723-.366l4.287 2.151-.99-3.293c1.468-1.489 2.23-3.27 2.23-5.242 0-4.556-4.03-8.25-9-8.25s-9 3.694-9 8.25z" />
    </svg>
  );
}

function StoryAvatar({ story }: { story: StoryRow }) {
  const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;

  return (
    <Link href={`/stories?user=${story.user_id}`} className="flex w-20 shrink-0 flex-col items-center gap-2">
      <div className="rounded-full bg-gradient-to-tr from-primary via-accent to-primary p-[2px]">
        <div className="relative h-16 w-16 overflow-hidden rounded-full bg-card-bg">
          <Image
            src={profile?.avatar_url || defaultAvatar}
            alt={profile?.username || "story"}
            sizes="64px" fill
            className="object-cover"
          />
        </div>
      </div>
      <span className="w-full truncate text-center text-[11px] text-foreground/70">
        {profile?.username || "story"}
      </span>
    </Link>
  );
}

function PostCard({
  post,
  onLike,
  onSave,
  disabled,
  eager,
}: {
  post: Post;
  onLike: (post: Post) => void;
  onSave: (post: Post) => void;
  disabled: boolean;
  eager: boolean;
}) {
  return (
    <article className="overflow-hidden glass-panel rounded-[28px] border border-border bg-card-bg">
      <div className="flex items-center gap-3 p-4">
        <Link href={`/profile/${post.user_id}`} aria-label={`Ver perfil de ${post.user?.username || "usuario"}`} className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-primary">
          <Image src={post.user?.avatar || defaultAvatar} alt={post.user?.username || "profile"} sizes="64px" fill className="object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${post.user_id}`} className="block truncate font-semibold text-foreground">{post.user?.username || "default_user"}</Link>
          <div className="text-xs text-foreground/65">{getTimeAgo(new Date(post.created_at))}</div>
        </div>
      </div>

      <Link href={`/posts/${post.id}`} className="relative block aspect-square w-full">
        <Image src={post.image_url || defaultPostImage} alt={post.caption} sizes="(max-width: 768px) 100vw, 640px" loading={eager ? "eager" : "lazy"} fill className="object-cover" />
      </Link>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button disabled={disabled} onClick={() => onLike(post)} aria-label={post.isLiked ? "Quitar like" : "Dar like"}>
              <HeartIcon filled={post.isLiked || false} />
            </button>
            <Link href={`/posts/${post.id}`} className="text-foreground/80 hover:text-foreground">
              <CommentIcon />
            </Link>
          </div>
          <button disabled={disabled} onClick={() => onSave(post)} aria-label={post.isSaved ? "Quitar guardado" : "Guardar"}>
            <BookmarkIcon filled={post.isSaved || false} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <span className="font-semibold">{post.likes.toLocaleString()}</span>
          <span>{post.likes === 1 ? "like" : "likes"}</span>
          <span className="text-foreground/60">·</span>
          <Link href={`/posts/${post.id}`} className="text-foreground/60 hover:text-foreground">
            {post.commentsCount || 0} comentarios
          </Link>
        </div>

        <p className="mt-2 text-sm text-foreground">
          <span className="font-semibold">{post.user?.username || "default_user"}</span>{" "}
          <span className="text-foreground/80">{post.caption}</span>
        </p>
      </div>
    </article>
  );
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [retry, setRetry] = useState(0);
  const mutationLock = useRef(false);
  const [interacting, setInteracting] = useState(false);
  const [cursor, setCursor] = useState<{ created_at: string; id: string } | undefined>();

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

      const followingIds = await fetchFollowingIds(supabase, user.id);
      const feedUserIds = followingIds.length ? [user.id, ...followingIds] : undefined;

      const [feedPosts, feedStories] = await Promise.all([
        fetchPostsBundle(supabase, { viewerId: user.id, userIds: feedUserIds, before: cursor }),
        fetchStoriesBundle(supabase, feedUserIds ? { userIds: feedUserIds } : undefined),
      ]);

      if (!active) {
        return;
      }

      setPosts((previous) => page === 0 ? feedPosts : [...previous, ...feedPosts.filter(post => !previous.some(item => item.id === post.id))]);
      setHasMore(feedPosts.length === 20);
      setStories(feedStories);
      setLoading(false);
    };

    load().catch((error) => {
      setActionError(`No se pudo cargar el feed: ${getErrorMessage(error, "Inténtalo de nuevo")}`);
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [page, cursor, retry]);

  const handleLike = async (targetPost: Post) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setInteracting(true);
    setActionError(null);
    const previous = posts;
    try {
    const optimistic = posts.map((post) =>
      post.id === targetPost.id
        ? {
            ...post,
            isLiked: !post.isLiked,
            likes: Math.max(0, post.likes + (post.isLiked ? -1 : 1)),
          }
        : post
    );

    setPosts(optimistic);

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      setPosts(previous);
      return;
    }

    const nextIsLiked = !targetPost.isLiked;

    const { error } = nextIsLiked
      ? await supabase.from("post_likes").insert({
          post_id: targetPost.id,
          user_id: user.id,
        })
      : await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", targetPost.id)
          .eq("user_id", user.id);

    if (error) {
      setActionError(`No se pudo actualizar el like: ${getErrorMessage(error, "Error desconocido")}`);
      setPosts(previous);
      return;
    }

    if (nextIsLiked && targetPost.user_id !== user.id) {
      await supabase.from("notifications").insert({
        recipient_id: targetPost.user_id,
        actor_id: user.id,
        type: "like",
        post_id: targetPost.id,
      });
    }
    } catch(error) {
      setPosts(previous);
      setActionError(getErrorMessage(error,"No se pudo actualizar el like. Inténtalo de nuevo."));
    } finally { mutationLock.current=false; setInteracting(false); }
  };

  const handleSave = async (targetPost: Post) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setInteracting(true);
    setActionError(null);
    const previous = posts;
    try {
    const optimistic = posts.map((post) =>
      post.id === targetPost.id
        ? { ...post, isSaved: !post.isSaved }
        : post
    );

    setPosts(optimistic);

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      setPosts(previous);
      return;
    }

    const { error } = targetPost.isSaved
      ? await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", targetPost.id)
          .eq("user_id", user.id)
      : await supabase.from("saved_posts").insert({
          post_id: targetPost.id,
          user_id: user.id,
        });

    if (error) {
      setActionError(`No se pudo guardar la publicación: ${getErrorMessage(error, "Error desconocido")}`);
      setPosts(previous);
    }
    } catch(error) {
      setPosts(previous);
      setActionError(getErrorMessage(error,"No se pudo guardar. Inténtalo de nuevo."));
    } finally { mutationLock.current=false; setInteracting(false); }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <header className="glass-header sticky top-0 z-40 border-b">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <div>
              <h1>
                <BrandLogo className="h-6 w-auto text-foreground sm:h-5" />
              </h1>
            </div>
            <Link href="/profile" aria-label="Mi perfil" className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-primary">
              <NavAvatar size={32} />
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-5 pb-28">
          {actionError && (
            <div role="alert" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {actionError}
              <button type="button" onClick={() => { setActionError(null); setRetry(value => value + 1); }} className="ml-3 underline">Reintentar</button>
            </div>
          )}
          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/60">Historias</h2>
              <Link href="/stories" className="text-xs font-semibold text-primary">
                Ver todas
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <Link href="/stories#create-story" className="flex w-20 shrink-0 flex-col items-center gap-2" aria-label="Crear historia">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-card-bg text-3xl font-light text-primary">+</span>
                <span className="text-center text-[11px] font-medium">Tu historia</span>
              </Link>
              {stories.length ? (
                stories.map((story) => <StoryAvatar key={story.id} story={story} />)
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-foreground/65">
                  No hay historias activas.
                </div>
              )}
            </div>
          </section>
          {hasMore && posts.length > 0 && !loading && (
            <button type="button" className="mt-5 w-full rounded-lg border border-border p-3" onClick={() => {
              const last = posts[posts.length - 1];
              setCursor({ created_at: typeof last.created_at === "string" ? last.created_at : last.created_at.toISOString(), id: last.id });
              setPage(value => value + 1);
            }}>Cargar más publicaciones</button>
          )}

          <section className="flex flex-col gap-6">
            {loading ? (
              <div className="glass-panel rounded-[24px] border border-border bg-card-bg p-6 text-sm text-foreground/60">
                Cargando publicaciones...
              </div>
            ) : posts.length ? (
              posts.map((post, index) => (
                <PostCard key={post.id} post={post} onLike={handleLike} onSave={handleSave} disabled={interacting} eager={index === 0} />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card-bg p-8 text-center text-sm text-foreground/60">
                Aun no hay publicaciones para mostrar.
              </div>
            )}
          </section>
        </main>
      </div>
    </RequireAuth>
  );
}
