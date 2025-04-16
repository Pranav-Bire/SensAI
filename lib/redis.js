import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// In-memory store for development
const inMemoryStore = new Map();

export async function setInterviewSession(sessionId, data) {
  try {
    inMemoryStore.set(sessionId, {
      data: JSON.stringify(data),
      expiry: Date.now() + 3600000 // 1 hour
    });
  } catch (error) {
    console.error('Error setting interview session:', error);
  }
}

export async function getInterviewSession(sessionId) {
  try {
    const session = inMemoryStore.get(sessionId);
    if (!session) return null;
    
    // Check expiry
    if (Date.now() > session.expiry) {
      inMemoryStore.delete(sessionId);
      return null;
    }
    
    return JSON.parse(session.data);
  } catch (error) {
    console.error('Error getting interview session:', error);
    return null;
  }
}

export async function deleteInterviewSession(sessionId) {
  try {
    inMemoryStore.delete(sessionId);
  } catch (error) {
    console.error('Error deleting interview session:', error);
  }
}

export default {
  set: setInterviewSession,
  get: getInterviewSession,
  del: deleteInterviewSession
}; 