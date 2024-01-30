const GameManager = require('./gameManager');

function setupSocketEvents(io) {
    const gameManager = new GameManager();

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);


        socket.on('startGame', (gameId) => {
            const gameStarted = gameManager.startGame(gameId);
            if (gameStarted) {
                io.to(gameId).emit('gameState', gameManager.getGameState(gameId));
            } else {
                // Handle the case where the game did not start (e.g., not enough players)
                socket.emit('gameStartFailed', 'Not enough players');
            }
        });


        socket.on('getAllGames', () => {

            socket.emit('allGames', gameManager.getAllGames());
        });

        socket.on('createGame', (data) => {
            const gameId = generateGameId();
            console.log(`Creating game with ID: ${gameId}`); // Add this line
            const game = gameManager.createNewGame(gameId, data.numberOfPlayers, data.password);
            socket.emit('gameCreated', gameId); // Let the client know the game is created
            gameManager.addPlayerToGame(gameId, socket.id);
            io.to(gameId).emit('gameState', game);
        });


        socket.on('joinGame', ({ roomId, password }) => {
            console.log(`Player ${socket.id} is attempting to join game ${roomId}`);
            const gameState = gameManager.getGameState(roomId);
            if (gameState) {
                if (gameState.password && gameState.password !== password) {
                    socket.emit('error', 'Incorrect password');
                    return;
                }
                socket.join(roomId);

                gameManager.addPlayerToGame(roomId, socket.id);
                io.to(roomId).emit('gameState', gameState);
            } else {
                socket.emit('error', 'Game not found');
            }
        });



        socket.on('moveCharacter', ({ gameId, playerId, move }) => {
            gameManager.handleMove(gameId, playerId, move);
            io.to(gameId).emit('gameState', gameManager.getGameState(gameId));
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
            // Handle player disconnection, update game state if necessary
        });
    });
}

function generateGameId() {
    return Math.random().toString(36).substr(2, 9);
}

module.exports = setupSocketEvents;
