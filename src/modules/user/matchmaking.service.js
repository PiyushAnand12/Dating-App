import prisma from '../../config/prisma.js';

/**
 * Standard Haversine distance formula
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Semantic Keyword Matcher
 * Simulates AI keyword extraction for lifestyle signals
 */
const LIFESTYLE_KEYWORDS = {
  fitness: ['gym', 'workout', 'running', 'yoga', 'athlete', 'fitness', 'swimming'],
  travel: ['travel', 'explore', 'adventure', 'mountains', 'beach', 'wanderlust', 'backpacker'],
  food: ['foodie', 'cooking', 'chef', 'sushi', 'pizza', 'vegan', 'baking', 'coffee'],
  creative: ['art', 'design', 'photography', 'painting', 'music', 'guitar', 'creative'],
  tech: ['tech', 'coding', 'gaming', 'software', 'developer', 'startup', 'crypto'],
  chill: ['netflix', 'reading', 'movies', 'relaxing', 'nature', 'meditation']
};

/**
 * Calculates a 0-100 compatibility score between two users.
 * Weights:
 * - Common interests: 30%
 * - Location proximity: 20%
 * - Relationship goals: 20%
 * - Age range: 15%
 * - Activity patterns: 15%
 */
export const calculateCompatibilityScore = (userA, userB) => {
  let score = 0;

  // 1. Common interests (30 pts)
  const interestsA = userA.interests?.map(i => i.interestId || i.interest?.id || (typeof i === 'string' ? i : i.id)) || [];
  const interestsB = userB.interests?.map(i => i.interestId || i.interest?.id || (typeof i === 'string' ? i : i.id)) || [];
  
  if (interestsA.length > 0 && interestsB.length > 0) {
    const intersection = interestsA.filter(id => interestsB.includes(id));
    const scoreInterests = (intersection.length / Math.max(interestsA.length, interestsB.length)) * 30;
    score += scoreInterests;
  }

  // 2. Location proximity (20 pts)
  if (userA.latitude && userA.longitude && userB.latitude && userB.longitude) {
    const distance = calculateHaversineDistance(
      userA.latitude, userA.longitude,
      userB.latitude, userB.longitude
    );
    // 5km or less = full 20 pts, 50km+ = 0 pts
    const distScore = Math.max(0, 20 - (distance / 2.5)); 
    score += distScore;
  }

  // 3. Relationship goals (20 pts)
  const relGoalsRaw = userA.preferences?.relationshipGoals;
  const preferredGoals = typeof relGoalsRaw === 'string' ? JSON.parse(relGoalsRaw) : (relGoalsRaw || []);
  if (userB.relationshipGoal && preferredGoals.length > 0) {
    if (preferredGoals.includes(userB.relationshipGoal)) score += 20;
  } else {
    score += 10; // Neutral fallback
  }

  // 4. Age range (15 pts)
  if (userA.dateOfBirth && userB.dateOfBirth) {
    const ageB = Math.floor((new Date() - new Date(userB.dateOfBirth)) / 31557600000);
    const minAge = userA.preferences?.minAge || 18;
    const maxAge = userA.preferences?.maxAge || 99;
    
    if (ageB >= minAge && ageB <= maxAge) {
      score += 15;
    } else {
      const diff = ageB < minAge ? minAge - ageB : ageB - maxAge;
      score += Math.max(0, 15 - (diff * 3));
    }
  }

  // 5. Activity patterns (15 pts)
  if (userB.lastActiveAt) {
    const hoursSinceActive = (Date.now() - new Date(userB.lastActiveAt)) / (1000 * 60 * 60);
    if (hoursSinceActive <= 12) score += 15;
    else if (hoursSinceActive <= 48) score += 10;
    else if (hoursSinceActive <= 168) score += 5;
  }

  return Math.min(100, Math.round(score));
};

/**
 * AI-Based Match Insight Generator
 */
export const getAIMatchInsight = (userA, userB) => {
  const myInterests = userA.interests?.map(i => i.interest?.name || i.name || i) || [];
  const theirInterests = userB.interests?.map(i => i.interest?.name || i.name || i) || [];
  const common = myInterests.filter(i => theirInterests.includes(i));

  if (common.length >= 2) {
    return `AI Insight: You both share a deep passion for ${common.slice(0, 2).join(' and ')}.`;
  }

  const bioA = (userA.bio || '').toLowerCase();
  const bioB = (userB.bio || '').toLowerCase();
  const textA = `${bioA} ${(userA.prompts || []).map(p => p.answer.toLowerCase()).join(' ')}`;
  const textB = `${bioB} ${(userB.prompts || []).map(p => p.answer.toLowerCase()).join(' ')}`;

  const foundCategories = [];
  Object.keys(LIFESTYLE_KEYWORDS).forEach(category => {
    if (LIFESTYLE_KEYWORDS[category].some(k => textA.includes(k)) && 
        LIFESTYLE_KEYWORDS[category].some(k => textB.includes(k))) {
      foundCategories.push(category);
    }
  });

  if (foundCategories.includes('fitness')) return "AI Insight: It looks like you both value staying active and healthy.";
  if (foundCategories.includes('travel')) return "AI Insight: Your shared love for exploring new places is a strong match.";
  if (foundCategories.includes('creative')) return "AI Insight: You're both creative souls with matching artistic vibes.";
  if (foundCategories.includes('tech')) return "AI Insight: You're both digitally savvy and likely share many tech interests.";
  if (foundCategories.includes('food')) return "AI Insight: You both seem to be true foodies at heart.";

  if (common.length === 1) return `AI Insight: Your shared interest in ${common[0]} is a great starting point.`;

  return "AI Insight: Your personality profiles suggest a strong potential for a meaningful connection.";
};

/**
 * Get daily recommended matches
 */
export const getDailyRecommendations = async (userId, count = 5) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      preferences: true,
      interests: true,
      prompts: true
    }
  });

  if (!user) return [];

  const swipedUserIds = await prisma.swipe.findMany({
    where: { actorId: userId },
    select: { targetId: true },
  });
  
  const recommendedBefore = await prisma.recommendation.findMany({
    where: { userId },
    select: { targetId: true }
  });

  const excludedIds = [
    userId, 
    ...swipedUserIds.map(s => s.targetId),
    ...recommendedBefore.map(r => r.targetId)
  ];

  const pool = await prisma.user.findMany({
    where: {
      id: { notIn: excludedIds },
      profileStatus: 'APPROVED',
      discoverEnabled: true,
      gender: user.preferences?.showMe === 'EVERYONE' ? undefined : 
              user.preferences?.showMe === 'MEN' ? 'MAN' : 
              user.preferences?.showMe === 'WOMEN' ? 'WOMAN' : undefined,
    },
    include: {
       interests: { include: { interest: true } },
       prompts: true,
       photos: { where: { status: 'APPROVED' }, orderBy: { position: 'asc' }, take: 1 }
    },
    take: 100
  });

  const ranked = pool.map(c => ({
    ...c,
    compatibilityScore: calculateCompatibilityScore(user, c),
    aiInsight: getAIMatchInsight(user, c)
  })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const topRecs = ranked.slice(0, count);

  // Store in history
  if (topRecs.length > 0) {
    await prisma.recommendation.createMany({
      data: topRecs.map(r => ({
        userId,
        targetId: r.id,
        score: r.compatibilityScore,
        shownAt: new Date()
      }))
    });
  }

  return topRecs;
};

export default {
  calculateCompatibilityScore,
  getDailyRecommendations,
  getAIMatchInsight
};
