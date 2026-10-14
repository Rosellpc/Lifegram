"use client";

import { useParams } from "next/navigation";
import RequireAuth from "../../components/RequireAuth";
import ProfileScreen from "../../components/ProfileScreen";

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();

  return (
    <RequireAuth>
      <div className="min-h-screen px-4 py-6 pb-28">
        <div className="mx-auto max-w-2xl">
          <ProfileScreen profileId={params.id} />
        </div>
      </div>
    </RequireAuth>
  );
}
