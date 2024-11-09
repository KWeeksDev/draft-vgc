import User from './user.js';

class Session {
    constructor(sId) {
        this.sessionId = sId;
        //users - dictionary of socket ids to users
        this.users = [{socketId:"", user:null},{socketId:"", user:null},{socketId:"", user:null},{socketId:"", user:null}];
        this.pool = [];
        //packs - all
        this.packs = [];
        //current round
        this.currentRound = 1;
        //current pick
        this.currentPick = 1;
        //picks made this round
        this.picksDone = 0;
    }

    AddUser(socket, uId) {
        console.log("AddUser");
        console.log(socket);
        console.log(uId);
        let result = -1;
        for (let i = 0; i < 4; i++) {
            // If this spot is available add the player in
            if (this.users[i].socketId == "") {
                this.users[i].socketId = socket;
                this.users[i].user = new User(uId);
                result = i;
                break;
            }
            else if (this.users[i].user.userId == uId) {
                // The user ID is already taken
                result = -2;
                break;
            }
        }
        return result;
    }

    ContainsSocket(socket) {
        console.log("Contains Socket");
        let result = false;
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].socketId == socket) {
                result = true;
                break;
            }
        }
        return result;
    }

    RemoveUserBySocket(socket) {
        console.log("RemoveBySocket");
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].socketId == socket) {
                this.users[i].socketId = "";
                delete this.users[i].user;
                this.users[i].user = null;
                console.log("Removed User");
                break;
            }
        }
    }

    GetUserNames() {
        let names = [];
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].user) {
            names.push(this.users[i].user.userId);
            } else {
                names.push("");
            }
        }
        return names;
    }

    GetUserIndex(uId) {
        let result = -1;
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].user) {
                if (this.users[i].user.userId == uId) {
                    result = i;
                    break;
                }
            }
        }
        return result;
    }

    // Returns true if all players have made a pick
    SaveUserPick(idx, pick) {
        let result = false;
        this.users[idx].user.MakePick(pick);
        // If everyone has made a pick advance the round
        this.picksDone++;
        if (this.picksDone >= this.users.length) {
            result = true;
        } 
        return result;
    }

    AdvancePickRound() {
        let draftComplete = false;
        this.picksDone = 0;
        this.currentPick++;
        if (this.currentPick > 3) {
            this.currentPick = 1;
            this.currentRound++;
            if (this.currentRound > 3) {
                draftComplete = true;
            }
        }
        return draftComplete;
    }

    GetPack(packNum) {
        return this.packs[packNum];
    }

    SetupPacks() {
        // Shuffle the Pool
        this.ShuffleArray(this.pool);

        // Iterate over pool and assign to packs
        const total = this.pool.length;
        const mod= total / 3; 
        this.packs = [];
        for (let i = 0; i < total; i ++) {
            if (!this.packs[i%mod]) {
                this.packs[i%mod] = [];
            }
            this.packs[i%mod].push(this.pool[i]);
        }

        this.ShuffleArray(this.packs);
    }

    // Randomizes given array in place following Fisher-Yates Shuffle
    ShuffleArray(array) {
        let currentIndex = array.length;

        while (currentIndex != 0) {
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
    
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
    }
}

export default Session;