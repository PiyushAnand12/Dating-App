import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

jest.setTimeout(30000);

describe('Moderation & Appeals', () => {
  const bannedUserId = 'banned-user-1';
  const adminId = 'dev-admin-1';

  beforeAll(async () => {
    // Setup Banned User
    await prisma.user.upsert({
      where: { id: bannedUserId },
      update: { 
        isActive: false, 
        profileStatus: 'REJECTED' // Simulating banned state
      },
      create: { 
        id: bannedUserId, 
        email: 'banned@example.com', 
        firstName: 'Banned',
        isActive: false,
        profileStatus: 'REJECTED'
      }
    });

    // Setup Admin
    await prisma.user.upsert({
      where: { id: adminId },
      update: { role: 'ADMIN' },
      create: { 
        id: adminId, 
        email: 'admin@appeal.com', 
        firstName: 'Admin',
        role: 'ADMIN'
      }
    });

    // Cleanup previous appeals
    await prisma.appeal.deleteMany({
      where: { userId: bannedUserId }
    });
  });

  describe('POST /api/v1/users/appeals', () => {
    test('should allow banned user to submit an appeal', async () => {
      // We need a way to authenticate the banned user. 
      // Our auth middleware doesn't block "isActive=false" users from accessing the appeal endpoint 
      // because they need to be able to appeal!
      
      const response = await request(app)
        .post('/api/v1/users/appeals')
        .set('Authorization', 'Bearer test-token-banned') // I need to add this to middleware bypass
        .send({ reason: 'I am sorry for my behavior.' });
      
      expect(response.status).toBe(201);
      expect(response.body.data.reason).toBe('I am sorry for my behavior.');
      expect(response.body.data.status).toBe('PENDING');
    });
  });

  describe('ADMIN /api/v1/users/appeals/admin', () => {
    let appealId;

    beforeEach(async () => {
      const appeal = await prisma.appeal.findFirst({ where: { userId: bannedUserId } });
      appealId = appeal.id;
    });

    test('should allow admin to review and accept appeal', async () => {
      const response = await request(app)
        .patch(`/api/v1/users/admin/appeals/${appealId}/review`)
        .set('Authorization', 'Bearer admin-test-token')
        .send({ status: 'ACCEPTED', remarks: 'Reinstated after review.' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ACCEPTED');

      // Check if user is reinstated
      const user = await prisma.user.findUnique({ where: { id: bannedUserId } });
      expect(user.isActive).toBe(true);
      expect(user.profileStatus).toBe('APPROVED');
    });
  });
});
