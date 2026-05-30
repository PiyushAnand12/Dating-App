import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Samantha...');

  // 1. Create Samantha with a dev-user- prefix to force online status
  const samantha = await prisma.user.upsert({
    where: { email: 'samantha@example.com' },
    update: {
      lastActiveAt: new Date()
    },
    create: {
      id: 'dev-user-samantha',
      email: 'samantha@example.com',
      firebaseUid: 'fb_samantha',
      firstName: 'Samantha',
      gender: 'WOMAN',
      city: 'Mumbai',
      latitude: 19.0760,
      longitude: 72.8777,
      bio: 'Lover of life, travel, and deep conversations. Let\'s chat!',
      dateOfBirth: new Date('1997-06-20'),
      profileStatus: 'APPROVED',
      isProfileComplete: true,
      discoverEnabled: true,
      relationshipGoal: 'LONG_TERM_PARTNER',
      lastActiveAt: new Date(),
      preferences: {
        create: {
          hideDistance: false,
          distanceUnit: 'KM'
        }
      },
      photos: {
        create: {
          url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
          position: 0,
          status: 'APPROVED'
        }
      }
    },
  });

  console.log('Samantha created:', samantha.id);

  // 2. Ensure Match with dev-user-1
  const devUserId = 'dev-user-1';
  
  // Check if dev user exists first
  let devUser = await prisma.user.findUnique({ where: { id: devUserId } });
  if (!devUser) {
    console.log('Creating dev-user-1 since it does not exist...');
    devUser = await prisma.user.create({
      data: {
        id: devUserId,
        email: 'dev@example.com',
        firstName: 'Dev',
        profileStatus: 'APPROVED',
        isProfileComplete: true,
        discoverEnabled: true
      }
    });
  }

  const match = await prisma.match.upsert({
    where: {
      user1Id_user2Id: {
        user1Id: devUserId < samantha.id ? devUserId : samantha.id,
        user2Id: devUserId < samantha.id ? samantha.id : devUserId,
      }
    },
    update: {},
    create: {
      user1Id: devUserId < samantha.id ? devUserId : samantha.id,
      user2Id: devUserId < samantha.id ? samantha.id : devUserId
    }
  });

  console.log('Match created/verified:', match.id);

  // 3. Add an initial message
  await prisma.message.create({
    data: {
      senderId: samantha.id,
      receiverId: devUserId,
      body: 'Hey! I saw we matched. How are you doing today?',
      type: 'TEXT',
      status: 'SENT'
    }
  });

  console.log('Initial message sent from Samantha.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
