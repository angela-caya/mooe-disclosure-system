import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AIPSettingsForm from "@/src/components/AIPSettingsForm";

export default async function PrincipalSettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }

  // Strict role enforcement
  if (session.user.role !== "PRINCIPAL") {
    redirect('/dashboard');
  }

  const currentYear = 2026;

  // Fetch existing settings or provide DepEd standard defaults
  const settings = await prisma.aIPSetting.findUnique({
    where: { year: currentYear }
  });

  const initialData = settings ? {
    utilities: settings.utilitiesPercent * 100,
    supplies: settings.suppliesPercent * 100,
    repairs: settings.repairsPercent * 100,
    travel: settings.travelPercent * 100,
    training: settings.trainingPercent * 100,
    others: settings.othersPercent * 100,
  } : {
    utilities: 30, supplies: 30, repairs: 20, travel: 5, training: 5, others: 10
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
          <p className="text-gray-600">Manage the Annual Implementation Plan (AIP) configuration for FY {currentYear}.</p>
        </div>
        
        <AIPSettingsForm year={currentYear} initialData={initialData} />
      </div>
    </div>
  );
}