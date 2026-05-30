import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { userStoryPath } from '../../utils/storagePaths.js';
import { uploadToStorage } from '../../utils/uploadToStorage.js';
import { getSignedObjectUrl } from '../../utils/signedUrl.js';
import { optimizeImage } from '../../utils/imageProcessor.js';
import { detectNSFW } from '../moderation/aiModeration.service.js';
import { createActivity } from './activity.service.js';

/**
 * Upload a new story
 */
export const uploadStory = async (userId, { fileBuffer, filename, mimeType }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true }
  });

  if (!user) throw new AppError('User not found', 404);

  console.log(`[StoriesService] Starting upload for user ${userId} | File: ${filename} | Size: ${fileBuffer.length} bytes`);
  
  const startTime = Date.now();
  
  let finalBuffer = fileBuffer;
  let finalMime = mimeType;
  let finalExt = filename.split('.').pop();
  const mediaType = mimeType.startsWith('video') ? 'VIDEO' : 'IMAGE';
  let moderation = { status: 'APPROVED', metadata: null };

  if (mediaType === 'IMAGE') {
    console.log('[StoriesService] Optimizing image and running moderation...');
    const [moderationResult, optimizationResult] = await Promise.all([
      detectNSFW(fileBuffer),
      optimizeImage(fileBuffer)
    ]);
    moderation = moderationResult;
    finalBuffer = optimizationResult.data;
    finalMime = 'image/webp';
    finalExt = 'webp';
    console.log(`[StoriesService] Image optimized. Size reduced to ${finalBuffer.length} bytes. Time: ${Date.now() - startTime}ms`);
  }

  const storageKey = userStoryPath(user.id, Date.now(), finalExt);
  console.log(`[StoriesService] Uploading to storage: ${storageKey} | MIME: ${finalMime}`);
  
  const uploadStartTime = Date.now();
  const uploaded = await uploadToStorage(storageKey, finalBuffer, finalMime);
  console.log(`[StoriesService] Storage upload successful. Time: ${Date.now() - uploadStartTime}ms`);

  // 2. Create Story Record
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  let moderationMetadata = null;
  if (moderation.metadata) {
    try {
      moderationMetadata = JSON.stringify(moderation.metadata);
    } catch (e) {
      console.error('Failed to stringify moderation metadata:', e);
    }
  }

  const story = await prisma.story.create({
    data: {
      userId,
      mediaUrl: uploaded.key,
      mediaType,
      expiresAt,
      status: moderation.status,
      moderationMetadata
    }
  });

  const signedUrl = await getSignedObjectUrl(story.mediaUrl);

  return {
    ...story,
    mediaUrl: signedUrl
  };
};

export const getMyActiveStories = async (userId) => {
  const now = new Date();
  const gracePeriod = new Date(now.getTime() - 5 * 60 * 1000); // 5 minute grace period for safety

  const activeStories = await prisma.story.findMany({
    where: {
      userId,
      status: { in: ['APPROVED', 'PENDING'] },
      expiresAt: { gte: gracePeriod }
    },
    include: {
      _count: {
        select: { views: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return Promise.all(activeStories.map(async s => {
    try {
      return {
        ...s,
        mediaUrl: await getSignedObjectUrl(s.mediaUrl),
        viewsCount: s._count?.views || 0,
        moderationMetadata: typeof s.moderationMetadata === 'string' ? JSON.parse(s.moderationMetadata) : s.moderationMetadata
      };
    } catch (e) {
      console.error('Failed to process my story:', e);
      return s;
    }
  }));
};

/**
 * Get stories feed (Matches + Favorites)
 */
export const getStoriesFeed = async (userId, { page = 1, limit = 20 } = {}) => {
  const normalizedPage = Number(page);
  const normalizedLimit = Math.min(Number(limit), 50);
  const skip = (normalizedPage - 1) * normalizedLimit;

  // 1. Find matches and favorite targets
  const [matches, favorites] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { user1Id: true, user2Id: true }
    }),
    prisma.favorite.findMany({
      where: { actorId: userId },
      select: { targetId: true }
    })
  ]);

  const socialIds = [
    ...new Set([
      ...matches.map(m => m.user1Id === userId ? m.user2Id : m.user1Id),
      ...favorites.map(f => f.targetId)
    ])
  ];

  const whereClause = {
    userId: { in: socialIds },
    status: 'APPROVED',
    expiresAt: { gte: new Date(Date.now() - 60000) }
  };

  // 2. Fetch active stories from these users with pagination
  const [total, feed] = await Promise.all([
    prisma.story.count({ where: whereClause }),
    prisma.story.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, firstName: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: normalizedLimit
    })
  ]);

  const data = await Promise.all(feed.map(async s => {
    try {
      return {
        ...s,
        mediaUrl: await getSignedObjectUrl(s.mediaUrl),
        moderationMetadata: typeof s.moderationMetadata === 'string' ? JSON.parse(s.moderationMetadata) : s.moderationMetadata
      };
    } catch (e) {
      console.error('Failed to process feed story:', e);
      return s;
    }
  }));

  return {
    data,
    meta: {
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      hasNextPage: skip + normalizedLimit < total
    }
  };
};

