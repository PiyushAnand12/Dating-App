import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Authentication', () => {
  const devUser1 = {
    id: 'dev-user-1',
    email: 'testuser@example.com',
    role: 'USER',
  };

  beforeAll(async () => {
    // Ensure dev user exists in DB for integration tests
    await prisma.user.upsert({
      where: { id: devUser1.id },
      update: {
        email: devUser1.email,
        firstName: 'Test',
        isProfileComplete: true,
        profileStatus: 'APPROVED',
      },
      create: {
        id: devUser1.id,
        email: devUser1.email,
        firstName: 'Test',
        isProfileComplete: true,
        profileStatus: 'APPROVED',
      }
    });
  });

  describe('GET /api/v1/users/me', () => {
    test('should return 401 if no token provided', async () => {
      const response = await request(app).get('/api/v1/users/me');
      expect(response.status).toBe(401);
      expect(response.body.errorCode).toBe('UNAUTHORIZED');
    });

    test('should return 200 and user data if valid dev-token provided', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(devUser1.id);
      expect(response.body.data.email).toBe(devUser1.email);
    });

    test('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
    });
  });
});
