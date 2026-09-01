import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CreateClientForm } from "./CreateClientForm";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("client").select("*").order("name");

  return (
    <div>
      <Eyebrow>Clients</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Clients</h1>

      <div className="mt-(--space-6)">
        <CreateClientForm />
      </div>

      <div className="mt-(--space-6) flex flex-col">
        {((clients ?? []) as Client[]).map((client) => (
          <div key={client.id} className="border-t border-line py-(--space-3) text-sm text-black last:border-b">
            {client.name}
          </div>
        ))}
        {(clients ?? []).length === 0 ? <p className="py-(--space-3) text-sm text-charcoal/60">Aucun client.</p> : null}
      </div>
    </div>
  );
}
