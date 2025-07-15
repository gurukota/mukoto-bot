import {
  getUserState as getStateFromDb,
  setUserState as setStateInDb,
} from '../repository/statesDal.js';

async function getUserState(userId: string): Promise<string | undefined> {
  return await getStateFromDb(userId);
}

async function setUserState(userId: string, state: any): Promise<void> {
  await setStateInDb(userId, state);
}

export { getUserState, setUserState };
