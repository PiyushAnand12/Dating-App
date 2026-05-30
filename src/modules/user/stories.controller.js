import asyncHandler from '../../utils/asyncHandler.js';
import storiesService from './stories.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import AppError from '../../utils/AppError.js';

/**
 * POST /api/v1/users/stories
 */
export const uploadStoryHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Story file is required', 400);
  }

  const story = await storiesService.uploadStory(req.user.id, {
    fileBuffer: req.file.buffer,
    filename: req.file.originalname,
    mimeType: req.file.mimetype
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Story uploaded successfully!',
    data: story
  });
});

/**
 * GET /api/v1/users/stories/me
 */
export const getMyStoriesHandler = asyncHandler(async (req, res) => {
  console.log(`[StoriesController] Fetching stories for authenticated user ID: ${req.user.id}`);
  const stories = await storiesService.getMyActiveStories(req.user.id);
  console.log(`[Stories] Found ${stories.length} active stories for user: ${req.user.id}`);
  sendSuccess(res, { data: stories });
});

/**
 * GET /api/v1/users/stories/feed
 */
export const getFeedStoriesHandler = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await storiesService.getStoriesFeed(req.user.id, { page, limit });
  sendSuccess(res, { data: result });
});

/**
 * POST /api/v1/users/stories/:storyId/view
 */
export const viewStoryHandler = asyncHandler(async (req, res) => {
  const { storyId } = req.params;
  await storiesService.viewStory(req.user.id, storyId);
  sendSuccess(res, { message: 'Story viewed' });
});

/**
 * POST /api/v1/users/stories/:storyId/react
 */
export const reactToStoryHandler = asyncHandler(async (req, res) => {
  const { storyId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    throw new AppError('Emoji is required', 400);
  }

  const allowedEmojis = ['❤️', '😂', '😮', '😢', '😡'];
  if (!allowedEmojis.includes(emoji)) {
    throw new AppError(`Invalid emoji. Allowed: ${allowedEmojis.join(' ')}`, 400);
  }

  const reaction = await storiesService.reactToStory(req.user.id, storyId, emoji);
  sendSuccess(res, { message: 'Reaction sent', data: reaction });
});

/**
 * DELETE /api/v1/users/stories/:storyId
 */
export const deleteStoryHandler = asyncHandler(async (req, res) => {
  const { storyId } = req.params;
  await storiesService.deleteStory(req.user.id, storyId);
  sendSuccess(res, { message: 'Story deleted successfully' });
});

/**
 * GET /api/v1/users/stories/:storyId/viewers
 */
export const getStoryViewersHandler = asyncHandler(async (req, res) => {
  const { storyId } = req.params;
  const { page, limit } = req.query;
  const result = await storiesService.getStoryViewers(req.user.id, storyId, { page, limit });
  sendSuccess(res, { data: result });
});

export default {
  uploadStoryHandler,
  getMyStoriesHandler,
  getFeedStoriesHandler,
  viewStoryHandler,
  reactToStoryHandler,
  deleteStoryHandler,
  getStoryViewersHandler
};
