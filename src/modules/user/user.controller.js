import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import {
  getMe,
  updateProfile,
  updateLocation,
  updatePreferences,
  setDiscoverEnabled,
  evaluateProfileCompleteness,
} from './user.service.js';
import discoveryCache from './discovery.cache.js';
import * as boostService from './boost.service.js';
import matchmakingService from './matchmaking.service.js';

/**
 * GET /api/v1/users/me
 */
export const getMeHandler = asyncHandler(async (req, res) => {
  const user = await getMe(req.user.id);
  const isBoosted = await boostService.hasActiveBoost(req.user.id);
  
  sendSuccess(res, {
    statusCode: 200,
    message: 'Profile fetched',
    data: { ...user, isBoosted },
  });
});

/**
 * POST /api/v1/users/me/boost
 */
export const activateBoostHandler = asyncHandler(async (req, res) => {
  const { durationHours } = req.body;
  const boost = await boostService.activateBoost(req.user.id, durationHours);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Profile boosted successfully!',
    data: boost,
  });
});

/**
 * GET /api/v1/users/top-picks
 */
export const getTopPicksHandler = asyncHandler(async (req, res) => {
  const picks = await matchmakingService.getTopPicks(req.user.id);
  sendSuccess(res, {
    message: 'Top picks fetched successfully.',
    data: picks,
  });
});

/**
 * PATCH /api/v1/users/me
 */
export const updateProfileHandler = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user.id, req.body);
  await evaluateProfileCompleteness(req.user.id);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Profile updated',
    data: user,
  });
});

/**
 * PATCH /api/v1/users/me/location
 */
export const updateLocationHandler = asyncHandler(async (req, res) => {
  const location = await updateLocation(req.user.id, req.body);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Location updated',
    data: location,
  });
});

/**
 * PATCH /api/v1/users/me/preferences
 */
export const updatePreferencesHandler = asyncHandler(async (req, res) => {
  const preferences = await updatePreferences(req.user.id, req.body);
  
  // Clear discovery cache because changes (like hideDistance) affect how this user is seen by others
  await discoveryCache.clearAllDiscoveryCache();

  sendSuccess(res, {
    statusCode: 200,
    message: 'Preferences updated',
    data: preferences,
  });
});

/**
 * PATCH /api/v1/users/me/discover
 */
export const setDiscoverEnabledHandler = asyncHandler(async (req, res) => {
  const result = await setDiscoverEnabled(req.user.id, req.body.discoverEnabled);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Discover visibility updated',
    data: result,
  });
});
