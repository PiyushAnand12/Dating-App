import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const interests = [
  { name: 'Photography', slug: 'photography', category: 'ARTS' },
  { name: 'Travel', slug: 'travel', category: 'TRAVEL' },
  { name: 'Cooking', slug: 'cooking', category: 'FOOD' },
  { name: 'Yoga', slug: 'yoga', category: 'FITNESS' },
  { name: 'Music', slug: 'music', category: 'MUSIC' },
  { name: 'Reading', slug: 'reading', category: 'EDUCATION' },
  { name: 'Gaming', slug: 'gaming', category: 'GAMING' },
  { name: 'Running', slug: 'running', category: 'FITNESS' },
  { name: 'Dancing', slug: 'dancing', category: 'ARTS' },
  { name: 'Movies', slug: 'movies', category: 'ARTS' },
  { name: 'Hiking', slug: 'hiking', category: 'SPORTS' },
  { name: 'Coffee', slug: 'coffee', category: 'FOOD' },
  { name: 'Art', slug: 'art', category: 'ARTS' },
  { name: 'Tech', slug: 'tech', category: 'TECHNOLOGY' },
  { name: 'Fitness', slug: 'fitness', category: 'FITNESS' },
  { name: 'Street Food', slug: 'street-food', category: 'FOOD' },
];

async function main() {
  console.log('Seeding interests...');

  // Create all interests
  const createdInterests = [];
  for (const int of interests) {
    const created = await prisma.interest.upsert({
      where: { slug: int.slug },
      update: {},
      create: int,
    });
    createdInterests.push(created);
  }
  console.log(`Created/found ${createdInterests.length} interests.`);

  // Assign interests to test profiles
  const users = await prisma.user.findMany({
    where: { profileStatus: 'APPROVED', isProfileComplete: true },
    select: { id: true, firstName: true },
  });

  for (const user of users) {
    // Assign 3-6 random interests per user
    const count = 3 + Math.floor(Math.random() * 4);
    const shuffled = [...createdInterests].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);

    for (const interest of picked) {
      await prisma.userInterest.upsert({
        where: {
          userId_interestId: { userId: user.id, interestId: interest.id }
        },
        update: {},
        create: {
          userId: user.id,
          interestId: interest.id,
        },
      });
    }
    console.log(`  ${user.firstName}: ${picked.map(p => p.name).join(', ')}`);
  }

  console.log('Done seeding interests!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
