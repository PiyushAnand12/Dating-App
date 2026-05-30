import asyncHandler from '../../utils/asyncHandler.js';
import AppError from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { addFavorite, getMyFavorites, removeFavorite, bulkRemoveFavorites } from './favorites.service.js';

export const addFavoriteHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const { targetUserId } = req.body ?? {};

  const result = await addFavorite({
    actorId: req.user.id,
    targetUserId,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Favorite added successfully.',
    data: result,
  });
});

export const getMyFavoritesHandler = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required.', 401, 'ACCESS_DENIED');
  }

  const result = await getMyFavorites({
    userId: req.user.id,
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Favorites fetched successfully.',
    data: result.data,
    meta: result.meta,
  });
});

export const removeFavoriteHandler = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const result = await removeFavorite(req.user.id, targetUserId);

  sendSuccess(res, {
    message: 'User removed from favorites.',
    data: result,
  });
});

export const bulkRemoveFavoritesHandler = asyncHandler(async (req, res) => {
  const { targetIds } = req.body;
  const result = await bulkRemoveFavorites(req.user.id, targetIds);

  sendSuccess(res, {
    message: 'Users removed from favorites.',
    data: result,
  });
});

export default {
  addFavoriteHandler,
  getMyFavoritesHandler,
  removeFavoriteHandler,
  bulkRemoveFavoritesHandler,
};