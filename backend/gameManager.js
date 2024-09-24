const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBy7h2IqsRmcUnss6mst-Zd1tCMM0Z4HE0",
    authDomain: "rps-game-6b432.firebaseapp.com",
    projectId: "rps-game-6b432",
    storageBucket: "rps-game-6b432.appspot.com",
    messagingSenderId: "789772515371",
    appId: "1:789772515371:web:8e56f3e0e3601421b5526e",
    measurementId: "G-Q2PHBHJRG4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class GameManager {
    constructor() {
        this.games = {}; // Store all game states
    }

    async createNewGame(gameId, numberOfPlayers, password = null) {
        const newState = {
            id: gameId,
            board: this.initializeBoard(numberOfPlayers),
            players: Array(numberOfPlayers).fill(null).map(() => ({
                pieces: [],
                flag: null,
                trap: null
            })),
            currentPlayerIndex: 0,
            isStarted: false,
            password,
            flagsPlaced: 0,
            trapsPlaced: 0,
            numberOfPlayers,
        };

        await setDoc(doc(db, 'games', gameId), newState);
        return newState;
    }

    async startGame(gameId) {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
            const game = gameSnap.data();
            if (game.players.length > 1 && !game.isStarted) {
                await updateDoc(gameRef, { isStarted: true });
                return true; // Indicate the game started successfully
            }
        }
        return false; // Game did not start
    }

    async isGamePasswordProtected(gameId) {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
            const game = gameSnap.data();
            return game.password;
        }
        return false;
    }

    async isPasswordCorrect(gameId, password) {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
            const game = gameSnap.data();
            return game.password === password;
        }
        return false;
    }

    async getAllGames() {
        const gamesSnapshot = await getDocs(collection(db, 'games'));
        return gamesSnapshot.docs.map(doc => {
            const game = doc.data();
            return {
                id: game.id,
                isStarted: game.isStarted,
                playerCount: game.players.length
            };
        });
    }

    initializeBoard(numberOfPlayers) {
        let board = numberOfPlayers % 2 === 1 ? this.initializeHexagonalBoard(numberOfPlayers) : this.initializeRectangularBoard(numberOfPlayers);
        return board;
    }

    initializeHexagonalBoard(numberOfPlayers) {
        const size = Math.ceil(numberOfPlayers * 1.5);
        let board = [];
        for (let row = 0; row < size; row++) {
            let length = size - Math.abs(Math.floor(size / 2) - row);
            let cells = new Array(length).fill(null).map(() => this.createEmptyCell());
            board.push(cells);
        }
        return board;
    }

    initializeRectangularBoard(numberOfPlayers) {
        const rows = 8;
        const cols = 8 + (numberOfPlayers - 2) * 3;
        let board = [];
        for (let row = 0; row < rows; row++) {
            let cells = new Array(cols).fill(null).map(() => this.createEmptyCell());
            board.push(cells);
        }
        return board;
    }

    createEmptyCell() {
        return { character: null, isTrap: false, isFlag: false };
    }

    async addPlayerToGame(gameId, playerId) {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
            const game = gameSnap.data();
            const isPlayerInGame = game.players.some(player => player.id === playerId);

            if (!isPlayerInGame) {
                const emptySpotIndex = game.players.findIndex(player => player.id === null);
                if (emptySpotIndex !== -1) {
                    game.players[emptySpotIndex].id = playerId;
                    await updateDoc(gameRef, { players: game.players });
                } else {
                    // Handle the case where there's no room for a new player
                    // This depends on your game logic, e.g., you might want to send an error message
                }
            }
        }
    }

    async getGameState(gameId) {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
            return gameSnap.data();
        }
        return null;
    }

    async handleMove(gameId, playerId, move) {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) {
            return { success: false, message: "Game does not exist." };
        }

        const game = gameSnap.data();
        if (game.players[game.currentPlayerIndex].id !== playerId || !game.isStarted) {
            return { success: false, message: "It's not your turn or the game hasn't started." };
        }

        const { characterId, newX, newY } = move;
        const character = this.getCharacterById(game, characterId);
        const targetCell = game.board[newX][newY];

        if (!character || !this.isValidMove(character, newX, newY, game.board)) {
            return { success: false, message: "Invalid move." };
        }

        if (targetCell.character) {
            if (this.isFriendly(character, targetCell.character)) {
                return { success: false, message: "Cannot move to a cell occupied by a friendly character." };
            } else {
                const combatResult = this.resolveCombat(character, targetCell.character);
                game.board[character.position.x][character.position.y].character = null; // Clear old position
                if (combatResult.winner === character) {
                    game.board[newX][newY].character = character; // Move to new position
                    character.position = { x: newX, y: newY };
                    // Handle combat result (e.g., remove defeated character)
                }
                // Other combat resolution steps...
            }
        } else {
            game.board[character.position.x][character.position.y].character = null; // Clear old position
            game.board[newX][newY].character = character; // Move to new position
            character.position = { x: newX, y: newY };
        }

        this.checkWinCondition(gameId);
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        await updateDoc(gameRef, game);
        return { success: true, message: "Move completed successfully." };
    }

    getCharacterById(game, characterId) {
        // Logic to retrieve a character by its ID
    }

    isValidMove(character, newX, newY, board) {
        // Check boundaries
        if (newX < 0 || newY < 0 || newX >= board.length || newY >= board[newX].length) {
            return false;
        }
        // Check if move is only one cell in any direction and the cell is not occupied by a friendly piece
        const deltaX = Math.abs(character.position.x - newX);
        const deltaY = Math.abs(character.position.y - newY);
        return (deltaX + deltaY === 1) && !board[newX][newY].character;
    }

    isFriendly(character1, character2) {
        // Assuming each character has a playerId property
        return character1.playerId === character2.playerId;
    }

    resolveCombat(attacker, defender) {
        const rules = {
            'R': 'S', // Rock crushes Scissors
            'P': 'R', // Paper covers Rock
            'S': 'P' // Scissors cut Paper
        };

        if (rules[attacker.type] === defender.type) {
            return { winner: attacker, loser: defender };
        } else if (rules[defender.type] === attacker.type) {
            return { winner: defender, loser: attacker };
        } else {
            // In case of a tie, the defender wins by default or specific game rule
            return { winner: defender, loser: attacker };
        }
    }

    async checkWinCondition(gameId) {
        const game = await this.getGameState(gameId);
        let isGameOver = false;
        let winningPlayerId = null;

        // Example win condition: Check if any player's flag is captured
        for (let player of game.players) {
            if (player.flag && game.board[player.flag.position.x][player.flag.position.y].character &&
                game.board[player.flag.position.x][player.flag.position.y].character.playerId !== player.id) {
                isGameOver = true;
                winningPlayerId = game.board[player.flag.position.x][player.flag.position.y].character.playerId;
                break;
            }
        }

        if (isGameOver) {
            this.endGame(gameId, winningPlayerId);
        }
    }

    async endGame(gameId, winningPlayerId) {
        const gameRef = doc(db, 'games', gameId);
        await updateDoc(gameRef, {
            isGameOver: true,
            winningPlayerId: winningPlayerId
        });
        // Notify players that the game has ended and send the id of the winning player
        // Additional logic for cleaning up the game state, if necessary
    }
}

module.exports = GameManager;

