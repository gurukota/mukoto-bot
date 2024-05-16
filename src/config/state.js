const userStates = {};

function getUserState(userId) {
    return userStates[userId];
}

function setUserState(userId, state) {
    userStates[userId] = state;
}

export { userStates, getUserState, setUserState };
