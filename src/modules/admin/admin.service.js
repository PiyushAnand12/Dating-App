import { sendToUser } from '../../config/firebase.js';
import { createActivity } from '../user/activity.service.js';
import { grantBadge } from '../user/badges.service.js';

export const getUsersByStatus = async (status = 'UNDER_REVIEW') => {
  const users = await prisma.user.findMany({
    where: {
      profileStatus: status,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      firstName: true,
      email: true,
      phone: true,
      profileStatus: true,
      isOnboarded: true,
      kycVideoUrl: true,
      createdAt: true,
      _count: {
        select: {
          photos: true,
        },
      },
    },
  });

  return users.map((user) => ({
    userId: user.id,
    firstName: user.firstName,
    email: user.email,
    phone: user.phone,
    profileStatus: user.profileStatus,
    isOnboarded: user.isOnboarded,
    hasKycVideo: Boolean(user.kycVideoUrl),
    photosCount: user._count.photos,
    createdAt: user.createdAt,
  }));
};

export const getUserByIdForAdmin = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      email: true,
      phone: true,
      role: true,
      dateOfBirth: true,
      gender: true,
      bio: true,
      city: true,
      latitude: true,
      longitude: true,
      height: true,
      jobTitle: true,
      company: true,
      livingIn: true,
      relationshipGoal: true,
      profileStatus: true,
      isOnboarded: true,
      isVerified: true,
      discoverEnabled: true,
      kycVideoUrl: true,
      createdAt: true,
      updatedAt: true,
      preferences: true,
      interests: {
        select: {
          interest: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
            },
          },
        },
      },
      photos: {
        orderBy: [{ position: 'asc' }, { version: 'desc' }],
        select: {
          id: true,
          url: true,
          position: true,
          version: true,
          status: true,
          reviewReason: true,
          reviewedAt: true,
        },
      },
    },
  });
};

export const approveUserById = async (userId, adminId) => {
  const updatedUser = await prisma.$transaction(async (tx) => {
    const approvedUser = await tx.user.update({
      where: { id: userId },
      data: {
        profileStatus: 'APPROVED',
      },
      select: {
        id: true,
        firstName: true,
        email: true,
        profileStatus: true,
        updatedAt: true,
      },
    });

    await tx.adminAction.create({
      data: {
        actorId: adminId,
        targetId: userId,
        type: 'PROFILE_APPROVED',
      },
    });
    
    // Grant KYC and ID Verified badges upon approval
    await grantBadge(userId, 'KYC_VERIFIED');
    await grantBadge(userId, 'ID_VERIFIED');

    return approvedUser;
  });

  await clearAllDiscoveryCache();

  const { sendNotificationToUser } = await import('../user/notifications.service.js');
  await sendNotificationToUser(
    userId,
    adminId,
    {
      title: 'Profile Approved! 🎉',
      body: 'Your profile has been approved. Start discovering matches now!',
    },
    'KYC_STATUS_UPDATE',
    { status: 'APPROVED' }
  );

  return updatedUser;
};

export const rejectUserById = async (userId, adminId, reason) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profileStatus: 'REJECTED',
    },
    select: {
      id: true,
      firstName: true,
      email: true,
      profileStatus: true,
      updatedAt: true,
    },
  });

  await prisma.adminAction.create({
    data: {
      actorId: adminId,
      targetId: userId,
      type: 'PROFILE_REJECTED',
      reason,
    },
  });

  await clearAllDiscoveryCache();

  const { sendNotificationToUser } = await import('../user/notifications.service.js');
  await sendNotificationToUser(
    userId,
    adminId,
    {
      title: 'Profile Update Required ⚠️',
      body: reason ? `Your profile needs changes: ${reason}` : 'Your profile was not approved. Please check your details.',
    },
    'KYC_STATUS_UPDATE',
    { status: 'REJECTED', reason }
  );

  return updatedUser;
};

const adminService = {
  getUsersByStatus,
  getUserByIdForAdmin,
  approveUserById,
  rejectUserById,
};

export default adminService;