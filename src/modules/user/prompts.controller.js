import asyncHandler from '../../utils/asyncHandler.js';
import promptsService from './prompts.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * POST /api/v1/users/prompts
 */
export const upsertPromptHandler = asyncHandler(async (req, res) => {
  const prompt = await promptsService.upsertPrompt(req.user.id, req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Profile prompt updated successfully!',
    data: prompt
  });
});

/**
 * GET /api/v1/users/prompts
 */
export const getMyPromptsHandler = asyncHandler(async (req, res) => {
  const prompts = await promptsService.getUserPrompts(req.user.id);
  sendSuccess(res, { data: prompts });
});

/**
 * DELETE /api/v1/users/prompts/:promptId
 */
export const deletePromptHandler = asyncHandler(async (req, res) => {
  const { promptId } = req.params;
  await promptsService.deletePrompt(req.user.id, promptId);
  sendSuccess(res, { message: 'Prompt removed from profile.' });
});

export default {
  upsertPromptHandler,
  getMyPromptsHandler,
  deletePromptHandler
};
