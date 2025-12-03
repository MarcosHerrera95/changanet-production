import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  database: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
})
