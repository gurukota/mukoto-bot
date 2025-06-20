import { UserState } from '../types/session.js';

const userStates: Record<string, UserState> = {};

function getUserState(userId: string): UserState | undefined {
    return userStates[userId];
}

function setUserState(userId: string, state: UserState): void {
    userStates[userId] = state;
}

export { userStates, getUserState, setUserState };
