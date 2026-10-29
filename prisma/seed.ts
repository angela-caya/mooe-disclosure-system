import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from your environment.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting MOOE database seeding (Users Only)...");

  await prisma.user.deleteMany(); 

  const principalPassword = await bcrypt.hash("admin123", 10);
  const officerPassword = await bcrypt.hash("disbursing123", 10);

  console.log("Seeding Principal account...");
  await prisma.user.upsert({
    where: { email: "admin@school.edu.ph" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@school.edu.ph",
      password: principalPassword,
      role: Role.PRINCIPAL,
    },
  });

  console.log("Seeding Disbursing Officer account...");
  await prisma.user.upsert({
    where: { email: "disbursing@school.edu.ph" },
    update: {},
    create: {
      name: "Disbursing Officer",
      email: "disbursing@school.edu.ph",
      password: officerPassword,
      role: Role.DISBURSING_OFFICER,
    },
  });

  console.log("User seeding completed successfully.");
  console.log("-----------------------------------------");
  console.log("Test accounts:");
  console.log("Principal          : admin@school.edu.ph / admin123");
  console.log("Disbursing Officer : disbursing@school.edu.ph / disbursing123");
  console.log("-----------------------------------------");
}

main()
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });