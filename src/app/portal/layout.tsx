import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/supabase/session";
import { roleHome } from "@/lib/roles";
import { signOut } from "@/lib/auth-actions";
import { Logo } from "@/components/ui/Logo";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const appUser = await getAppUser();
  if (!appUser) redirect("/login");
  if (appUser.role !== "client" && appUser.role !== "city") redirect(roleHome(appUser.role));

  return (
    <div data-theme="dark" className="min-h-screen bg-page text-body">
      <div className="flex items-center justify-between px-(--gutter) pt-(--space-4)">
        <Logo className="h-4 w-auto text-heading" />
        <div className="flex items-center gap-(--space-5) text-xs uppercase tracking-label text-muted">
          {appUser.role === "client" ? (
            <Link href="/commandes" className="hover:text-heading">
              Commandes
            </Link>
          ) : null}
          <form action={signOut}>
            <button type="submit" className="text-xs uppercase tracking-label text-muted focus-ring hover:text-heading">
              Déconnexion →
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
