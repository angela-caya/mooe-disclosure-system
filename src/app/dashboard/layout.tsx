import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Fetch the secure server session
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  // 2. Extract necessary user details
  const userRole = session.user.role || "DISBURSING_OFFICER";
  const userName = session.user.name || session.user.email || "User";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Persistent Sidebar (Client Component) */}
      <Sidebar userName={userName} userRole={userRole} />

      {/* Main Content Area (Server & Client Pages inject here) */}
      <main className="flex-1 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}