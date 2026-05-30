import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';

/**
 * Add or update a profile prompt
 */
export const upsertPrompt = async (userId, { question, answer }) => {
  if (!question || !answer) {
    throw new AppError('Question and answer are required', 400);
  }

  // Check if we already have this question
  const existing = await prisma.profilePrompt.findFirst({
    where: { userId, question }
  });

  if (existing) {
    // Update existing prompt
    return prisma.profilePrompt.update({
      where: { id: existing.id },
      data: { answer }
    });
  }

  // We allow up to 3 prompts per profile
  const count = await prisma.profilePrompt.count({ where: { userId } });
  if (count >= 3) {
    throw new AppError('You can only have up to 3 prompts on your profile.', 400);
  }

  // Create new prompt
  return prisma.profilePrompt.create({
    data: {
      userId,
      question,
      answer,
    }
  });
};

/**
 * Remove a prompt
 */
export const deletePrompt = async (userId, promptId) => {
  return prisma.profilePrompt.deleteMany({
    where: { id: promptId, userId }
  });
};

/**
 * Get user's prompts
 */
export const getUserPrompts = async (userId) => {
  return prisma.profilePrompt.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });
};

export default {
  upsertPrompt,
  deletePrompt,
  getUserPrompts
};
