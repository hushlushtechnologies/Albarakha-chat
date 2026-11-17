import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { adminConfigured, currentStaff } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Leads | Albarakha Investment",
  robots: { index: false, follow: false },
};

// Sales team dashboard. Staff logins come from ADMIN_USERS in the environment.
export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const staff = await currentStaff();
  if (!staff) return <AdminLogin configured={adminConfigured()} />;
  return <AdminDashboard staff={staff} />;
}
