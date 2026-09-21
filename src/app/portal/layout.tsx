import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/supabase/session";
import { roleHome } from "@/lib/roles";
import { ClientHeader } from "@/components/ui/ClientHeader";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const appUser = await getAppUser();
  if (!appUser) redirect("/login");
  if (appUser.role !== "client" && appUser.role !== "city") redirect(roleHome(appUser.role));

  return (
    <div data-theme="dark" className="min-h-screen bg-page text-body">
      <ClientHeader role={appUser.role} />
      {children}
    </div>
  );
}
