import asyncHandler from '../../utils/asyncHandler.js';
import notificationsService from './notifications.service.js';

export const registerDeviceTokenHandler = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;
  const userId = req.user.id;

  const notificationToken = await notificationsService.registerDeviceToken({
    userId,
    token,
    platform,
  });

  res.status(200).json({
    status: 'success',
    message: 'Device token registered successfully',
    data: notificationToken,
  });
});

export const unregisterDeviceTokenHandler = asyncHandler(async (req, res) => {
  const { token } = req.body;

  await notificationsService.unregisterDeviceToken(token);

  res.status(200).json({
    status: 'success',
    message: 'Device token unregistered successfully',
  });
});
