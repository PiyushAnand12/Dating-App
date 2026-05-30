import asyncHandler from '../../utils/asyncHandler.js';
import safetyService from './safety.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

/**
 * Get all emergency contacts
 */
export const getEmergencyContactsHandler = asyncHandler(async (req, res) => {
  const contacts = await safetyService.getEmergencyContacts(req.user.id);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Emergency contacts fetched successfully.',
    data: contacts,
  });
});

/**
 * Add an emergency contact
 */
export const addEmergencyContactHandler = asyncHandler(async (req, res) => {
  const contact = await safetyService.addEmergencyContact(req.user.id, req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Emergency contact added successfully.',
    data: contact,
  });
});

/**
 * Delete an emergency contact
 */
export const deleteEmergencyContactHandler = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  await safetyService.deleteEmergencyContact(req.user.id, contactId);
  sendSuccess(res, {
    statusCode: 200,
    message: 'Emergency contact removed.',
  });
});

/**
 * Panic Button Trigger
 */
export const triggerPanicHandler = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const result = await safetyService.triggerPanicButton(req.user.id, { latitude, longitude });

  sendSuccess(res, {
    statusCode: 201,
    message: 'EMERGENCY ALERT TRIGGERED. Contacts are being notified.',
    data: result,
  });
});

/**
 * Resolve an alert
 */
export const resolveAlertHandler = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  await safetyService.resolveAlert(req.user.id, alertId);
  sendSuccess(res, { message: 'Emergency alert marked as resolved.' });
});

export default {
  getEmergencyContactsHandler,
  addEmergencyContactHandler,
  deleteEmergencyContactHandler,
  triggerPanicHandler,
  resolveAlertHandler,
};
