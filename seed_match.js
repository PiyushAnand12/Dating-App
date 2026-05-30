import prisma from './src/config/prisma.js';

async function seedMatch() {
  // Create two users
  const user1 = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      id: 'dev-user-1',
      email: 'dev@example.com',
      firstName: 'Dev',
      firebaseUid: 'dev-uid-1',
      isActive: true,
      profileStatus: 'APPROVED'
    }
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'match@example.com' },
    update: {},
    create: {
      id: 'dev-user-2',
      email: 'match@example.com',
      firstName: 'Samantha',
      firebaseUid: 'dev-uid-2',
      isActive: true,
      profileStatus: 'APPROVED',
      photos: {
        create: {
          url: '/images/profile1.png',
          position: 0,
          status: 'APPROVED'
        }
      }
    }
  });

  // Create match
  await prisma.match.upsert({
    where: {
      user1Id_user2Id: {
        user1Id: user1.id < user2.id ? user1.id : user2.id,
        user2Id: user1.id < user2.id ? user2.id : user1.id
      }
    },
    update: {},
    create: {
      user1Id: user1.id < user2.id ? user1.id : user2.id,
      user2Id: user1.id < user2.id ? user2.id : user1.id
    }
  });

  console.log('Seed match created between Dev and Samantha');
}

seedMatch().catch(console.error).finally(() => prisma.$disconnect());
