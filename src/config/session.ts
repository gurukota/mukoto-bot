import { SessionType } from "types/index.js";

const sessionStore: { [userId: string]: SessionType } = {};

export const getSession = (userId: string): SessionType => {
    if (!sessionStore[userId]) {
        sessionStore[userId] = {
            total: 0,
            quantity: 0,
            paymentMethod: ""
        };
    }
    return sessionStore[userId];
};

export const setSession = (userId: string, data: Partial<SessionType>): void => {
    if (!sessionStore[userId]) {
        sessionStore[userId] = {
            total: 0,
            quantity: 0,
            paymentMethod: ""
        };
    }
    Object.assign(sessionStore[userId], data);
};
