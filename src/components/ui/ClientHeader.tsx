import { signOut } from "@/lib/auth-actions";
import { Logo } from "@/components/ui/Logo";
import { ClientNav, type NavItem } from "@/components/ui/ClientNav";

// Header for the customer-facing accounts (client + ville). Clients place
// orders; both can follow the collection and manage their account.
export function ClientHeader({ role }: { role: "client" | "city" }) {
  const items: NavItem[] = [
    ...(role === "client" ? [{ href: "/commandes", label: "Commandes", match: "prefix" as const }] : []),
    { href: "/portal", label: "Suivi de collecte", match: "exact" },
    { href: "/portal/compte", label: "Mon compte", match: "prefix" },
  ];

  return (
    <header className="mx-auto max-w-(--container-max) px-(--gutter) pt-(--space-4) print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-(--space-4) border-b border-divider pb-(--space-4)">
        <Logo className="h-4 w-auto text-heading" />
        <nav className="flex flex-wrap items-center gap-(--space-5) text-xs uppercase tracking-label text-muted">
          <ClientNav items={items} />
          <form action={signOut}>
            <button type="submit" className="border-b border-transparent pb-1 text-xs uppercase tracking-label text-muted focus-ring hover:text-heading">
              Déconnexion →
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
