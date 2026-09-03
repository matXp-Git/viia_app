import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/supabase/session";
import { roleHome } from "@/lib/roles";
import { signOut } from "@/lib/auth-actions";
import { Logo } from "@/components/ui/Logo";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const appUser = await getAppUser();
  if (!appUser) redirect("/login");
  if (appUser.role !== "operator") redirect(roleHome(appUser.role));

  return (
    <div>
      <div className="flex items-center justify-between px-(--gutter) pt-(--space-4)">
        <Logo className="h-4 w-auto text-heading" />
        <form action={signOut}>
          <button type="submit" className="text-xs uppercase tracking-label text-charcoal/60 focus-ring hover:text-black">
            Déconnexion →
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
