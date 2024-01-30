const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const GameManager = require('./gameManager'); // Import GameManager
const setupSocketEvents = require('./socketManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const gameManager = new GameManager(); // Create an instance of GameManager

setupSocketEvents(io, gameManager); // Pass gameManager to setupSocketEvents

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Room cleanup task
setInterval(() => {
    Object.keys(gameManager.games).forEach(gameId => {
        const game = gameManager.games[gameId];
        if (game.players.length === 0) {
            delete gameManager.games[gameId]; // Remove empty or inactive games
        }
    });
}, 60000); // Run this check every minute, adjust timing as needed
