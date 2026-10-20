import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { year, utilities, supplies, repairs, travel, training, others } = body;

    // Validate that all percentages add up to exactly 100
    const total = utilities + supplies + repairs + travel + training + others;
    if (total !== 100) {
      return NextResponse.json(
        { error: "Total allocation must equal exactly 100%" },
        { status: 400 }
      );
    }

    // Upsert ensures we only have one setting record per fiscal year
    const aipSetting = await prisma.aIPSetting.upsert({
      where: { year },
      update: {
        utilitiesPercent: utilities / 100,
        suppliesPercent: supplies / 100,
        repairsPercent: repairs / 100,
        travelPercent: travel / 100,
        trainingPercent: training / 100,
        othersPercent: others / 100,
      },
      create: {
        year,
        utilitiesPercent: utilities / 100,
        suppliesPercent: supplies / 100,
        repairsPercent: repairs / 100,
        travelPercent: travel / 100,
        trainingPercent: training / 100,
        othersPercent: others / 100,
      },
    });

    return NextResponse.json({ success: true, aipSetting }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving AIP settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}