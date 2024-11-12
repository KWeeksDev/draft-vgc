import Session from './utility/session.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
const app = express();
const server = createServer(app);
const io = new Server(server);
dotenv.config();
const PORT = process.env.API_PORT || 3000;
const HOST = process.env.API_URL || 'localhost';
const sessions = [];
console.log(`HOST = ${HOST}`);
console.log(`PORT = ${PORT}`);
// pickOrder[user,round,pick]
const packOrder = [[[0,3,2],[4,5,6],[8,11,10]],
                   [[1,0,3],[5,6,7],[9,8,11]],
                   [[2,1,0],[6,7,4],[10,9,8]],
                   [[3,2,1],[7,4,5],[11,10,9]]];


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/create', async (req, res) => {
    const paste = req.body;

    try {
        const response = await axios.post('https://pokepast.es/create', null, {
            params: {
                paste: paste.paste,
            },
        });

        const pokePasteUrl = response.request.res.responseUrl;
        //console.log(pokePasteUrl);
        res.json({ url: pokePasteUrl }); // Send the response back to the client
    } catch (error) {
        console.error(error);
        // Send an error response back to the client
        res.status(500).json({ error: 'Failed to create PokePaste', details: error.message });
    }
});

app.use(express.static(path.join(__dirname, 'public')));
// serve a simple html HTML page 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// endpoint to join a session
app.post('/join/:sessionId', (req,res) => {
    const sessionId = req.params.sessionId;

    // Check if session exists, in not create one
    if (!sessions[sessionId]) {
        sessions[sessionId] = new Session(sessionId);
    }

    // simulate joining a session (you might want to add user id)
    res.json({ message:`Joined session ${sessionId}`, users: sessions[sessionId] });
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinSession', (sessionId, userId) => {
        if (!sessions[sessionId]) {
            sessions[sessionId] = new Session(sessionId);
        }
        const idx = sessions[sessionId].AddUser(socket.id, userId);
        console.log(`Idx = ${idx}`);
        if (idx >= 0) {
            socket.join(sessionId);
            console.log(`User ${userId} joined session: ${sessionId}`);
            io.to(sessionId).emit('userJoined', userId, sessionId);
        } else {
            // Unable to join Session
            socket.emit('joinFailed', `${getErrorString(idx)}`);
        }
    });

    socket.on('disconnect', () => {
        for (const sId in sessions) {
            if (sessions[sId].ContainsSocket(socket.id)) {
                sessions[sId].RemoveUserBySocket(socket.id);
                io.to(sessions[sId].sessionId).emit('userNames', sessions[sId].GetUserNames());
                return;
            }
        }
    });

    socket.on('getUsers', (sessionId) =>{
        if (!sessions[sessionId]) {
            io.to(sessionId).emit('userNames',["","","",""]);
        }
        io.to(sessionId).emit('userNames',sessions[sessionId].GetUserNames());
    });

    socket.on('setPool', (inPool, sessionId) => {
        sessions[sessionId].pool = inPool;
        io.to(sessionId).emit('pokemonPool', inPool);
        sessions[sessionId].SetupPacks();
    })

    socket.on('getPool', (sessionId) => {
        io.to(sessionId).emit('pokemonPool', sessions[sessionId].pool);
    });

    socket.on('getPacks', (sessionId) => {
        io.to(sessionId).emit('pokemonPacks', packs[sessionId]);
    });

    socket.on('getPack', (sId, uId) => {
        const userIndex = sessions[sId].GetUserIndex(uId);
        console.log(userIndex);
        if (userIndex >= 0) {
            const packNumber = packOrder[userIndex][sessions[sId].currentRound-1][sessions[sId].currentPick-1];

            socket.emit('pokemonPack', sessions[sId].GetPack(packNumber));
        }
    });

    socket.on('startRound', (sId) => {
        io.to(sId).emit('pokemonPool', sessions[sId].pool);
        sessions[sId].currentRound = 1;
        sessions[sId].currentPick = 1;
        io.to(sId).emit('roundUpdated',sessions[sId].currentRound, sessions[sId].currentPick);
        io.to(sId).emit('readyForNextPack');
    });

    socket.on("makePick", (sId, uId, pick) => {
        const userIndex = sessions[sId].GetUserIndex(uId);
        if (userIndex >= 0) {
            const packNumber = packOrder[userIndex][sessions[sId].currentRound-1][sessions[sId].currentPick-1];
            sessions[sId].packs[packNumber][pick] = undefined;
            if (sessions[sId].SaveUserPick(userIndex, pick)) {
                //next packs
                if (!sessions[sId].AdvancePickRound()) {
                    io.to(sId).emit('roundUpdated',sessions[sId].currentRound, sessions[sId].currentPick);
                    io.to(sId).emit('readyForNextPack');
                } else {
                    // Draft complete
                    io.to(sId).emit('draftComplete');
                }
            } else {
                io.to(sId).emit('waitingForPicks');
            }
        }
    });

    socket.on('generatePasteUrl', async (paste) => {
        const Paste = paste;
        console.log('Paste:');
        console.log(paste);
        try {
            const response = await axios.post('https://pokepast.es/create', null, {
                params: {
                    paste: Paste,
                },
            });
    
            const pokePasteUrl = response.request.res.responseUrl;
            console.log(pokePasteUrl);
            //res.json({ url: pokePasteUrl }); // Send the response back to the client
            socket.emit('pasteUrl', pokePasteUrl);
        } catch (error) {
            console.error(error);
            // Send an error response back to the client
            //res.status(500).json({ error: 'Failed to create PokePaste', details: error.message });
        }
    });
});

// start a server
// "0.0.0.0" <-production, blank for localhost
server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});

function getErrorString(id) {
    let errorString = "Unknown Error";
    switch (id) {
        case -1:
            errorString = "Session is Full";
            break;
        case -2:
            errorString = "User Id already in use!";
            break;
    }
    return errorString;
}
