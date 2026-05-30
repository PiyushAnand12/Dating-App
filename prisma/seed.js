import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const interests = [
  // SPORTS
  { name: 'Football',      slug: 'football',       category: 'SPORTS' },
  { name: 'Basketball',    slug: 'basketball',     category: 'SPORTS' },
  { name: 'Cricket',       slug: 'cricket',        category: 'SPORTS' },
  { name: 'Tennis',        slug: 'tennis',         category: 'SPORTS' },
  { name: 'Swimming',      slug: 'swimming',       category: 'SPORTS' },
  { name: 'Cycling',       slug: 'cycling',        category: 'SPORTS' },
  { name: 'Running',       slug: 'running',        category: 'SPORTS' },
  { name: 'Yoga',          slug: 'yoga',           category: 'SPORTS' },

  // FITNESS
  { name: 'Gym',           slug: 'gym',            category: 'FITNESS' },
  { name: 'Pilates',       slug: 'pilates',        category: 'FITNESS' },
  { name: 'Hiking',        slug: 'hiking',         category: 'FITNESS' },
  { name: 'Martial Arts',  slug: 'martial-arts',   category: 'FITNESS' },
  { name: 'Rock Climbing', slug: 'rock-climbing',  category: 'FITNESS' },

  // MUSIC
  { name: 'Pop',           slug: 'pop',            category: 'MUSIC' },
  { name: 'Hip Hop',       slug: 'hip-hop',        category: 'MUSIC' },
  { name: 'Jazz',          slug: 'jazz',           category: 'MUSIC' },
  { name: 'Classical',     slug: 'classical',      category: 'MUSIC' },
  { name: 'Rock',          slug: 'rock',           category: 'MUSIC' },
  { name: 'Electronic',    slug: 'electronic',     category: 'MUSIC' },
  { name: 'Playing Guitar',slug: 'playing-guitar', category: 'MUSIC' },
  { name: 'Singing',       slug: 'singing',        category: 'MUSIC' },

  // ARTS
  { name: 'Photography',   slug: 'photography',    category: 'ARTS' },
  { name: 'Painting',      slug: 'painting',       category: 'ARTS' },
  { name: 'Drawing',       slug: 'drawing',        category: 'ARTS' },
  { name: 'Sculpting',     slug: 'sculpting',      category: 'ARTS' },
  { name: 'Film Making',   slug: 'film-making',    category: 'ARTS' },
  { name: 'Dancing',       slug: 'dancing',        category: 'ARTS' },
  { name: 'Theatre',       slug: 'theatre',        category: 'ARTS' },

  // TRAVEL
  { name: 'Backpacking',   slug: 'backpacking',    category: 'TRAVEL' },
  { name: 'Road Trips',    slug: 'road-trips',     category: 'TRAVEL' },
  { name: 'Camping',       slug: 'camping',        category: 'TRAVEL' },
  { name: 'City Breaks',   slug: 'city-breaks',    category: 'TRAVEL' },
  { name: 'Beach Holidays',slug: 'beach-holidays', category: 'TRAVEL' },

  // FOOD
  { name: 'Cooking',       slug: 'cooking',        category: 'FOOD' },
  { name: 'Baking',        slug: 'baking',         category: 'FOOD' },
  { name: 'Wine Tasting',  slug: 'wine-tasting',   category: 'FOOD' },
  { name: 'Coffee',        slug: 'coffee',         category: 'FOOD' },
  { name: 'Vegan Food',    slug: 'vegan-food',     category: 'FOOD' },
  { name: 'Street Food',   slug: 'street-food',    category: 'FOOD' },

  // GAMING
  { name: 'Video Games',   slug: 'video-games',    category: 'GAMING' },
  { name: 'Board Games',   slug: 'board-games',    category: 'GAMING' },
  { name: 'Chess',         slug: 'chess',          category: 'GAMING' },
  { name: 'Esports',       slug: 'esports',        category: 'GAMING' },
  { name: 'VR Gaming',     slug: 'vr-gaming',      category: 'GAMING' },

  // TECHNOLOGY
  { name: 'Programming',   slug: 'programming',    category: 'TECHNOLOGY' },
  { name: 'AI & ML',       slug: 'ai-ml',          category: 'TECHNOLOGY' },
  { name: 'Crypto',        slug: 'crypto',         category: 'TECHNOLOGY' },
  { name: 'Gadgets',       slug: 'gadgets',        category: 'TECHNOLOGY' },
  { name: 'Robotics',      slug: 'robotics',       category: 'TECHNOLOGY' },

  // EDUCATION
  { name: 'Reading',       slug: 'reading',        category: 'EDUCATION' },
  { name: 'Writing',       slug: 'writing',        category: 'EDUCATION' },
  { name: 'Languages',     slug: 'languages',      category: 'EDUCATION' },
  { name: 'History',       slug: 'history',        category: 'EDUCATION' },
  { name: 'Philosophy',    slug: 'philosophy',     category: 'EDUCATION' },
  { name: 'Science',       slug: 'science',        category: 'EDUCATION' },
  { name: 'Podcasts',      slug: 'podcasts',       category: 'EDUCATION' },

  // OTHER
  { name: 'Volunteering',  slug: 'volunteering',   category: 'OTHER' },
  { name: 'Astrology',     slug: 'astrology',      category: 'OTHER' },
  { name: 'Meditation',    slug: 'meditation',     category: 'OTHER' },
  { name: 'Pets',          slug: 'pets',           category: 'OTHER' },
  { name: 'Fashion',       slug: 'fashion',        category: 'OTHER' },
  { name: 'Comedy',        slug: 'comedy',         category: 'OTHER' },
];

async function main() {
  console.log('Seeding interests...');

  for (const interest of interests) {
    await prisma.interest.upsert({
      where:  { slug: interest.slug },
      update: { name: interest.name, category: interest.category },
      create: interest,
    });
  }

  console.log(`Seeded ${interests.length} interests.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
