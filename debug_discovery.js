import discoveryService from './src/modules/user/discovery.service.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const currentUserId = 'cmojnk3jf000014hhqwjwou99';
  
  // Directly test the raw query to see column names
  const raw = await prisma.$queryRawUnsafe(`
    SELECT u.*, p."hideDistance"
    FROM "users" u
    LEFT JOIN "user_preferences" p ON u."id" = p."userId"
    LIMIT 1
  `);
  console.log('Raw query keys:', Object.keys(raw[0]));
  console.log('hideDistance value:', raw[0].hideDistance);
}

main().catch(console.error).finally(() => prisma.$disconnect());
