import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

jest.setTimeout(30000);

describe('Chat & Messaging', () => {
  const user1Id = 'dev-user-1';
  const user2Id = 'dev-user-2';
  const user3Id = 'dev-user-3';
  let testMatchId;

  beforeAll(async () => {
    // Setup Users
    const users = [
      { id: user1Id, email: 'user1@chat.com', firstName: 'User 1' },
      { id: user2Id, email: 'user2@chat.com', firstName: 'User 2' },
      { id: user3Id, email: 'user3@chat.com', firstName: 'User 3' }
    ];

    for (const u of users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: { profileStatus: 'APPROVED' },
        create: { ...u, profileStatus: 'APPROVED' }
      });
    }

    // Create Match between User 1 and User 2
    const match = await prisma.match.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      update: {},
      create: { user1Id, user2Id }
    });
    testMatchId = match.id;

    // Create Match between User 1 and User 3 (for forwarding)
    await prisma.match.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id: user3Id } },
      update: {},
      create: { user1Id, user2Id: user3Id }
    });

    // Cleanup previous messages
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: user1Id }, { receiverId: user1Id }] }
    });
  });

  describe('POST /api/v1/users/messages', () => {
    test('should send a message between matched users', async () => {
      const response = await request(app)
        .post('/api/v1/users/messages')
        .set('Authorization', 'Bearer test-token')
        .send({ receiverId: user2Id, body: 'Hello User 2!' });
      
      expect(response.status).toBe(201);
      expect(response.body.data.body).toBe('Hello User 2!');
      expect(response.body.data.senderId).toBe(user1Id);
    });

    test('should fail if users are not matched', async () => {
      // User 2 and User 3 are NOT matched
      const response = await request(app)
        .post('/api/v1/users/messages')
        .set('Authorization', 'Bearer test-token-2')
        .send({ receiverId: user3Id, body: 'Illegal message' });
      
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/users/messages/:otherUserId', () => {
    test('should fetch conversation history', async () => {
      const response = await request(app)
        .get(`/api/v1/users/messages/${user2Id}`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].body).toBe('Hello User 2!');
    });
  });

  describe('PATCH & DELETE /api/v1/users/messages/:messageId', () => {
    let messageId;

    beforeEach(async () => {
      const msg = await prisma.message.create({
        data: { senderId: user1Id, receiverId: user2Id, body: 'Original message' }
      });
      messageId = msg.id;
    });

    test('should edit a message within 5 minutes', async () => {
      const response = await request(app)
        .patch(`/api/v1/users/messages/${messageId}`)
        .set('Authorization', 'Bearer test-token')
        .send({ body: 'Edited message' });
      
      if (response.status !== 200) {
        console.log('Edit failed:', response.body);
      }
      expect(response.status).toBe(200);
      expect(response.body.data.body).toBe('Edited message');
      expect(response.body.data.isEdited).toBe(true);
    });

    test('should delete a message for everyone within 5 minutes', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/messages/${messageId}`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      
      const deletedMsg = await prisma.message.findUnique({ where: { id: messageId } });
      expect(deletedMsg.isDeleted).toBe(true);
      expect(deletedMsg.body).toBeNull();
    });
  });

  describe('POST /api/v1/users/messages/:messageId/forward', () => {
    test('should forward a message to another match', async () => {
      const msg = await prisma.message.create({
        data: { senderId: user2Id, receiverId: user1Id, body: 'Secrets from User 2' }
      });

      const response = await request(app)
        .post(`/api/v1/users/messages/${msg.id}/forward`)
        .set('Authorization', 'Bearer test-token')
        .send({ receiverId: user3Id });
      
      expect(response.status).toBe(201);
      expect(response.body.data.body).toBe('Secrets from User 2');
      expect(response.body.data.senderId).toBe(user1Id);
      expect(response.body.data.receiverId).toBe(user3Id);
    });
  });
});
