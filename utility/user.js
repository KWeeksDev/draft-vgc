class User {
    constructor(uId) {
        //user id
        this.userId = uId;
        //picks
        this.picks = [];
    }

    MakePick(pick) {
        this.picks.push(pick);
    }
}

export default User;