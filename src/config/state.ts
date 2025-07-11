const userStates: { [userId: string]: string } = {};

function getUserState(userId: string){
    return userStates[userId];
}

function setUserState(userId: string, state: any): void {
    userStates[userId] = state;
}

export { userStates, getUserState, setUserState };