/**
 * Record a story view
 */
export const viewStory = async (viewerId, storyId) => {
  try {
    // SQLite upsert can be finicky with composite keys in some Prisma versions
    // Let's use a safer find-then-create approach
    const existing = await prisma.storyView.findUnique({
      where: {
        storyId_viewerId: { storyId, viewerId }
      }
    });

    if (existing) return existing;

    return await prisma.storyView.create({
      data: { storyId, viewerId }
    });
  } catch (err) {
    console.error('Failed to record story view:', err);
    // Non-critical error, don't crash the request
    return null;
  }
};

/**
 * React to a story with an emoji
 */
export const reactToStory = async (userId, storyId, emoji) => {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true }
  });

  if (!story) throw new AppError('Story not found', 404);

  // 1. Persist Reaction
  const reaction = await prisma.storyReaction.upsert({
    where: {
      storyId_userId_emoji: { storyId, userId, emoji }
    },
    create: { storyId, userId, emoji },
    update: { createdAt: new Date() } // Refresh timestamp
  });

  // 2. Log Activity for the story owner
  if (story.userId !== userId) {
    await createActivity({
      userId: story.userId,
      actorId: userId,
      type: 'STORY_REACTION',
      metadata: { storyId, emoji } // createActivity will handle stringification
    });

    // 3. Trigger Notification
    (async () => {
      try {
        const reactor = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } });
        const { sendToUser } = await import('../../config/firebase.js');
        await sendToUser(story.userId, {
          title: 'New Story Reaction! 😍',
          body: `${reactor?.firstName || 'Someone'} reacted ${emoji} to your story!`,
        }, { type: 'STORY_REACTION', storyId });

        // 4. Send a DM if they are matches (Premium Production Grade Feature)
        const match = await prisma.match.findFirst({
          where: {
            OR: [
              { user1Id: userId, user2Id: story.userId },
              { user1Id: story.userId, user2Id: userId },
            ],
          },
        });

        if (match) {
          const { sendDirectMessage } = await import('./messages.service.js');
          await sendDirectMessage({
            senderId: userId,
            receiverId: story.userId,
            body: `Reacted ${emoji} to your story!`,
          });
        }
      } catch (err) {
        console.error('Story reaction notification/message failed:', err);
      }
    })();
  }

  return reaction;
};

/**
 * Delete a story (owner only)
 */
export const deleteStory = async (userId, storyId) => {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true }
  });

  if (!story) throw new AppError('Story not found', 404);
  if (story.userId !== userId) throw new AppError('Not authorized to delete this story', 403);

  await prisma.story.delete({
    where: { id: storyId }
  });

  return { deleted: true };
};

/**
 * Get story viewers (owner only)
 */
export const getStoryViewers = async (userId, storyId, { page = 1, limit = 20 } = {}) => {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true }
  });

  if (!story) throw new AppError('Story not found', 404);
  if (story.userId !== userId) throw new AppError('Not authorized', 403);

  const normalizedPage = Number(page);
  const normalizedLimit = Math.min(Number(limit), 50);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [total, views] = await Promise.all([
    prisma.storyView.count({ where: { storyId } }),
    prisma.storyView.findMany({
      where: { storyId },
      include: {
        viewer: {
          select: { id: true, firstName: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: normalizedLimit
    })
  ]);

  return {
    data: views,
    meta: {
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      hasNextPage: skip + normalizedLimit < total
    }
  };
};

export default {
  uploadStory,
  getMyActiveStories,
  getStoriesFeed,
  viewStory,
  reactToStory,
  deleteStory,
  getStoryViewers
};
