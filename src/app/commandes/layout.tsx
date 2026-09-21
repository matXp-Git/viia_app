import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/supabase/session";
import { roleHome } from "@/lib/roles";
import { signOut } from "@/lib/auth-actions";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Logo } from "@/components/ui/Logo";

export default async function CommandesLayout({ children }: { children: React.ReactNode }) {
  const appUser = await getAppUser();
  if (!appUser) redirect("/login");
  if (appUser.role !== "client" && appUser.role !== "manager" && appUser.role !== "commercial") {
    redirect(roleHome(appUser.role));
  }

  const links: { href: string; label: string }[] =
    appUser.role === "client"
      ? [{ href: "/portal", label: "Suivi de collecte" }]
      : appUser.role === "manager"
        ? [{ href: "/manager", label: "← Manager" }]
        : [
            { href: "/releves", label: "Relevés" },
            { href: "/rapports", label: "Rapports" },
          ];

  return (
    <div data-theme="dark" className="min-h-screen bg-page text-body print:bg-white">
      <div className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-7)">
        <header className="mb-(--space-7) flex flex-wrap items-center justify-between gap-(--space-4) border-b border-divider pb-(--space-4) print:hidden">
          <div>
            <Logo className="h-4 w-auto text-heading" />
            <div className="mt-(--space-2)">
              <Eyebrow>Commandes</Eyebrow>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-(--space-5) text-xs uppercase tracking-label text-muted">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-heading">
                {link.label}
              </Link>
            ))}
            <form action={signOut}>
              <button type="submit" className="text-xs uppercase tracking-label text-muted focus-ring hover:text-heading">
                Déconnexion →
              </button>
            </form>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
