"use client";

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button type="button" variant="ghost" onClick={() => window.print()} className="print:hidden">
      Imprimer / PDF →
    </Button>
  );
}
