import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { app } from '../../backend/src/app';

// Mock database pool
jest.mock('../../backend/src/config/database', () => ({
  dbPool: {
    query: jest.fn().mockImplementation(async (sql: string, params: any[] = []) => {
      if (sql.includes('INSERT INTO needs')) {
        return {
          rows: [
            {
              id: params[0],
              title: params[1],
              description: params[2],
              category: params[3],
              urgency: params[4],
              latitude: params[5],
              longitude: params[6],
              location: params[7],
              image_url: params[8],
              status: params[9],
              is_minor_involved: params[10],
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      return { rows: [] };
    }),
  },
}));

describe('Needs & Geo-Reporting API Suite', () => {
  const testImagePath = path.join(__dirname, 'test_sample.jpg');

  beforeAll(() => {
    // Create a dummy image file buffer for testing upload
    const dummyJpgBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0xff, 0xd9,
    ]);
    fs.writeFileSync(testImagePath, dummyJpgBuffer);
  });

  afterAll(() => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  it('should successfully report a need with geo coordinates and photo upload', async () => {
    const res = await request(app)
      .post('/api/v1/needs')
      .field('title', 'Urgent Food Ration needed near Anand Vihar')
      .field('description', 'Family of 4 requires dry ration pack immediately.')
      .field('category', 'Food')
      .field('urgency', 'Urgent')
      .field('latitude', '28.6469')
      .field('longitude', '77.3164')
      .field('location', 'Anand Vihar, Delhi')
      .attach('photo', testImagePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.need).toBeDefined();
    expect(res.body.need.title).toBe('Urgent Food Ration needed near Anand Vihar');
    expect(res.body.need.latitude).toBe(28.6469);
    expect(res.body.need.longitude).toBe(77.3164);
    expect(res.body.need.imageUrl).toMatch(/^\/storage\/needs\/need_/);
  });

  it('should reject reports missing title or with invalid title', async () => {
    const res = await request(app)
      .post('/api/v1/needs')
      .field('title', 'Hi') // too short
      .field('latitude', '28.6469')
      .field('longitude', '77.3164');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Title is required');
  });

  it('should reject reports missing GPS coordinates', async () => {
    const res = await request(app)
      .post('/api/v1/needs')
      .field('title', 'Medical Aid Needed');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Valid GPS');
  });

  it('should list reported needs and calculate distances', async () => {
    const res = await request(app)
      .get('/api/v1/needs')
      .query({ lat: 28.65, lng: 77.32, radiusKm: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.needs)).toBe(true);
  });
});
