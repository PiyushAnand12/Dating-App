import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ncrLocations = [
  { city: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { city: 'Gurgaon', lat: 28.4595, lon: 77.0266 },
  { city: 'Noida', lat: 28.5355, lon: 77.3910 },
  { city: 'Faridabad', lat: 28.4089, lon: 77.3178 },
  { city: 'Ghaziabad', lat: 28.6692, lon: 77.4538 }
];

const users = [
  {
    email: 'priya.sharma@example.com',
    firstName: 'Priya',
    lastName: 'Sharma',
    gender: 'WOMAN',
    bio: 'Love dancing and street food! Searching for a travel partner.',
    dateOfBirth: new Date('1998-05-15'),
    isBoosted: true,
    hideDistance: false,
    relationshipGoal: 'LONG_TERM_PARTNER'
  },
  {
    email: 'sneha.reddy@example.com',
    firstName: 'Sneha',
    lastName: 'Reddy',
    gender: 'WOMAN',
    bio: 'Tech by day, yoga by night. Coffee enthusiast.',
    dateOfBirth: new Date('1996-11-20'),
    isBoosted: false,
    hideDistance: true,
    relationshipGoal: 'NEW_FRIENDS'
  },
  {
    email: 'ananya.iyer@example.com',
    firstName: 'Ananya',
    lastName: 'Iyer',
    gender: 'WOMAN',
    bio: 'Classical singer and bookworm. Let\'s discuss philosophy.',
    dateOfBirth: new Date('2000-02-10'),
    isBoosted: true,
    hideDistance: true,
    relationshipGoal: 'LONG_TERM_BUT_OPEN'
  },
  {
    email: 'kavya.nair@example.com',
    firstName: 'Kavya',
    lastName: 'Nair',
    gender: 'WOMAN',
    bio: 'Beach lover and sunset chaser. Looking for someone fun.',
    dateOfBirth: new Date('1997-08-30'),
    isBoosted: false,
    hideDistance: false,
    relationshipGoal: 'SHORT_TERM_FUN'
  },
  {
    email: 'riya.gupta@example.com',
    firstName: 'Riya',
    lastName: 'Gupta',
    gender: 'WOMAN',
    bio: 'Artist and foodie. Can beat you at chess!',
    dateOfBirth: new Date('1999-12-25'),
    isBoosted: true,
    hideDistance: false,
    relationshipGoal: 'STILL_FIGURING_OUT'
  },
  {
    email: 'isha.khanna@example.com',
    firstName: 'Isha',
    lastName: 'Khanna',
    gender: 'WOMAN',
    bio: 'Marketing pro, animal lover. Always up for a road trip.',
    dateOfBirth: new Date('1995-04-12'),
    isBoosted: false,
    hideDistance: true,
    relationshipGoal: 'NEW_FRIENDS'
  },
  {
    email: 'megha.patel@example.com',
    firstName: 'Megha',
    lastName: 'Patel',
    gender: 'WOMAN',
    bio: 'Baking is my passion. Sweet but spicy.',
    dateOfBirth: new Date('2001-07-18'),
    isBoosted: true,
    hideDistance: false,
    relationshipGoal: 'LONG_TERM_PARTNER'
  },
  {
    email: 'tanvi.joshi@example.com',
    firstName: 'Tanvi',
    lastName: 'Joshi',
    gender: 'WOMAN',
    bio: 'Mountain girl at heart. Let\'s go hiking!',
    dateOfBirth: new Date('1994-09-05'),
    isBoosted: false,
    hideDistance: false,
    relationshipGoal: 'SHORT_TERM_BUT_OPEN'
  },
  {
    email: 'sanya.malhotra@example.com',
    firstName: 'Sanya',
    lastName: 'Malhotra',
    gender: 'WOMAN',
    bio: 'Fitness freak and dog mom. High energy only.',
    dateOfBirth: new Date('1998-03-22'),
    isBoosted: true,
    hideDistance: true,
    relationshipGoal: 'LONG_TERM_PARTNER'
  },
  {
    email: 'aditi.verma@example.com',
    firstName: 'Aditi',
    lastName: 'Verma',
    gender: 'WOMAN',
    bio: 'Royal at heart, simple in life. Tea over coffee.',
    dateOfBirth: new Date('1996-06-08'),
    isBoosted: false,
    hideDistance: false,
    relationshipGoal: 'STILL_FIGURING_OUT'
  }
];

async function main() {
  console.log('Seeding 10 test profiles in Delhi NCR...');

  const interests = await prisma.interest.findMany();

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const loc = ncrLocations[i % ncrLocations.length];

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        city: loc.city,
        latitude: loc.lat,
        longitude: loc.lon,
        profileStatus: 'APPROVED',
        isProfileComplete: true,
        discoverEnabled: true
      },
      create: {
        email: u.email,
        firebaseUid: `fb_${u.email.split('@')[0]}`,
        firstName: u.firstName,
        gender: u.gender,
        city: loc.city,
        latitude: loc.lat,
        longitude: loc.lon,
        bio: u.bio,
        dateOfBirth: u.dateOfBirth,
        profileStatus: 'APPROVED',
        isProfileComplete: true,
        discoverEnabled: true,
        relationshipGoal: u.relationshipGoal,
        preferences: {
          create: {
            hideDistance: u.hideDistance,
            distanceUnit: 'KM'
          }
        },
        photos: {
          create: {
            url: `https://i.pravatar.cc/600?u=${u.email}`,
            position: 0,
            status: 'APPROVED'
          }
        }
      },
    });

    if (u.isBoosted) {
      await prisma.userBoost.deleteMany({ where: { userId: user.id } });
      await prisma.userBoost.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    }

    // Assign random interests
    const randomInterests = interests.sort(() => 0.5 - Math.random()).slice(0, 3);
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    await prisma.userInterest.createMany({
      data: randomInterests.map(interest => ({ userId: user.id, interestId: interest.id }))
    });
    
    console.log(`Updated ${u.firstName} to be in ${loc.city}`);
  }

  console.log('Successfully seeded 10 NCR-based test profiles.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
