import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Creating persistent Dev Users...');

  const devUser1 = await prisma.user.upsert({
    where: { id: 'dev-user-1' },
    update: {
        kycVideoUrl: 'https://example.com/kyc.mp4',
        profileStatus: 'APPROVED'
    },
    create: {
      id: 'dev-user-1',
      email: 'testuser@example.com',
      firebaseUid: 'fb_testuser',
      firstName: 'Test',
      gender: 'MAN',
      city: 'Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      bio: 'Just a dev testing things.',
      dateOfBirth: new Date('1990-01-01'),
      profileStatus: 'APPROVED',
      isProfileComplete: true,
      discoverEnabled: true,
      isOnboarded: true,
      role: 'USER',
      kycVideoUrl: 'https://example.com/kyc.mp4',
      preferences: {
        create: {
          showMe: 'WOMEN',
          minAge: 18,
          maxAge: 99,
          maxDistanceKm: 100,
          relationshipGoals: ['LONG_TERM_PARTNER'],
          distanceUnit: 'KM'
        }
      }
    },
  });

  const devUser2 = await prisma.user.upsert({
    where: { id: 'dev-user-2' },
    update: {
        kycVideoUrl: 'https://example.com/kyc.mp4',
        profileStatus: 'APPROVED'
    },
    create: {
      id: 'dev-user-2',
      email: 'dev2@example.com',
      firebaseUid: 'fb_dev2',
      firstName: 'Riya',
      gender: 'WOMAN',
      city: 'Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      bio: 'Another dev user.',
      dateOfBirth: new Date('1992-05-20'),
      profileStatus: 'APPROVED',
      isProfileComplete: true,
      discoverEnabled: true,
      isOnboarded: true,
      role: 'USER',
      kycVideoUrl: 'https://example.com/kyc.mp4',
      preferences: {
        create: {
          showMe: 'MEN',
          distanceUnit: 'KM'
        }
      }
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { id: 'dev-admin-1' },
    update: {
        kycVideoUrl: 'https://example.com/kyc.mp4',
        profileStatus: 'APPROVED'
    },
    create: {
      id: 'dev-admin-1',
      email: 'admin@example.com',
      firebaseUid: 'fb_admin',
      firstName: 'Admin',
      role: 'ADMIN',
      profileStatus: 'APPROVED',
      isProfileComplete: true,
      isOnboarded: true,
      kycVideoUrl: 'https://example.com/kyc.mp4'
    }
  });

  // Add dummy photos for dev users
  const devUserIds = ['dev-user-1', 'dev-user-2'];
  for (const uid of devUserIds) {
    await prisma.photo.upsert({
      where: { id: `photo_${uid}` },
      update: {
          status: 'APPROVED'
      },
      create: {
        id: `photo_${uid}`,
        userId: uid,
        url: `https://i.pravatar.cc/600?u=${uid}`,
        status: 'APPROVED'
      }
    });
  }

  console.log('Dev users created successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
