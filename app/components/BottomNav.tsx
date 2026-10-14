"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "./NotificationsProvider";
import NavAvatar from "./NavAvatar";

function HomeIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.061l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 101.061 1.06l8.69-8.689z" />
        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return active ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M10.5 3a7.5 7.5 0 015.99 12.012l4.248 4.248a.75.75 0 11-1.06 1.06l-4.248-4.248A7.5 7.5 0 1110.5 3zm0 1.5a6 6 0 100 12 6 6 0 000-12z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3a7.5 7.5 0 105.99 12.012l4.248 4.248" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3a7.5 7.5 0 015.99 12.012l4.248 4.248" />
    </svg>
  );
}

function BellIcon({ active }: { active: boolean }) {
  return active ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 2.25a5.25 5.25 0 00-5.25 5.25v2.378c0 .548-.17 1.083-.487 1.53L4.2 13.605A1.5 1.5 0 005.43 16.5h13.14a1.5 1.5 0 001.23-2.895l-2.063-2.197a2.25 2.25 0 01-.487-1.53V7.5A5.25 5.25 0 0012 2.25z" />
      <path d="M9.75 18a2.25 2.25 0 004.5 0h-4.5z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.513 23.513 0 01-3.257.258c-1.676 0-3.327-.175-4.912-.514M14.857 17.082A23.469 23.469 0 0018 16.5M14.857 17.082l1.45 1.45A2.25 2.25 0 0018 19.125v.375a2.25 2.25 0 01-2.25 2.25H8.25A2.25 2.25 0 016 19.5v-.375c0-.597.237-1.17.658-1.591l1.45-1.45m6.749 0a2.25 2.25 0 00-1.591-.658H10.64a2.25 2.25 0 00-1.591.658M6.75 9.75a5.25 5.25 0 1110.5 0c0 1.135.364 2.228 1.024 3.137l1.82 2.505H3.906l1.82-2.505A5.25 5.25 0 016.75 9.75z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { unread } = useNotifications();

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <nav aria-label="Navegación principal" className="glass-nav">
      <div className="grid grid-cols-6 items-center gap-1 px-2 py-2">
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className={`flex flex-col items-center gap-1 px-2 py-2 transition-colors ${
            pathname === "/" ? "text-primary" : "text-foreground/60 hover:text-foreground"
          }`}
        >
          <HomeIcon active={pathname === "/"} />
          <span className="text-[10px] font-medium">Inicio</span>
        </Link>

        <Link
          href="/search"
          aria-current={pathname.startsWith("/search") ? "page" : undefined}
          className={`flex flex-col items-center gap-1 px-2 py-2 transition-colors ${
            pathname.startsWith("/search") ? "text-primary" : "text-foreground/60 hover:text-foreground"
          }`}
        >
          <SearchIcon active={pathname.startsWith("/search")} />
          <span className="text-[10px] font-medium">Buscar</span>
        </Link>

        <Link
          href="/post"
          aria-label="Crear publicación"
          className="create-button mx-auto flex h-12 w-12 items-center justify-center"
        >
          <PlusIcon />
        </Link>

        <Link
          href="/notifications"
          aria-label={unread ? `Actividad, ${unread} sin leer` : "Actividad"}
          aria-current={pathname.startsWith("/notifications") ? "page" : undefined}
          className={`flex flex-col items-center gap-1 px-2 py-2 transition-colors ${
            pathname.startsWith("/notifications") ? "text-primary" : "text-foreground/60 hover:text-foreground"
          }`}
        >
          <span className="relative"><BellIcon active={pathname.startsWith("/notifications")} />
          {unread > 0 && <span aria-hidden="true" className="absolute -right-3 -top-2 rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}</span>
          <span className="text-[10px] font-medium">Actividad</span>
        </Link>
        <Link href="/messages" aria-current={pathname.startsWith("/messages") ? "page" : undefined} className="flex flex-col items-center gap-1 px-2 py-2 text-foreground/65">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z"/></svg>
          <span className="text-[10px] font-medium">Chat</span>
        </Link>

        <Link
          href="/profile"
          aria-current={pathname.startsWith("/profile") ? "page" : undefined}
          className={`flex flex-col items-center gap-1 px-2 py-2 transition-colors ${
            pathname.startsWith("/profile") ? "text-primary" : "text-foreground/60 hover:text-foreground"
          }`}
        >
          <NavAvatar />
          <span className="text-[10px] font-medium">Perfil</span>
        </Link>
      </div>
    </nav>
  );
}
