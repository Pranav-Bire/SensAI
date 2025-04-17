/**
 * Mock database client for development
 * This file provides a mock implementation when a real database isn't available
 */

// Create a mock DB client that logs operations but doesn't actually connect to a database
export const db = {
  user: {
    findUnique: async () => {
      console.log('Mock DB: findUnique on user table called');
      return null; // Return null to simulate user not found
    }
  },
  savedJob: {
    create: async (data) => {
      console.log('Mock DB: create on savedJob table called', data);
      return { id: 'mock-id', ...data.data };
    },
    findMany: async () => {
      console.log('Mock DB: findMany on savedJob table called');
      return []; // Return empty array to fall back to memory storage
    },
    deleteMany: async (where) => {
      console.log('Mock DB: deleteMany on savedJob table called', where);
      return { count: 0 };
    }
  }
}; 