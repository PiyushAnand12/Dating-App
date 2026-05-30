import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Creating test matches for dev-user-1...');

  // Get test profiles to create matches with
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: 'dev-user-1' },
      profileStatus: 'APPROVED',
      isProfileComplete: true,
    },
    take: 5,
    select: { id: true, firstName: true }
  });

  for (const candidate of candidates) {
    // Ensure match doesn't already exist
    const existing = await prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: 'dev-user-1', user2Id: candidate.id },
          { user1Id: candidate.id, user2Id: 'dev-user-1' },
        ]
      }
    });

    if (!existing) {
      await prisma.match.create({
        data: {
          user1Id: 'dev-user-1',
          user2Id: candidate.id,
        }
      });
      console.log(`  Matched dev-user-1 with ${candidate.firstName}`);
    } else {
      console.log(`  Already matched with ${candidate.firstName}`);
    }

    // Add a seed message in the chat
    const msgExists = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: 'dev-user-1', receiverId: candidate.id },
          { senderId: candidate.id, receiverId: 'dev-user-1' },
        ]
      }
    });

    if (!msgExists) {
      await prisma.message.create({
        data: {
          senderId: candidate.id,
          receiverId: 'dev-user-1',
          body: `Hey! I think we matched 😊`,
          status: 'SENT',
        }
      });
      console.log(`  Added seed message from ${candidate.firstName}`);
    }
  }

  console.log('Done seeding matches and messages!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
