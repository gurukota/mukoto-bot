const sessionStore = {};

export const getSession = (userId: string) => {
    if (!sessionStore[userId]) {
        sessionStore[userId] = {};
    }
    return sessionStore[userId];
};

export const setSession = (userId: string, data: any) => {
    if (!sessionStore[userId]) {
        sessionStore[userId] = {};
    }
    Object.assign(sessionStore[userId], data);
};
