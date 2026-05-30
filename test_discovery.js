import { getDiscoveryProfiles } from './src/modules/user/discovery.service.js';
import prisma from './src/config/prisma.js';

async function test() {
  try {
    const result = await getDiscoveryProfiles({
      currentUserId: 'dev-user-1',
      page: 1,
      limit: 10
    });
    console.log('Total profiles found:', result.data.length);
    if (result.data.length > 0) {
      console.log('First profile:', result.data[0].firstName);
    }
  } catch (err) {
    console.error('Discovery test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
