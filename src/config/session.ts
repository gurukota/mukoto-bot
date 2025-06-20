import { UserSession } from '../types/session.js';

const sessionStore: Record<string, UserSession> = {};

export const getSession = (userId: string): UserSession => {
    if (!sessionStore[userId]) {
        sessionStore[userId] = {};
    }
    return sessionStore[userId];
};

export const setSession = (userId: string, data: Partial<UserSession>): void => {
    if (!sessionStore[userId]) {
        sessionStore[userId] = {};
    }
    Object.assign(sessionStore[userId], data);
};
