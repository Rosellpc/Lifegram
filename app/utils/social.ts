import type { SupabaseClient } from "@supabase/supabase-js";
import { type Post } from "../mocks/posts";
import { defaultAvatar } from "./assets";

type ProfileShape =
  | {
      id?: string;
      username: string | null;
      full_name: string | null;
      bio: string | null;
      avatar_url: string | null;
      website: string | null;
    }
  | {
      id?: string;
      username: string | null;
      full_name: string | null;
      bio: string | null;
      avatar_url: string | null;
      website: string | null;
    }[]
  | null
  | undefined;

export type PostRow = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  location: string | null;
  created_at: string;
  updated_at: string | null;
  profiles?: ProfileShape;
};

export type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: ProfileShape;
};

export type StoryRow = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
  expires_at: string;
  profiles?: ProfileShape;
};

export type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: ProfileShape;
};

type PostMeta = {
  likePostIds?: Set<string>;
  savedPostIds?: Set<string>;
  commentsCount?: Map<string, number>;
};

function getProfile(profile: ProfileShape) {
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }

  return profile ?? null;
}

export function toPost(post: PostRow, meta: PostMeta = {}): Post {
  const profile = getProfile(post.profiles);
  return {
    id: post.id,
    user_id: post.user_id,
    user: {
      id: profile?.id,
      username: profile?.username || "default_user",
      avatar: profile?.avatar_url || defaultAvatar.src,
      full_name: profile?.full_name,
      bio: profile?.bio,
      website: profile?.website,
    },
    image_url: post.image_url,
    caption: post.caption ?? "",
    location: post.location ?? null,
    likes: 0,
    commentsCount: meta.commentsCount?.get(post.id) ?? 0,
    isLiked: meta.likePostIds?.has(post.id) ?? false,
    isSaved: meta.savedPostIds?.has(post.id) ?? false,
    created_at: post.created_at,
    updated_at: post.updated_at ?? undefined,
  };
}

export function toComment(comment: CommentRow) {
  const profile = getProfile(comment.profiles);
  return {
    id: comment.id,
    post_id: comment.post_id,
    user_id: comment.user_id,
    content: comment.content,
    created_at: comment.created_at,
    user: {
      id: profile?.id,
      username: profile?.username || "default_user",
      avatar: profile?.avatar_url || defaultAvatar.src,
      full_name: profile?.full_name,
    },
  };
}

export async function fetchProfilesByIds(
  client: SupabaseClient,
  ids: string[]
) {
  if (!ids.length) {
    return new Map<string, { username: string; avatar_url: string | null; full_name: string | null; bio: string | null; website: string | null }>();
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, username, avatar_url, full_name, bio, website")
    .in("id", ids);

  if (error) {
    throw error;
  }

  const map = new Map<string, { username: string; avatar_url: string | null; full_name: string | null; bio: string | null; website: string | null }>();
  (data ?? []).forEach((profile) => {
    map.set(profile.id, profile);
  });

  return map;
}

export async function fetchProfileById(
  client: SupabaseClient,
  id: string
) {
  const { data, error } = await client
    .from("profiles")
    .select("id, username, avatar_url, full_name, bio, website, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchPostById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("posts")
    .select("id, user_id, image_url, caption, location, created_at, updated_at, profiles!posts_user_id_fkey (id, username, avatar_url, full_name, bio, website)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PostRow | null;
}

export async function fetchCountsByForeignKey(
  client: SupabaseClient,
  table: "post_likes" | "saved_posts" | "comments",
  foreignKey: "post_id" | "comment_id" | "user_id",
  values: string[]
) {
  const map = new Map<string, number>();
  if (!values.length) {
    return map;
  }

  const { data, error } = await client
    .from(table)
    .select(foreignKey)
    .in(foreignKey, values);

  if (error) {
    throw error;
  }

  (data ?? []).forEach((row) => {
    const key = (row as Record<string, unknown>)[foreignKey];
    if (typeof key !== "string" || !key) return;
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return map;
}

export async function fetchPostCounts(
  client: SupabaseClient,
  postIds: string[]
) {
  const [likesMap, commentsMap] = await Promise.all([
    fetchCountsByForeignKey(client, "post_likes", "post_id", postIds),
    fetchCountsByForeignKey(client, "comments", "post_id", postIds),
  ]);

  return { likesMap, commentsMap };
}

export async function fetchScopedIdSet(
  client: SupabaseClient,
  table: "post_likes" | "saved_posts" | "follows",
  selectColumn: "post_id" | "user_id" | "following_id" | "follower_id",
  scopeColumn: "user_id" | "follower_id" | "following_id",
  scopeValue: string
) {
  const { data, error } = await client
    .from(table)
    .select(selectColumn)
    .eq(scopeColumn, scopeValue);
  if (error) {
    throw error;
  }

  return new Set(
    (data ?? []).flatMap((row) => {
      const value = (row as Record<string, unknown>)[selectColumn];
      return typeof value === "string" ? [value] : [];
    })
  );
}

export async function fetchFollowingIds(
  client: SupabaseClient,
  userId: string
) {
  const { data, error } = await client
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.following_id as string);
}

export async function fetchSavedPostIds(
  client: SupabaseClient,
  userId: string
) {
  const { data, error } = await client
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.post_id as string));
}

export async function fetchLikedPostIds(
  client: SupabaseClient,
  userId: string
) {
  const { data, error } = await client
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.post_id as string));
}

export async function fetchPostsByIds(
  client: SupabaseClient,
  ids: string[],
  viewerId?: string
) {
  if (!ids.length) {
    return [];
  }

  const { data, error } = await client
    .from("posts")
    .select("id, user_id, image_url, caption, location, created_at, updated_at, profiles!posts_user_id_fkey (id, username, avatar_url, full_name, bio, website)")
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const mapped = (data ?? []) as PostRow[];
  const postIds = mapped.map((post) => post.id);
  const [likesMap, commentsCount, likedSet, savedSet] = await Promise.all([
    fetchCountsByForeignKey(client, "post_likes", "post_id", postIds),
    fetchCountsByForeignKey(client, "comments", "post_id", postIds),
    viewerId ? fetchLikedPostIds(client, viewerId) : Promise.resolve(new Set<string>()),
    viewerId ? fetchSavedPostIds(client, viewerId) : Promise.resolve(new Set<string>()),
  ]);

  return mapped.map((post) => {
    const item = toPost(post, {
      likePostIds: likedSet,
      savedPostIds: savedSet,
      commentsCount,
    });
    item.likes = likesMap.get(post.id) ?? 0;
    return item;
  });
}

export async function fetchPostsBundle(
  client: SupabaseClient,
  opts?: {
    userIds?: string[];
    viewerId?: string;
  }
) {
  let postQuery = client
    .from("posts")
    .select("id, user_id, image_url, caption, location, created_at, updated_at, profiles!posts_user_id_fkey (id, username, avatar_url, full_name, bio, website)")
    .order("created_at", { ascending: false });

  if (opts?.userIds?.length) {
    postQuery = postQuery.in("user_id", opts.userIds);
  }

  const { data: posts, error } = await postQuery;
  if (error) {
    throw error;
  }

  const typedPosts = (posts ?? []) as PostRow[];
  const postIds = typedPosts.map((post) => post.id);

  const [likesMap, savedSet, commentsCount, likedSet] = await Promise.all([
    fetchCountsByForeignKey(client, "post_likes", "post_id", postIds),
    opts?.viewerId
      ? fetchScopedIdSet(
          client,
          "saved_posts",
          "post_id",
          "user_id",
          opts.viewerId
        )
      : Promise.resolve(new Set<string>()),
    fetchCountsByForeignKey(client, "comments", "post_id", postIds),
    opts?.viewerId
      ? fetchScopedIdSet(
          client,
          "post_likes",
          "post_id",
          "user_id",
          opts.viewerId
        )
      : Promise.resolve(new Set<string>()),
  ]);

  return typedPosts.map((post) => {
    const mapped = toPost(post, {
      likePostIds: likedSet,
      savedPostIds: savedSet,
      commentsCount,
    });
    mapped.likes = likesMap.get(post.id) ?? 0;
    return mapped;
  });
}

export async function fetchCommentsForPost(
  client: SupabaseClient,
  postId: string
) {
  const { data, error } = await client
    .from("comments")
    .select("id, post_id, user_id, content, created_at, profiles!comments_user_id_fkey (id, username, avatar_url, full_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CommentRow[];
}

export async function fetchStoriesBundle(
  client: SupabaseClient,
  opts?: { userIds?: string[] }
) {
  const now = new Date().toISOString();
  let query = client
    .from("stories")
    .select("id, user_id, media_url, media_type, created_at, expires_at, profiles!stories_user_id_fkey (id, username, avatar_url, full_name)")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });

  if (opts?.userIds?.length) {
    query = query.in("user_id", opts.userIds);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as StoryRow[];
}

export async function fetchNotifications(
  client: SupabaseClient,
  recipientId: string
) {
  const { data, error } = await client
    .from("notifications")
    .select("id, recipient_id, actor_id, type, post_id, comment_id, is_read, created_at, actor:profiles!notifications_actor_id_fkey (id, username, avatar_url, full_name)")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as NotificationRow[];
}
