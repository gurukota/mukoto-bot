import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { UserType } from '../types/index.js';

export const getUserByPhone = async (phone: string): Promise<UserType | null> => {
  const user = await db
    .select({
      id: users.id,
      organiserId: users.organiserId,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      phoneNumber: users.phoneNumber,
      image: users.image,
      role: users.role,
      banned: users.banned,
      banReason: users.banReason,
      banExpires: users.banExpires,
      canApproveTickets: users.canApproveTickets,
      deleted: users.deleted,
    })
    .from(users)
    .where(eq(users.phoneNumber, phone))
    .limit(1);

  return user[0] || null;
};
