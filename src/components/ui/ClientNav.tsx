"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; match: "exact" | "prefix" };

export function ClientNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring border-b pb-1 hover:text-heading ${active ? "border-accent text-heading" : "border-transparent"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
