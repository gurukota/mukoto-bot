import { db } from '../db/index.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { SessionType } from '../types/index.js';

export const getSession = async (
  userId: string
): Promise<SessionType | undefined> => {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId));
  if (result.length > 0) {
    return JSON.parse(result[0].data) as SessionType;
  }
  return undefined;
};

export const setSession = async (
  userId: string,
  data: Partial<SessionType>
): Promise<void> => {
  const existingSession = await getSession(userId);
  if (existingSession) {
    const updatedData = { ...existingSession, ...data };
    await db
      .update(sessions)
      .set({ data: JSON.stringify(updatedData), updatedAt: new Date() })
      .where(eq(sessions.userId, userId));
  } else {
    await db
      .insert(sessions)
      .values({
        userId,
        data: JSON.stringify(data),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  }
};

export const deleteSession = async (userId: string): Promise<void> => {
  await db.delete(sessions).where(eq(sessions.userId, userId));
};
