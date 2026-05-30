import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import { getPublicProfile } from './publicProfile.service.js';

/**
 * Create a new wishlist
 */
export const createWishlist = async (userId, name, isPublic = false) => {
  return prisma.wishlist.create({
    data: {
      userId,
      name,
      isPublic,
    },
    include: {
      _count: { select: { items: true } },
    },
  });
};

/**
 * Add a user to a wishlist
 */
export const addToWishlist = async (userId, wishlistId, targetId) => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
  });

  if (!wishlist || wishlist.userId !== userId) {
    throw new AppError('Wishlist not found or unauthorized', 404);
  }

  return prisma.wishlistItem.upsert({
    where: {
      wishlistId_targetId: {
        wishlistId,
        targetId,
      },
    },
    update: {},
    create: {
      wishlistId,
      targetId,
    },
  });
};

/**
 * Get user wishlists
 */
export const getUserWishlists = async (userId) => {
  return prisma.wishlist.findMany({
    where: { userId },
    include: {
      _count: { select: { items: true } },
    },
  });
};

/**
 * Get wishlist items
 */
export const getWishlistItems = async (wishlistId, userId) => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
    include: {
      items: true,
    },
  });

  if (!wishlist) throw new AppError('Wishlist not found', 404);
  
  // If private, only owner can see
  if (!wishlist.isPublic && wishlist.userId !== userId) {
    throw new AppError('Unauthorized access to private wishlist', 403);
  }

  const itemsWithProfiles = await Promise.all(
    wishlist.items.map(async (item) => {
      try {
        const profile = await getPublicProfile({ userId: item.targetId });
        return {
          targetId: item.targetId,
          addedAt: item.createdAt,
          user: profile,
        };
      } catch (err) {
        return null;
      }
    })
  );

  const items = itemsWithProfiles.filter(i => i !== null);

  return {
    id: wishlist.id,
    name: wishlist.name,
    isPublic: wishlist.isPublic,
    items,
  };
};

/**
 * Get shared wishlist (Public)
 */
export const getSharedWishlist = async (wishlistId) => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
    include: {
      items: true,
      user: { select: { firstName: true } }
    },
  });

  if (!wishlist) throw new AppError('Wishlist not found', 404);
  if (!wishlist.isPublic) throw new AppError('This wishlist is private.', 403);

  const itemsWithProfiles = await Promise.all(
    wishlist.items.map(async (item) => {
      try {
        const profile = await getPublicProfile({ userId: item.targetId });
        return {
          targetId: item.targetId,
          addedAt: item.createdAt,
          user: profile,
        };
      } catch (err) {
        return null;
      }
    })
  );

  const items = itemsWithProfiles.filter(i => i !== null);

  return {
    id: wishlist.id,
    name: wishlist.name,
    owner: wishlist.user.firstName,
    items,
  };
};

/**
 * Update wishlist settings (Public/Private toggle)
 */
export const updateWishlistSettings = async (userId, wishlistId, { isPublic }) => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
  });

  if (!wishlist || wishlist.userId !== userId) {
    throw new AppError('Wishlist not found or unauthorized', 404);
  }

  return prisma.wishlist.update({
    where: { id: wishlistId },
    data: { isPublic },
  });
};

/**
 * Delete wishlist
 */
export const deleteWishlist = async (userId, wishlistId) => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
  });

  if (!wishlist || wishlist.userId !== userId) {
    throw new AppError('Wishlist not found or unauthorized', 404);
  }

  await prisma.wishlist.delete({ where: { id: wishlistId } });
};

export default {
  createWishlist,
  addToWishlist,
  getUserWishlists,
  getWishlistItems,
  getSharedWishlist,
  updateWishlistSettings,
  deleteWishlist,
};
