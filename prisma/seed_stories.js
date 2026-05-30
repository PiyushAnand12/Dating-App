import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Stories for Premium Profiles...');

  const premiumProfileIds = [
    'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10',
    'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20'
  ];

  const stories = [
    {
      userId: 'p1', // Advika
      mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
      mediaType: 'IMAGE',
    },
    {
      userId: 'p1',
      mediaUrl: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800',
      mediaType: 'IMAGE',
    },
    {
      userId: 'p2', // Kabir
      mediaUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800',
      mediaType: 'IMAGE',
    },
    {
      userId: 'p3', // Zoya
      mediaUrl: 'https://images.unsplash.com/photo-1460666882142-d1599fa351eb?w=800',
      mediaType: 'IMAGE',
    },
    {
      userId: 'p4', // Aryan
      mediaUrl: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=800',
      mediaType: 'IMAGE',
    },
    {
      userId: 'p5', // Kiara
      mediaUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
      mediaType: 'IMAGE',
    },
  ];

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  for (const story of stories) {
    await prisma.story.create({
      data: {
        ...story,
        expiresAt,
        status: 'APPROVED',
      }
    });
  }

  console.log('✅ Stories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
