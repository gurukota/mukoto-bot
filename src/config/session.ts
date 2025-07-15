import { SessionType } from '../types/index.js';
import {
  getSession as getSessionFromDb,
  setSession as setSessionInDb,
} from '../repository/sessionsDal.js';

export const getSession = async (userId: string): Promise<SessionType> => {
  let session = await getSessionFromDb(userId);
  if (!session) {
    session = {
      total: 0,
      quantity: 0,
      paymentMethod: '',
    };
    await setSessionInDb(userId, session);
  }
  return session;
};

export const setSession = async (
  userId: string,
  data: Partial<SessionType>
): Promise<void> => {
  await setSessionInDb(userId, data);
};
