import { db } from '../db/index.js';
import { states } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const getUserState = async (
  userId: string
): Promise<string | undefined> => {
  const result = await db
    .select()
    .from(states)
    .where(eq(states.userId, userId));
  if (result.length > 0) {
    return result[0].state;
  }
  return undefined;
};

export const setUserState = async (
  userId: string,
  state: string
): Promise<void> => {
  const existingState = await getUserState(userId);
  if (existingState) {
    await db
      .update(states)
      .set({ state, updatedAt: new Date() })
      .where(eq(states.userId, userId));
  } else {
    await db
      .insert(states)
      .values({ userId, state, createdAt: new Date(), updatedAt: new Date() });
  }
};

export const deleteUserState = async (userId: string): Promise<void> => {
  await db.delete(states).where(eq(states.userId, userId));
};
