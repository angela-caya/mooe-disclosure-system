
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Define the location of the Prisma data model.
  schema: "prisma/schema.prisma",

  migrations: {
    // Define where migration history and SQL files are stored.
    path: "prisma/migrations",

    // Define the command used to populate development/test data.
    seed: "tsx prisma/seed.ts",
  },

  // Load the database connection string from the environment.
  datasource: {
    url: env("DATABASE_URL"),
  },
});
