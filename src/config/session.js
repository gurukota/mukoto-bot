const sessionStore = {};

export const getSession = (userId) => {
    if (!sessionStore[userId]) {
        sessionStore[userId] = {};
    }
    return sessionStore[userId];
};

export const setSession = (userId, data) => {
    if (!sessionStore[userId]) {
        sessionStore[userId] = {};
    }
    Object.assign(sessionStore[userId], data);
};
