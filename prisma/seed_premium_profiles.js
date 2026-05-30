import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ncrLocations = [
  { city: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { city: 'Gurgaon', lat: 28.4595, lon: 77.0266 },
  { city: 'Noida', lat: 28.5355, lon: 77.3910 },
  { city: 'Faridabad', lat: 28.4089, lon: 77.3178 },
  { city: 'Ghaziabad', lat: 28.6692, lon: 77.4538 }
];

const premiumUsers = [
  {
    email: 'advika.v@example.com',
    firstName: 'Advika',
    lastName: 'Verma',
    gender: 'WOMAN',
    bio: 'Luxury travel blogger & wine enthusiast. Looking for someone to share high-altitude adventures and fine dining. 🍷✈️',
    dateOfBirth: new Date('1995-06-15'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'kabir.m@example.com',
    firstName: 'Kabir',
    lastName: 'Malhotra',
    gender: 'MAN',
    bio: 'Venture Capitalist by day, amateur astronomer by night. Always looking for the next big thing or a new galaxy. 🚀✨',
    dateOfBirth: new Date('1992-04-20'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'zoya.s@example.com',
    firstName: 'Zoya',
    lastName: 'Sayeed',
    gender: 'WOMAN',
    bio: 'International human rights lawyer. Passionate about art history and sustainable fashion. Let\'s talk philosophy. ⚖️🎨',
    dateOfBirth: new Date('1994-01-12'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'aryan.k@example.com',
    firstName: 'Aryan',
    lastName: 'Kapoor',
    gender: 'MAN',
    bio: 'Ex-Google engineer now building a clean-tech startup. I play polo on weekends and love jazz. 🏇🎷',
    dateOfBirth: new Date('1993-08-30'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'kiara.r@example.com',
    firstName: 'Kiara',
    lastName: 'Rao',
    gender: 'WOMAN',
    bio: 'Interior Designer for luxury hotels. If you have a good eye for aesthetics and a great playlist, we\'ll match. 🏡🎶',
    dateOfBirth: new Date('1997-11-05'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'vihaan.p@example.com',
    firstName: 'Vihaan',
    lastName: 'Patel',
    gender: 'MAN',
    bio: 'Restaurateur and world traveler. I live for the perfect espresso and spontaneous trips to Paris. ☕🗼',
    dateOfBirth: new Date('1990-03-25'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'sanaya.t@example.com',
    firstName: 'Sanaya',
    lastName: 'Thakur',
    gender: 'WOMAN',
    bio: 'Fashion Editor at a top magazine. I love vintage shopping and Sunday polo matches. 👗🏇',
    dateOfBirth: new Date('1996-09-18'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'ishan.g@example.com',
    firstName: 'Ishan',
    lastName: 'Grover',
    gender: 'MAN',
    bio: 'Commercial pilot who loves being grounded sometimes. I enjoy cooking Italian and reading sci-fi. ✈️🍝',
    dateOfBirth: new Date('1991-12-08'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'myra.d@example.com',
    firstName: 'Myra',
    lastName: 'Dubey',
    gender: 'WOMAN',
    bio: 'Surgeon by profession, poet by soul. Looking for deep conversations and a partner in crime. 🩺✍️',
    dateOfBirth: new Date('1992-07-22'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'dev.a@example.com',
    firstName: 'Dev',
    lastName: 'Arora',
    gender: 'MAN',
    bio: 'Architectural photographer. I see beauty in symmetry and chaos. Let\'s explore hidden urban gems. 📷🏛️',
    dateOfBirth: new Date('1994-05-14'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'anya.k@example.com',
    firstName: 'Anya',
    lastName: 'Kaur',
    gender: 'WOMAN',
    bio: 'Professional equestrian and animal lover. I value authenticity and a good sense of humor. 🐎❤️',
    dateOfBirth: new Date('1998-02-28'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'sidharth.m@example.com',
    firstName: 'Sidharth',
    lastName: 'Malhotra',
    gender: 'MAN',
    bio: 'Creative Director at an ad agency. I love minimalist design and maximalist brunches. 🎨🥐',
    dateOfBirth: new Date('1993-10-10'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'tanya.c@example.com',
    firstName: 'Tanya',
    lastName: 'Chopra',
    gender: 'WOMAN',
    bio: 'Perfumer creating bespoke scents. I can tell a lot about you by your choice of fragrance. 🧪🌸',
    dateOfBirth: new Date('1995-12-01'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'rehaan.x@example.com',
    firstName: 'Rehaan',
    lastName: 'Ahmed',
    gender: 'MAN',
    bio: 'Formula 1 engineer. Speed is my life, but I enjoy slow-drip coffee and long walks. 🏎️☕',
    dateOfBirth: new Date('1992-02-14'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'navya.s@example.com',
    firstName: 'Navya',
    lastName: 'Sahni',
    gender: 'WOMAN',
    bio: 'Art Curator for private collectors. If you can handle a museum date followed by street food, we\'re a match. 🖼️🥘',
    dateOfBirth: new Date('1996-08-05'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'armaan.j@example.com',
    firstName: 'Armaan',
    lastName: 'Jain',
    gender: 'MAN',
    bio: 'Investment Banker who actually likes his job. I run marathons and collect vinyl records. 🏃‍♂️💽',
    dateOfBirth: new Date('1990-11-22'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'siya.m@example.com',
    firstName: 'Siya',
    lastName: 'Mishra',
    gender: 'WOMAN',
    bio: 'Wildlife documentary filmmaker. I spend my time between tiger reserves and film festivals. 🐅🎬',
    dateOfBirth: new Date('1994-06-30'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'yuvraj.s@example.com',
    firstName: 'Yuvraj',
    lastName: 'Singh',
    gender: 'MAN',
    bio: 'Professional golfer. I value discipline, sportsmanship, and a great sense of style. ⛳🏌️‍♂️',
    dateOfBirth: new Date('1991-01-15'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'avni.b@example.com',
    firstName: 'Avni',
    lastName: 'Bose',
    gender: 'WOMAN',
    bio: 'Dancer and choreographer. I believe life is better when you\'re moving to the rhythm. 💃✨',
    dateOfBirth: new Date('1997-03-10'),
    tier: 'PLATINUM',
    photoUrl: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'neil.d@example.com',
    firstName: 'Neil',
    lastName: 'D\'souza',
    gender: 'MAN',
    bio: 'Craft brewer and dog lover. Let\'s find the best IPA and the dog-friendliest park. 🍺🐕',
    dateOfBirth: new Date('1993-09-05'),
    tier: 'GOLD',
    photoUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80'
  }
];

async function main() {
  console.log('Seeding 20 PREMIUM profiles in Delhi NCR...');

  const interests = await prisma.interest.findMany();

  for (let i = 0; i < premiumUsers.length; i++) {
    const p = premiumUsers[i];
    const loc = ncrLocations[i % ncrLocations.length];

    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        city: loc.city,
        latitude: loc.lat,
        longitude: loc.lon,
        isProfileComplete: true,
        discoverEnabled: true,
        profileStatus: 'APPROVED',
        subscriptionTier: p.tier,
      },
      create: {
        email: p.email,
        firebaseUid: `fb_${p.email.split('@')[0]}`,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        city: loc.city,
        latitude: loc.lat,
        longitude: loc.lon,
        bio: p.bio,
        dateOfBirth: p.dateOfBirth,
        jobTitle: p.bio.split('.')[0],
        company: 'Premium Member',
        livingIn: loc.city,
        relationshipGoal: 'LONG_TERM_PARTNER',
        profileStatus: 'APPROVED',
        isProfileComplete: true,
        discoverEnabled: true,
        isOnboarded: true,
        isVerified: true,
        subscriptionTier: p.tier,
        preferences: {
          create: {
            distanceUnit: 'KM',
            hideDistance: false,
            showMe: p.gender === 'MAN' ? 'WOMEN' : 'MEN'
          }
        },
        photos: {
          create: {
            url: p.photoUrl,
            position: 0,
            status: 'APPROVED'
          }
        }
      },
    });

    // Assign random interests
    const randomInterests = interests.sort(() => 0.5 - Math.random()).slice(0, 5);
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    await prisma.userInterest.createMany({
      data: randomInterests.map(interest => ({ userId: user.id, interestId: interest.id }))
    });

    // Add a boost for some
    if (i % 3 === 0) {
      await prisma.userBoost.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
        }
      });
    }

    console.log(`Added/Restored Premium Profile: ${p.firstName} (${p.tier})`);
  }

  console.log('Successfully seeded 20 PREMIUM profiles.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
