import asyncHandler from '../../utils/asyncHandler.js';
import wishlistService from './wishlist.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * Handle new wishlist creation
 */
export const createWishlistHandler = asyncHandler(async (req, res) => {
  const { name, isPublic } = req.body;
  const wishlist = await wishlistService.createWishlist(req.user.id, name, isPublic);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Wishlist created successfully.',
    data: wishlist,
  });
});

/**
 * Add a user to a wishlist
 */
export const addToWishlistHandler = asyncHandler(async (req, res) => {
  const { wishlistId, targetId } = req.body;
  const item = await wishlistService.addToWishlist(req.user.id, wishlistId, targetId);

  sendSuccess(res, {
    statusCode: 201,
    message: 'User added to wishlist.',
    data: item,
  });
});

/**
 * Get all my wishlists
 */
export const getMyWishlistsHandler = asyncHandler(async (req, res) => {
  const wishlists = await wishlistService.getUserWishlists(req.user.id);
  sendSuccess(res, { data: wishlists });
});

/**
 * Get specific wishlist items
 */
export const getWishlistDetailsHandler = asyncHandler(async (req, res) => {
  const { wishlistId } = req.params;
  const result = await wishlistService.getWishlistItems(wishlistId, req.user.id);
  sendSuccess(res, { data: result });
});

/**
 * Get shared wishlist details (Public access)
 */
export const getSharedWishlistHandler = asyncHandler(async (req, res) => {
  const { wishlistId } = req.params;
  const result = await wishlistService.getSharedWishlist(wishlistId);
  sendSuccess(res, { 
    message: 'Shared wishlist fetched.',
    data: result 
  });
});

/**
 * Update wishlist settings
 */
export const updateWishlistSettingsHandler = asyncHandler(async (req, res) => {
  const { wishlistId } = req.params;
  const { isPublic } = req.body;
  const result = await wishlistService.updateWishlistSettings(req.user.id, wishlistId, { isPublic });
  
  sendSuccess(res, {
    message: `Wishlist visibility updated to ${isPublic ? 'PUBLIC' : 'PRIVATE'}.`,
    data: result
  });
});

/**
 * Delete a wishlist
 */
export const deleteWishlistHandler = asyncHandler(async (req, res) => {
  const { wishlistId } = req.params;
  await wishlistService.deleteWishlist(req.user.id, wishlistId);
  sendSuccess(res, { message: 'Wishlist deleted successfully.' });
});

export default {
  createWishlistHandler,
  addToWishlistHandler,
  getMyWishlistsHandler,
  getWishlistDetailsHandler,
  getSharedWishlistHandler,
  updateWishlistSettingsHandler,
  deleteWishlistHandler,
};
