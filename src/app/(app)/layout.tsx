import { requireUser } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import HeartbeatBar from "@/components/HeartbeatBar";
import FrozenOverlay from "@/components/FrozenOverlay";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="relative min-h-screen pb-36">
      {children}
      {user.status === "FROZEN" ? (
        <FrozenOverlay />
      ) : (
        <HeartbeatBar lastActiveAt={user.lastActiveAt.toISOString()} />
      )}
      <BottomNav />
    </div>
  );
}
