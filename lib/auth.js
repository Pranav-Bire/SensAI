import { auth } from "@clerk/nextjs";

export const authOptions = {
  // Export the auth function from Clerk
  auth,
  // Add any additional configuration options here
  callbacks: {
    // Add any custom callbacks if needed
    session: async ({ session, token }) => {
      return session;
    },
  },
  // You can add more configuration options as needed
  pages: {
    signIn: '/sign-in',
    signOut: '/sign-out',
    error: '/error',
  },
};

// Helper function to get the current session
export async function getSession() {
  const { userId } = await auth();
  return userId ? { user: { id: userId } } : null;
}

// Helper function to protect API routes
export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
} 