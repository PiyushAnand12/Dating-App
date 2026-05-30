import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ncrLocations = [
  { city: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { city: 'Gurgaon', lat: 28.4595, lon: 77.0266 },
  { city: 'Noida', lat: 28.5355, lon: 77.3910 },
  { city: 'Faridabad', lat: 28.4089, lon: 77.3178 },
  { city: 'Ghaziabad', lat: 28.6692, lon: 77.4538 }
];

const craftedProfiles = [
  {
    email: 'zoya.malik@example.com',
    firstName: 'Zoya',
    lastName: 'Malik',
    gender: 'WOMAN',
    bio: 'Architect by day, salsa dancer by night. Always hunting for the best cold brew in the city. ☕💃',
    dateOfBirth: new Date('1996-03-12'),
    jobTitle: 'Senior Architect',
    company: 'Design Collective',
    livingIn: 'Indiranagar',
    relationshipGoal: 'LONG_TERM_PARTNER',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'arjun.mehta@example.com',
    firstName: 'Arjun',
    lastName: 'Mehta',
    gender: 'MAN',
    bio: 'Product Designer who loves mountains more than beaches. Looking for someone to share hiking stories and good wine. 🏔️🍷',
    dateOfBirth: new Date('1994-11-25'),
    jobTitle: 'Product Lead',
    company: 'FinTech Hub',
    livingIn: 'Bandra West',
    relationshipGoal: 'LONG_TERM_BUT_OPEN',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'kiara.advani.test@example.com',
    firstName: 'Kiara',
    lastName: 'Singh',
    gender: 'WOMAN',
    bio: 'Yoga instructor and amateur ceramicist. I believe in mindful living and the power of a good laugh. Let\'s explore the city together! ✨🧘‍♀️',
    dateOfBirth: new Date('1998-07-15'),
    jobTitle: 'Wellness Coach',
    company: 'Soul Space',
    livingIn: 'Hauz Khas',
    relationshipGoal: 'NEW_FRIENDS',
    photoUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'rohan.khanna@example.com',
    firstName: 'Rohan',
    lastName: 'Khanna',
    gender: 'MAN',
    bio: 'Tech entrepreneur and weekend pilot. I love exploring new cuisines and watching old-school Bollywood. ✈️🥘',
    dateOfBirth: new Date('1992-05-08'),
    jobTitle: 'Founder',
    company: 'NextGen AI',
    livingIn: 'Jubilee Hills',
    relationshipGoal: 'LONG_TERM_PARTNER',
    photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'sara.ali@example.com',
    firstName: 'Sara',
    lastName: 'Ali',
    gender: 'WOMAN',
    bio: 'Journalist with a passion for untold stories. If you can keep up with my puns, we\'ll get along just fine. 🗞️🎙️',
    dateOfBirth: new Date('1997-01-20'),
    jobTitle: 'Senior Reporter',
    company: 'The Daily Times',
    livingIn: 'Koregaon Park',
    relationshipGoal: 'SHORT_TERM_BUT_OPEN',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'ishaan.sharma@example.com',
    firstName: 'Ishaan',
    lastName: 'Sharma',
    gender: 'MAN',
    bio: 'Fitness enthusiast and dog dad. Looking for someone who enjoys morning runs and quiet evenings. 🐕🏋️‍♂️',
    dateOfBirth: new Date('1995-09-30'),
    jobTitle: 'Operations Manager',
    company: 'Global Logistics',
    livingIn: 'Sector 17',
    relationshipGoal: 'STILL_FIGURING_OUT',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'meera.nair@example.com',
    firstName: 'Meera',
    lastName: 'Nair',
    gender: 'WOMAN',
    bio: 'Ocean lover and scuba diver. I live for the weekend adventures and the peace of the sea. 🌊🐚',
    dateOfBirth: new Date('1999-10-10'),
    jobTitle: 'Marine Biologist',
    company: 'Oceanic Research',
    livingIn: 'Fort Kochi',
    relationshipGoal: 'SHORT_TERM_FUN',
    photoUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'kabir.singh@example.com',
    firstName: 'Kabir',
    lastName: 'Singh',
    gender: 'MAN',
    bio: 'Photographer capturing the soul of the Pink City. I appreciate art, history, and a good cup of masala chai. 📸🍵',
    dateOfBirth: new Date('1993-12-15'),
    jobTitle: 'Travel Photographer',
    company: 'Freelance',
    livingIn: 'C-Scheme',
    relationshipGoal: 'LONG_TERM_PARTNER',
    photoUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'neha.kapoor@example.com',
    firstName: 'Neha',
    lastName: 'Kapoor',
    gender: 'WOMAN',
    bio: 'Foodie by choice, consultant by profession. Let\'s find the best hidden gems in the city! 🍕✨',
    dateOfBirth: new Date('1996-04-22'),
    jobTitle: 'Strategy Consultant',
    company: 'Big Four',
    livingIn: 'DLF Phase 5',
    relationshipGoal: 'STILL_FIGURING_OUT',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
  },
  {
    email: 'vikram.seth@example.com',
    firstName: 'Vikram',
    lastName: 'Seth',
    gender: 'MAN',
    bio: 'Classical musician with a modern twist. I love deep conversations over street food and the magic of old Calcutta. 🎻🥟',
    dateOfBirth: new Date('1991-08-18'),
    jobTitle: 'Musician',
    company: 'Arts Academy',
    livingIn: 'Park Street',
    relationshipGoal: 'LONG_TERM_BUT_OPEN',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
  }
];

async function main() {
  console.log('Seeding 10 highly crafted profiles in Delhi NCR...');

  const interests = await prisma.interest.findMany();

  for (let i = 0; i < craftedProfiles.length; i++) {
    const p = craftedProfiles[i];
    const loc = ncrLocations[i % ncrLocations.length];

    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        city: loc.city,
        latitude: loc.lat,
        longitude: loc.lon,
        isProfileComplete: true,
        discoverEnabled: true,
        profileStatus: 'APPROVED'
      },
      create: {
        email: p.email,
        firebaseUid: `fb_${p.email.split('@')[0]}`,
        firstName: p.firstName,
        gender: p.gender,
        city: loc.city,
        latitude: loc.lat,
        longitude: loc.lon,
        bio: p.bio,
        dateOfBirth: p.dateOfBirth,
        jobTitle: p.jobTitle,
        company: p.company,
        livingIn: loc.city,
        relationshipGoal: p.relationshipGoal,
        profileStatus: 'APPROVED',
        isProfileComplete: true,
        discoverEnabled: true,
        isOnboarded: true,
        isVerified: true,
        preferences: {
          create: {
            distanceUnit: 'KM',
            hideDistance: false
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
    const randomInterests = interests.sort(() => 0.5 - Math.random()).slice(0, 3);
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    await prisma.userInterest.createMany({
      data: randomInterests.map(interest => ({ userId: user.id, interestId: interest.id }))
    });

    console.log(`Updated ${p.firstName} to be in ${loc.city}`);
  }

  console.log('Successfully seeded 10 NCR-based crafted profiles.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
