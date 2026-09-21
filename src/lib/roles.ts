export type Role = "operator" | "manager" | "client" | "city" | "commercial";

export function roleHome(role: Role): string {
  switch (role) {
    case "operator":
      return "/operator";
    case "manager":
      return "/manager";
    case "client":
      return "/commandes";
    case "city":
      return "/portal";
    case "commercial":
      return "/releves";
  }
}
