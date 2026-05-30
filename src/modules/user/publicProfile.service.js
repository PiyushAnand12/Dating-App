import AppError from '../../utils/AppError.js';
import prisma from '../../config/prisma.js';
import { getApprovedPublicPhotos } from '../photos/photos.service.js';

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;

  const today = new Date();
  const dob = new Date(dateOfBirth);

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }

  return age;
};

export const getPublicProfile = async ({ userId }) => {
  if (!userId || typeof userId !== 'string') {
    throw new AppError(
      'getPublicProfile: "userId" is required.',
      400,
      'INVALID_INPUT',
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      interests: {
        include: { interest: true }
      }
    }
  });

  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  if (!user.isActive) {
    throw new AppError('User profile is not available.', 404, 'PROFILE_NOT_AVAILABLE');
  }

  const photos = await getApprovedPublicPhotos({ userId });

  return {
    userId: user.id,
    firstName: user.firstName,
    age: calculateAge(user.dateOfBirth),
    gender: user.gender,
    bio: user.bio,
    city: user.city,
    height: user.height,
    jobTitle: user.jobTitle,
    company: user.company,
    profileStatus: user.profileStatus,
    interests: user.interests.map(i => i.interest.name),
    photos,
  };
};

export default {
  getPublicProfile,
};