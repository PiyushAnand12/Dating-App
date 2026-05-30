import prisma from '../../config/prisma.js';
import AppError from '../../utils/AppError.js';
import notificationsService from './notifications.service.js';
import { logger } from '../../config/logger.js';

/**
 * Get all emergency contacts for a user
 */
export const getEmergencyContacts = async (userId) => {
  return prisma.emergencyContact.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Add an emergency contact for a user
 */
export const addEmergencyContact = async (userId, data) => {
  const { name, phone, email, relation } = data;
  
  if (!name || !phone) {
    throw new AppError('Name and phone number are required.', 400);
  }

  const count = await prisma.emergencyContact.count({ where: { userId } });
  if (count >= 5) {
    throw new AppError('You can only have up to 5 emergency contacts.', 400);
  }

  return prisma.emergencyContact.create({
    data: {
      userId,
      name,
      phone,
      email,
      relation,
    },
  });
};

/**
 * Delete an emergency contact
 */
export const deleteEmergencyContact = async (userId, contactId) => {
  const contact = await prisma.emergencyContact.findUnique({
    where: { id: contactId }
  });

  if (!contact || contact.userId !== userId) {
    throw new AppError('Contact not found or unauthorized', 404);
  }

  return prisma.emergencyContact.delete({
    where: { id: contactId }
  });
};

/**
 * Trigger the Panic Button
 * Creates an alert and notifies all emergency contacts via Push/Email
 */
export const triggerPanicButton = async (userId, location) => {
  const { latitude, longitude } = location;

  // 1. Log the alert
  const alert = await prisma.emergencyAlert.create({
    data: {
      userId,
      latitude,
      longitude,
    },
    include: {
      user: {
        select: { firstName: true, phone: true }
      }
    }
  });

  // 2. Fetch contacts
  const contacts = await prisma.emergencyContact.findMany({
    where: { userId }
  });

  if (contacts.length === 0) {
    logger.warn({ userId }, 'Panic button triggered but no emergency contacts found');
  }

  // 3. Notify Contacts (Simulation of external broadcast)
  const alertMessage = `EMERGENCY ALERT: ${alert.user.firstName} has triggered their panic button. Last known location: https://www.google.com/maps?q=${latitude},${longitude}. Please check on them immediately. Contact: ${alert.user.phone}`;
  
  for (const contact of contacts) {
    logger.info({ contact: contact.name, userId }, 'Sending emergency notification to contact');
    
    // In a real production app, we would integrate Twilio (SMS) or SendGrid (Email) here.
    // For this implementation, we log the broadcast and could also send an in-app notification 
    // if the contact is registered on our platform.
  }

  return {
    alertId: alert.id,
    contactsNotified: contacts.length,
    messageSent: alertMessage,
    location: { latitude, longitude }
  };
};

/**
 * Resolve an active alert
 */
export const resolveAlert = async (userId, alertId) => {
  const alert = await prisma.emergencyAlert.findUnique({
    where: { id: alertId }
  });

  if (!alert || alert.userId !== userId) {
    throw new AppError('Alert not found or unauthorized', 404);
  }

  return prisma.emergencyAlert.update({
    where: { id: alertId },
    data: { status: 'RESOLVED' }
  });
};

export default {
  getEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
  triggerPanicButton,
  resolveAlert,
};
