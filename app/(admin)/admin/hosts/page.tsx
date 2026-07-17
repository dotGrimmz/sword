import { redirect } from "next/navigation";

/** Deprecated — hosts were removed from the admin IA. */
export default function AdminHostsPage() {
  redirect("/admin");
}
