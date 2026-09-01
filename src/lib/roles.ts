export type Role = "operator" | "manager" | "client" | "city";

export function roleHome(role: Role): string {
  switch (role) {
    case "operator":
      return "/operator";
    case "manager":
      return "/manager";
    case "client":
    case "city":
      return "/portal";
  }
}
