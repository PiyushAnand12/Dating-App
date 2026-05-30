import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

jest.setTimeout(30000);

describe('Discovery & Swiping', () => {
  const user1Id = 'dev-user-1';
  const user2Id = 'dev-user-2';

  beforeAll(async () => {
    // Setup User 1 (Male, 25)
    await prisma.user.upsert({
      where: { id: user1Id },
      update: {
        firstName: 'User One',
        gender: 'MAN',
        dateOfBirth: new Date('1999-01-01'),
        latitude: 28.6139, // Delhi
        longitude: 77.2090,
        isProfileComplete: true,
        profileStatus: 'APPROVED',
        kycVideoUrl: 'http://example.com/kyc.mp4'
      },
      create: {
        id: user1Id,
        firstName: 'User One',
        gender: 'MAN',
        dateOfBirth: new Date('1999-01-01'),
        latitude: 28.6139,
        longitude: 77.2090,
        isProfileComplete: true,
        profileStatus: 'APPROVED',
        kycVideoUrl: 'http://example.com/kyc.mp4'
      }
    });

    // Setup User 2 (Female, 24)
    await prisma.user.upsert({
      where: { id: user2Id },
      update: {
        firstName: 'User Two',
        gender: 'WOMAN',
        dateOfBirth: new Date('2000-01-01'),
        latitude: 28.6150,
        longitude: 77.2100,
        isProfileComplete: true,
        profileStatus: 'APPROVED',
        kycVideoUrl: 'http://example.com/kyc.mp4'
      },
      create: {
        id: user2Id,
        firstName: 'User Two',
        gender: 'WOMAN',
        dateOfBirth: new Date('2000-01-01'),
        latitude: 28.6150,
        longitude: 77.2100,
        isProfileComplete: true,
        profileStatus: 'APPROVED',
        kycVideoUrl: 'http://example.com/kyc.mp4'
      }
    });

    // Ensure they have at least one photo
    await prisma.photo.upsert({
      where: { id: 'photo-1' },
      update: { userId: user1Id },
      create: { id: 'photo-1', userId: user1Id, url: 'http://example.com/p1.jpg', position: 0 }
    });
    await prisma.photo.upsert({
      where: { id: 'photo-2' },
      update: { userId: user2Id },
      create: { id: 'photo-2', userId: user2Id, url: 'http://example.com/p2.jpg', position: 0 }
    });

    // Set preferences for User 1 to find User 2
    await prisma.userPreferences.upsert({
      where: { userId: user1Id },
      update: { showMe: 'WOMEN', minAge: 18, maxAge: 50, maxDistanceKm: 100 },
      create: { userId: user1Id, showMe: 'WOMEN', minAge: 18, maxAge: 50, maxDistanceKm: 100 }
    });

    // Cleanup previous swipes/matches
    await prisma.match.deleteMany({
      where: { OR: [{ user1Id: user1Id }, { user2Id: user1Id }] }
    });
    await prisma.swipe.deleteMany({
      where: { OR: [{ actorId: user1Id }, { targetId: user1Id }] }
    });
  });

  describe('GET /api/v1/users/discovery', () => {
    test('should return User Two for User One', async () => {
      const response = await request(app)
        .get('/api/v1/users/discovery')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      const profiles = response.body.data;
      expect(profiles.some(p => p.userId === user2Id)).toBe(true);
    });
  });

  describe('POST /api/v1/users/swipes', () => {
    test('should create a swipe and NOT a match on first like', async () => {
      const response = await request(app)
        .post('/api/v1/users/swipes')
        .set('Authorization', 'Bearer test-token')
        .send({ targetUserId: user2Id, direction: 'LIKE' });
      
      expect(response.status).toBe(201);
      expect(response.body.data.isMatch).toBe(false);
    });

    test('should create a match when User Two likes back', async () => {
      // User 2 likes User 1
      const response = await request(app)
        .post('/api/v1/users/swipes')
        .set('Authorization', 'Bearer test-token-2')
        .send({ targetUserId: user1Id, direction: 'LIKE' });
      
      expect(response.status).toBe(201);
      expect(response.body.data.isMatch).toBe(true);
    });
  });
});
