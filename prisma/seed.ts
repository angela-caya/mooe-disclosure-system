import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from 'bcryptjs'

// Setup Neon PostgreSQL adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Generate hashed passwords for the default accounts
  const adminPassword = await bcrypt.hash('admin123', 10)
  const disbursingPassword = await bcrypt.hash('disbursing123', 10)

  // Create the Principal / System Admin account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.edu.ph' },
    update: {}, // Leave existing data intact if the user already exists
    create: {
      email: 'admin@school.edu.ph',
      name: 'System Admin',
      password: adminPassword,
      role: 'PRINCIPAL',
    },
  })

  // Create the Disbursing Officer account
  const disbursingOfficer = await prisma.user.upsert({
    where: { email: 'disbursing@school.edu.ph' },
    update: {}, 
    create: {
      email: 'disbursing@school.edu.ph',
      name: 'Disbursing Officer',
      password: disbursingPassword,
      role: 'DISBURSING_OFFICER',
    },
  })

  // Log the credentials to the terminal for easy reference
  console.log('✅ Default accounts created successfully!')
  console.log('-------------------------------------------')
  console.log('Role: PRINCIPAL')
  console.log(`Email: ${admin.email}`)
  console.log(`Password: admin123`)
  console.log('-------------------------------------------')
  console.log('Role: DISBURSING_OFFICER')
  console.log(`Email: ${disbursingOfficer.email}`)
  console.log(`Password: disbursing123`)
  console.log('-------------------------------------------')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })