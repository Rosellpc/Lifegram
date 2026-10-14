"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../utils/client";
import { defaultAvatar } from "../utils/assets";
import { useNotifications } from "./NotificationsProvider";

export default function NavAvatar({ size = 24 }: { size?: 24 | 32 }) {
  const { userId } = useNotifications();
  const pathname = usePathname();
  const [profile, setProfile] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let request = 0;
    const load = async () => {
      const version = ++request;
      const { data, error } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
      if (active && version === request && !error) setProfile({ id: userId, url: data?.avatar_url ?? null });
    };
    void load();
    window.addEventListener("lifegram:profile-updated", load);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("lifegram:profile-updated", load);
      window.removeEventListener("focus", load);
    };
  }, [userId, pathname]);

  const url = userId && profile?.id === userId ? profile.url : null;
  return <span className={"relative block overflow-hidden rounded-full ring-2 " + (size === 32 ? "h-8 w-8 " : "h-6 w-6 ") + (pathname.startsWith("/profile") ? "ring-primary" : "ring-transparent")}>
    <Image src={url || defaultAvatar} alt="Tu foto de perfil" fill sizes={`${size}px`} className="object-cover" />
  </span>;
}
