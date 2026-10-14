"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import RequireAuth from "../../components/RequireAuth";
import { supabase, getCurrentUser } from "../../utils/client";
import { getErrorMessage } from "../../utils/errors";
import { defaultAvatar, defaultPostImage } from "../../utils/assets";
import {
  fetchCommentsForPost,
  fetchPostById,
  fetchScopedIdSet,
  fetchLikedPostIds,
  toComment,
  toPost,
  type PostRow,
} from "../../utils/social";
import { getTimeAgo } from "../../utils/time";
import type { Post } from "../../mocks/posts";

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-red-500">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
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

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [retry, setRetry] = useState(0);
  const interactionLock = useRef(false);
  const [interacting, setInteracting] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Array<ReturnType<typeof toComment>>>([]);
  const [hasOlderComments, setHasOlderComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await getCurrentUser();

      if (!user) {
        setLoading(false);
        return;
      }
      setViewerId(user.id);

      const [row, commentRows, likedIds, savedIds] = await Promise.all([
        fetchPostById(supabase, postId),
        fetchCommentsForPost(supabase, postId),
        fetchLikedPostIds(supabase, user.id, [postId]),
        fetchScopedIdSet(supabase,"saved_posts","post_id","user_id",user.id,[postId]),
      ]);

      if (!active || !row) {
        setLoading(false);
        return;
      }

      setPost(
        {
          ...toPost(row as PostRow, {
            likePostIds: likedIds,
            savedPostIds: savedIds,
          }),
          likes: (await supabase.from("post_likes").select("post_id", { head: true, count: "exact" }).eq("post_id", postId)).count ?? 0,
        }
      );
      setComments(commentRows.map((row) => toComment(row)));
      setHasOlderComments(commentRows.length === 30);
      setLoading(false);
    };

    load().catch((error) => {
      setActionError(getErrorMessage(error, "No se pudo cargar la publicación."));
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [postId, retry]);

  const saveCaption = async () => {
    if (!post || viewerId !== post.user_id || mutating) return;
    setMutating(true); setActionError(null);
    try {
      const { data, error } = await supabase.from("posts").update({ caption: captionDraft.trim(), updated_at: new Date().toISOString() }).eq("id",post.id).eq("user_id",viewerId).select("id").single();
      if (error || !data) throw error ?? new Error("La publicación no pudo actualizarse.");
      setPost({ ...post, caption: captionDraft.trim() }); setEditing(false);
    } catch(error) { setActionError(getErrorMessage(error,"No se pudo editar. Puedes reintentar.")); }
    finally { setMutating(false); }
  };

  const loadOlderComments = async () => {
    if (!comments.length || loadingComments) return;
    setLoadingComments(true);setActionError(null);
    try {
      const first = comments[0];
      const older = await fetchCommentsForPost(supabase,postId,{created_at:first.created_at,id:first.id});
      setComments(previous=>[...older.map(toComment).filter(comment=>!previous.some(item=>item.id===comment.id)),...previous]);
      setHasOlderComments(older.length===30);
    } catch(error) {setActionError(getErrorMessage(error,"No se pudieron cargar más comentarios."));}
    finally {setLoadingComments(false);}
  };

  const deletePost = async () => {
    if (!post || viewerId !== post.user_id || mutating) return;
    setMutating(true); setActionError(null);
    try {
      const { data, error } = await supabase.from("posts").delete().eq("id",post.id).eq("user_id",viewerId).select("id").single();
      if (error || !data) throw error ?? new Error("La publicación no pudo eliminarse.");
      const imageUrl = new URL(post.image_url);
      const projectOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
      const prefix = "/storage/v1/object/public/images/";
      if (imageUrl.origin === projectOrigin && imageUrl.pathname.startsWith(prefix)) {
        const references = await supabase.from("posts").select("id",{count:"exact",head:true}).eq("image_url",post.image_url);
        if (!references.error && references.count === 0) {
          const removal = await supabase.storage.from("images").remove([decodeURIComponent(imageUrl.pathname.slice(prefix.length))]);
          if (removal.error) {
            setPost(null);
            setActionError("La publicación se eliminó, pero no se pudo limpiar su imagen. Revisa los permisos de Storage.");
            return;
          }
        }
      }
      router.replace("/profile");
    } catch(error) { setActionError(getErrorMessage(error,"No se pudo eliminar. Puedes reintentar.")); }
    finally { setMutating(false); }
  };

  const toggleLike = async () => {
    if (interactionLock.current) return;
    interactionLock.current = true; setInteracting(true); setActionError(null);
    try {
    if (!post) {
      return;
    }

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      return;
    }

    const nextIsLiked = !post.isLiked;
    setPost({
      ...post,
      isLiked: nextIsLiked,
      likes: Math.max(0, post.likes + (post.isLiked ? -1 : 1)),
    });

    const { error } = nextIsLiked
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id })
      : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);

    if (error) {
      setActionError(`No se pudo actualizar el like: ${getErrorMessage(error, "Error desconocido")}`);
      setPost(post);
      return;
    }

    if (nextIsLiked && post.user_id !== user.id) {
      await supabase.from("notifications").insert({
        recipient_id: post.user_id,
        actor_id: user.id,
        type: "like",
        post_id: post.id,
      });
    }
    } catch(error) {
      setPost(post);
      setActionError(getErrorMessage(error,"No se pudo actualizar el like. Inténtalo de nuevo."));
    } finally { interactionLock.current=false; setInteracting(false); }
  };

  const toggleSave = async () => {
    if (interactionLock.current) return;
    interactionLock.current = true; setInteracting(true); setActionError(null);
    try {
    if (!post) return;

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) return;

    setPost({ ...post, isSaved: !post.isSaved });

    const { error } = post.isSaved
      ? await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("saved_posts").insert({ post_id: post.id, user_id: user.id });

    if (error) {
      setActionError(`No se pudo guardar la publicación: ${getErrorMessage(error, "Error desconocido")}`);
      setPost((current) => (current ? { ...current, isSaved: !current.isSaved } : current));
    }
    } catch(error) {
      setPost(post);
      setActionError(getErrorMessage(error,"No se pudo guardar. Inténtalo de nuevo."));
    } finally { interactionLock.current=false; setInteracting(false); }
  };

  const addComment = async () => {
    if (interactionLock.current) return;
    interactionLock.current = true; setInteracting(true);
    setActionError(null);
    try {
    const content = comment.trim();
    if (!post || !content) return;

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) return;

    const { data: createdComment, error } = await supabase.from("comments").insert({
      post_id: post.id,
      user_id: user.id,
      content,
    }).select("id").single();

    if (error) {
      setActionError(`No se pudo guardar el comentario: ${getErrorMessage(error, "Error desconocido")}`);
      return;
    }

    if (post.user_id !== user.id) {
      await supabase.from("notifications").insert({
        recipient_id: post.user_id,
        actor_id: user.id,
        type: "comment",
        post_id: post.id,
        comment_id: createdComment.id,
      });
    }

    const nextComments = await fetchCommentsForPost(supabase, post.id);
    setComments(nextComments.map((row) => toComment(row)));
    setHasOlderComments(nextComments.length === 30);
    setComment("");
    } catch(error) {
      setActionError(getErrorMessage(error,"No se pudo completar el comentario. Revisa los comentarios antes de reintentarlo."));
    } finally { interactionLock.current=false; setInteracting(false); }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-foreground/60">
          Cargando post...
        </div>
      </RequireAuth>
    );
  }

  if (!post) {
    return (
      <RequireAuth>
        <div className="rounded-xl border border-dashed border-border bg-card-bg p-8 text-center text-sm text-foreground/60">
          {actionError || "No encontramos esta publicación."}
          {actionError && <button type="button" className="ml-3 underline" onClick={() => {setActionError(null);setLoading(true);setRetry(value=>value+1);}}>Reintentar</button>}
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 pb-28 lg:grid-cols-[1.2fr_0.8fr]">
          {actionError && (
            <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 lg:col-span-2">
              {actionError}
              <button type="button" onClick={() => { setLoading(true); setActionError(null); setRetry(value => value + 1); }} className="ml-3 underline">Reintentar carga</button>
            </div>
          )}
          {viewerId === post.user_id && (
            <section className="flex flex-wrap gap-3 lg:col-span-2" aria-label="Gestionar publicación">
              <button type="button" disabled={mutating} onClick={() => { setCaptionDraft(post.caption); setEditing(true); }} className="rounded border border-border p-2">Editar publicación</button>
              <button type="button" disabled={mutating} onClick={() => setConfirmDelete(true)} className="rounded border border-red-500 p-2">Eliminar publicación</button>
              {editing && <div className="w-full grid gap-3">
                <label>Descripción<textarea maxLength={2200} value={captionDraft} onChange={event => setCaptionDraft(event.target.value)} className="block w-full rounded border border-border bg-card-bg p-3" /></label>
                <button disabled={mutating} onClick={saveCaption}>Guardar cambios</button>
                <button disabled={mutating} onClick={() => setEditing(false)}>Cancelar edición</button>
              </div>}
              {confirmDelete && <div role="alert" className="w-full">
                <p>¿Eliminar esta publicación y sus comentarios? Esta acción no se puede deshacer.</p>
                <button disabled={mutating} onClick={deletePost} className="mr-4 text-red-500">Sí, eliminar</button>
                <button disabled={mutating} onClick={() => setConfirmDelete(false)}>Cancelar</button>
              </div>}
            </section>
          )}
          <section className="overflow-hidden glass-panel rounded-[28px] border border-border bg-card-bg">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="relative h-10 w-10 overflow-hidden rounded-full">
                <Image src={post.user?.avatar || defaultAvatar} alt={post.user?.username || "profile"} sizes="64px" fill className="object-cover" />
              </div>
              <div>
                <Link href={`/profile/${post.user_id}`} className="font-semibold text-foreground">
                  {post.user?.username || "default_user"}
                </Link>
                <div className="text-xs text-foreground/65">{getTimeAgo(new Date(post.created_at))}</div>
              </div>
            </div>

            <div className="relative aspect-square w-full">
              <Image src={post.image_url || defaultPostImage} alt={post.caption} sizes="(max-width: 768px) 100vw, 640px" fill className="object-cover" />
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button disabled={interacting || mutating} onClick={toggleLike} aria-label={post.isLiked ? "Quitar like" : "Dar like"}>
                    <HeartIcon filled={post.isLiked || false} />
                  </button>
                  <button disabled={interacting || mutating} onClick={toggleSave} aria-label={post.isSaved ? "Quitar guardado" : "Guardar publicación"}>
                    <BookmarkIcon filled={post.isSaved || false} />
                  </button>
                </div>
                <div className="text-sm text-foreground/60">{post.likes.toLocaleString()} likes</div>
              </div>

              <p className="mt-3 text-sm text-foreground">
                <span className="font-semibold">{post.user?.username || "default_user"}</span>{" "}
                <span className="text-foreground/80">{post.caption}</span>
              </p>
            </div>
          </section>

          <aside className="overflow-hidden glass-panel rounded-[28px] border border-border bg-card-bg">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/60">Comments</h2>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-4">
              {hasOlderComments && <button disabled={loadingComments} onClick={loadOlderComments} className="mb-4 underline">{loadingComments ? "Cargando..." : "Cargar comentarios anteriores"}</button>}
              {comments.length ? (
                <div className="flex flex-col gap-4">
                  {comments.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full">
                        <Image src={item.user?.avatar || defaultAvatar} alt={item.user?.username || "user"} sizes="64px" fill className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/profile/${item.user_id}`} className="text-sm font-semibold text-foreground">{item.user?.username || "default_user"}</Link>
                          <span className="text-xs text-foreground/60">{getTimeAgo(new Date(item.created_at))}</span>
                        </div>
                        <p className="text-sm text-foreground/80">{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground/60">Aun no hay comentarios.</p>
              )}
            </div>

            <div className="border-t border-border p-4">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                placeholder="Escribe un comentario..."
                aria-label="Comentario"
                maxLength={2000}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={addComment}
                disabled={interacting || !comment.trim()}
                className="mt-3 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {interacting ? "Procesando..." : "Publicar comentario"}
              </button>
            </div>
          </aside>
        </main>
      </div>
    </RequireAuth>
  );
}
