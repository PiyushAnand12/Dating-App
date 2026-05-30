import AppError from '../../utils/AppError.js';
import prisma from '../../config/prisma.js';
import { getCachedDiscovery, setCachedDiscovery } from './discovery.cache.js';
import { ErrorCodes } from '../../utils/ErrorCodes.js';
import matchmakingService from './matchmaking.service.js';

/**
 * Helper to calculate distance between two coordinates in KM
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get profiles for discovery based on location, age, and gender preferences.
 */
export const getDiscoveryProfiles = async ({
  currentUserId,
  page = 1,
  limit = 20,
}) => {
  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  // 1. Try Cache First
  const cached = await getCachedDiscovery(currentUserId, normalizedPage);
  if (cached) return cached;

  // 2. Fetch current user preferences, location, and interests for scoring
  const users = await prisma.$queryRaw`
    SELECT u.*, p.* 
    FROM "users" u
    LEFT JOIN "user_preferences" p ON u."id" = p."userId"
    WHERE u."id" = ${currentUserId}
    LIMIT 1
  `;
  const currentUserRaw = users[0];

  if (!currentUserRaw) throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);

  // Fetch interests separately
  const userInterests = await prisma.userInterest.findMany({
    where: { userId: currentUserId },
    include: { interest: true }
  });

  const currentUser = { ...currentUserRaw, preferences: currentUserRaw, interests: userInterests };

  if (!currentUser) throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
  if (!currentUser.latitude || !currentUser.longitude) {
    throw new AppError('Please set your location to discover users.', 400, ErrorCodes.INVALID_INPUT);
  }
  if (!currentUser.isProfileComplete) {
    throw new AppError('Please complete your profile to start discovery.', 403, 'INCOMPLETE_PROFILE');
  }

  const { preferences: rawPrefs } = currentUser;
  const preferences = {
    ...rawPrefs,
    relationshipGoals: typeof rawPrefs?.relationshipGoals === 'string' ? JSON.parse(rawPrefs.relationshipGoals) : (rawPrefs?.relationshipGoals || []),
    interestIds: typeof rawPrefs?.interestIds === 'string' ? JSON.parse(rawPrefs.interestIds) : (rawPrefs?.interestIds || [])
  };
  const maxDistance = preferences?.maxDistanceKm || 50;

  // 3. Calculate Bounding Box
  // 1 deg lat ~ 111km, 1 deg lon ~ 111km * cos(lat)
  const latDelta = maxDistance / 111;
  const lonDelta = maxDistance / (111 * Math.cos(currentUser.latitude * (Math.PI / 180)));

  const bounds = {
    latMin: currentUser.latitude - latDelta,
    latMax: currentUser.latitude + latDelta,
    lonMin: currentUser.longitude - lonDelta,
    lonMax: currentUser.longitude + lonDelta,
  };

  // 4. Calculate Age Dates
  const now = new Date();
  const minBirthDate = new Date(now.getFullYear() - (preferences?.maxAge || 99), now.getMonth(), now.getDate());
  const maxBirthDate = new Date(now.getFullYear() - (preferences?.minAge || 18), now.getMonth(), now.getDate());

  // 5. Gender Filter
  const genderFilter = preferences?.showMe === 'EVERYONE'
    ? undefined
    : preferences?.showMe === 'MEN' ? 'MAN'
      : preferences?.showMe === 'WOMEN' ? 'WOMAN'
        : preferences?.showMe === 'NON_BINARY' ? 'NON_BINARY' : undefined;

  // 6. Exclude users already swiped
  const swipedUserIds = await prisma.swipe.findMany({
    where: { actorId: currentUserId },
    select: { targetId: true },
  });

  // 6.2 Exclude blocked users (either way)
  const blockedUserIds = await prisma.block.findMany({
    where: {
      OR: [
        { actorId: currentUserId },
        { targetId: currentUserId },
      ],
    },
    select: { actorId: true, targetId: true },
  });

  const blockedIds = blockedUserIds.map(b => b.actorId === currentUserId ? b.targetId : b.actorId);
  const excludedIds = [currentUserId, ...swipedUserIds.map(s => s.targetId), ...blockedIds];

  // 7. Base Query with Advanced Filters
  const whereClause = {
    id: { notIn: excludedIds }, // CRITICAL: Exclude self and swiped users
    profileStatus: 'APPROVED',
    isProfileComplete: true,
    discoverEnabled: true,
    gender: genderFilter,
    dateOfBirth: {
      gte: minBirthDate,
      lte: maxBirthDate,
    },
    // Height Filter (if present in preferences)
    height: preferences?.minHeight || preferences?.maxHeight ? {
      gte: preferences.minHeight || 0,
      lte: preferences.maxHeight || 300,
    } : undefined,
    // Relationship Goal filter
    relationshipGoal: preferences?.relationshipGoals?.length > 0 ? {
      in: preferences.relationshipGoals,
    } : undefined,
    latitude: {
      gte: bounds.latMin,
      lte: bounds.latMax,
    },
    longitude: {
      gte: bounds.lonMin,
      lte: bounds.lonMax,
    },
    // Multi-Interest Filter (Bumble-style)
    interests: preferences?.interestIds?.length > 0 ? {
      some: {
        interestId: { in: preferences.interestIds }
      }
    } : undefined,

    // Recently Active Filter
    lastActiveAt: preferences?.activeWithinHours ? {
      gte: new Date(Date.now() - preferences.activeWithinHours * 60 * 60 * 1000)
    } : undefined,
  };

  const total = await prisma.user.count({ where: whereClause });
  const skip = (normalizedPage - 1) * normalizedLimit;

  // 8. Fetch candidate users using Prisma Client for SQLite compatibility
  const candidateUsersRaw = await prisma.user.findMany({
    where: whereClause,
    include: {
      preferences: true,
      boosts: {
        where: { expiresAt: { gt: new Date() } }
      }
    },
    orderBy: [
      { subscriptionTier: 'desc' }, // ELITE > PREMIUM > FREE (desc order depends on enum/string value)
      { lastActiveAt: 'desc' }
    ],
    skip,
    take: normalizedLimit
  });

  const candidateUsersWithBoost = candidateUsersRaw.map(u => ({
    ...u,
    isBoosted: u.boosts.length > 0,
    hideDistance: u.preferences?.hideDistance,
    distanceUnit: u.preferences?.distanceUnit
  }));

  // Add hasActiveStory check (post-processing for simplicity if SQL is complex)
  const candidateIds = candidateUsersWithBoost.map(u => u.id);
  const activeStories = await prisma.story.findMany({
    where: {
      userId: { in: candidateIds },
      expiresAt: { gt: new Date() },
      status: 'APPROVED'
    },
    select: { userId: true }
  });
  const activeStoryUserIds = new Set(activeStories.map(s => s.userId));

  candidateUsersWithBoost.forEach(u => {
    u.hasActiveStory = activeStoryUserIds.has(u.id);
  });
  const photos = await prisma.photo.findMany({
    where: { userId: { in: candidateIds }, status: 'APPROVED' },
    orderBy: { position: 'asc' }
  });
  const interests = await prisma.userInterest.findMany({
    where: { userId: { in: candidateIds } },
    include: { interest: true }
  });
  const prompts = await prisma.profilePrompt.findMany({
    where: { userId: { in: candidateIds } },
    orderBy: { createdAt: 'asc' }
  });
  const badges = await prisma.userBadge.findMany({
    where: { userId: { in: candidateIds } }
  });

  const candidateUsers = candidateUsersWithBoost.map(u => ({
    ...u,
    preferences: { hideDistance: u.hideDistance },
    photos: photos.filter(p => p.userId === u.id),
    interests: interests.filter(i => i.userId === u.id),
    prompts: prompts.filter(p => p.userId === u.id),
    badges: badges.filter(b => b.userId === u.id).map(b => b.type)
  }));

  // Calculate distances and shared interests for sorting
  let sortedProfiles = candidateUsers.map(profile => {
    const distance = (profile.latitude && profile.longitude)
      ? calculateHaversineDistance(currentUser.latitude, currentUser.longitude, profile.latitude, profile.longitude)
      : null;

    const myInterestIds = currentUser.interests?.map(i => i.interestId) || [];
    const theirInterestIds = profile.interests?.map(i => i.interestId) || [];
    const commonInterests = myInterestIds.filter(id => theirInterestIds.includes(id)).length;

    return { ...profile, distance, commonInterests };
  });

  // Apply Advanced Sorting
  const sortBy = preferences?.sortBy || 'RECENTLY_ACTIVE';

  sortedProfiles.sort((a, b) => {
    switch (sortBy) {
      case 'DISTANCE':
        return (a.distance || Infinity) - (b.distance || Infinity);
      case 'AGE_ASC':
        return new Date(b.dateOfBirth).getTime() - new Date(a.dateOfBirth).getTime();
      case 'AGE_DESC':
        return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
      case 'RELEVANCE':
        return b.commonInterests - a.commonInterests || (a.distance || Infinity) - (b.distance || Infinity);
      case 'RECENTLY_ACTIVE':
      default:
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    }
  });

  const profiles = sortedProfiles.map(user => {
    let displayDistance = user.distance;
    const unit = preferences?.distanceUnit || 'KM';

    if (displayDistance !== null && unit === 'MILES') {
      displayDistance = displayDistance * 0.621371;
    }

    const showDistance = !user.preferences?.hideDistance;

    const score = matchmakingService.calculateCompatibilityScore(currentUser, user);
    const aiInsight = matchmakingService.getAIMatchInsight(currentUser, user);

    return {
      userId: user.id,
      firstName: user.firstName || 'A User',
      age: user.dateOfBirth ? Math.floor((new Date() - new Date(user.dateOfBirth)) / 31557600000) : 25,
      gender: user.gender,
      bio: user.bio,
      city: user.city || user.livingIn || 'Nearby',
      distance: showDistance ? Math.round(displayDistance) : null,
      distanceUnit: unit,
      jobTitle: user.jobTitle,
      company: user.company,
      height: user.height,
      relationshipGoal: user.relationshipGoal,
      tier: user.subscriptionTier,
      isBoosted: !!user.isBoosted,
      hasActiveStory: !!user.hasActiveStory,
      photos: user.photos,
      interests: user.interests.map(i => i.interest?.name || '').filter(Boolean),
      prompts: user.prompts.map(p => ({ question: p.question, answer: p.answer })),
      compatibilityScore: score,
      aiInsight,
      badges: user.badges || [],
    };
  });

  // Smart Swipe Queue: Sort by compatibility score primarily
  profiles.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const result = {
    data: profiles,
    meta: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      hasNextPage: skip + normalizedLimit < total,
    },
  };

  // 8. Save to Cache
  await setCachedDiscovery(currentUserId, normalizedPage, result);

  return result;
};

export default {
  getDiscoveryProfiles,
};