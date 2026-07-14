import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Navbar } from "@/components/Navbar";
import { AdminClient } from "./AdminClient";

// This page checks the live session and admin status on every request —
// it must never be statically pre-rendered at build time.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();

  // Authoritative admin check — this is what actually protects the page.
  // (Middleware only checked for a session cookie's presence.)
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-void">
      <Navbar />
      <AdminClient adminName={user.username} />
    </main>
  );
}
