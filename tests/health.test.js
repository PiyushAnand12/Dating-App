import request from 'supertest';
import app from '../src/app.js';

describe('Health Check', () => {
  test('GET /health should return 200 and status ok', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String)
    });
  });

  test('GET /non-existent-route should return 404', async () => {
    const response = await request(app).get('/api/v1/unknown');
    expect(response.status).toBe(404);
  });
});
