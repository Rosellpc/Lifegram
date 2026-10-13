"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "./components/RequireAuth";
import { supabase } from "./utils/client";
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
            fill
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
}: {
  post: Post;
  onLike: (post: Post) => void;
  onSave: (post: Post) => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card-bg shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-primary">
          <Image src={post.user?.avatar || defaultAvatar} alt={post.user?.username || "profile"} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-foreground">{post.user?.username || "default_user"}</div>
          <div className="text-xs text-foreground/50">{getTimeAgo(new Date(post.created_at))}</div>
        </div>
      </div>

      <Link href={`/posts/${post.id}`} className="relative block aspect-square w-full">
        <Image src={post.image_url || defaultPostImage} alt={post.caption} fill className="object-cover" />
      </Link>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => onLike(post)} aria-label={post.isLiked ? "Quitar like" : "Dar like"}>
              <HeartIcon filled={post.isLiked || false} />
            </button>
            <Link href={`/posts/${post.id}`} className="text-foreground/80 hover:text-foreground">
              <CommentIcon />
            </Link>
          </div>
          <button onClick={() => onSave(post)} aria-label={post.isSaved ? "Quitar guardado" : "Guardar"}>
            <BookmarkIcon filled={post.isSaved || false} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <span className="font-semibold">{post.likes.toLocaleString()}</span>
          <span>{post.likes === 1 ? "like" : "likes"}</span>
          <span className="text-foreground/40">·</span>
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

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const followingIds = await fetchFollowingIds(supabase, user.id);
      const feedUserIds = followingIds.length ? [user.id, ...followingIds] : undefined;

      const [feedPosts, feedStories] = await Promise.all([
        fetchPostsBundle(supabase, { viewerId: user.id, userIds: feedUserIds }),
        fetchStoriesBundle(supabase, feedUserIds ? { userIds: feedUserIds } : undefined),
      ]);

      if (!active) {
        return;
      }

      setPosts(feedPosts);
      setStories(feedStories);
      setLoading(false);
    };

    load().catch((error) => {
      console.error("Error al cargar el feed:", error);
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleLike = async (targetPost: Post) => {
    const previous = posts;
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
    } = await supabase.auth.getUser();

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
      console.error("Error al actualizar likes:", error);
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
  };

  const handleSave = async (targetPost: Post) => {
    const previous = posts;
    const optimistic = posts.map((post) =>
      post.id === targetPost.id
        ? { ...post, isSaved: !post.isSaved }
        : post
    );

    setPosts(optimistic);

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      console.error("Error al guardar post:", error);
      setPosts(previous);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-card-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Suplatzigram
              </h1>
              <p className="text-xs text-foreground/60">Tu feed, tus personas, tus momentos.</p>
            </div>
            <Link href="/profile" className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-primary">
              <Image src={defaultAvatar} alt="Perfil" fill className="object-cover" />
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-5 pb-28">
          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/60">Stories</h2>
              <Link href="/stories" className="text-xs font-semibold text-primary">
                Ver todas
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stories.length ? (
                stories.map((story) => <StoryAvatar key={story.id} story={story} />)
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-foreground/50">
                  No hay historias activas.
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            {loading ? (
              <div className="rounded-xl border border-border bg-card-bg p-6 text-sm text-foreground/60">
                Cargando publicaciones...
              </div>
            ) : posts.length ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} onLike={handleLike} onSave={handleSave} />
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
