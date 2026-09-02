import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/supabase/session";
import { roleHome } from "@/lib/roles";
import { signOut } from "@/lib/auth-actions";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const appUser = await getAppUser();
  if (!appUser) redirect("/login");
  if (appUser.role !== "client" && appUser.role !== "city") redirect(roleHome(appUser.role));

  return (
    <div data-theme="dark" className="min-h-screen bg-page text-body">
      <div className="flex justify-end px-(--gutter) pt-(--space-4)">
        <form action={signOut}>
          <button type="submit" className="text-xs uppercase tracking-label text-muted focus-ring hover:text-heading">
            Déconnexion →
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
