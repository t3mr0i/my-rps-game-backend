class GameManager {
    constructor() {
        this.games = {}; // Store all game states
    }


    createNewGame(gameId, numberOfPlayers, password = null) {
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

        this.games[gameId] = newState;
        return newState;
    }

    startGame(gameId) {
        const game = this.games[gameId];
        if (game && game.players.length > 1 && !game.isStarted) {
            game.isStarted = true;
            return true; // Indicate the game started successfully
        }
        return false; // Game did not start
    }


    isGamePasswordProtected(gameId) {
        const game = this.games[gameId];
        return game && game.password;
    }

    isPasswordCorrect(gameId, password) {
        const game = this.games[gameId];
        return game && game.password === password;
    }

    getAllGames() {
        return Object.values(this.games).map(game => ({
            id: game.id,
            isStarted: game.isStarted,
            playerCount: game.players.length
        }));

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

    placeInitialItems(board, numberOfPlayers) {
        // Randomly assign characters, flags, and traps for each player's area
        // For simplicity, here's a basic approach. You'll want to refine this.
        board.forEach((row, rowIndex) => {
            row.forEach((cell, cellIndex) => {
                // Logic to place characters and special items based on player areas
                // This is a simplified example. Customize based on game rules.
                if (Math.random() < 0.1) cell.isTrap = true; // 10% chance of being a trap
                if (Math.random() < 0.05) cell.isFlag = true; // 5% chance of being a flag
                else cell.character = { type: ['R', 'P', 'S'][Math.floor(Math.random() * 3)] }; // Randomly assign R, P, or S
            });
        });
    }

    addPlayerToGame(gameId, playerId) {
        const game = this.getGameState(gameId);
        if (game) {
            // Check if the player is already in the game
            const isPlayerInGame = game.players.some(player => player.id === playerId);

            if (!isPlayerInGame) {
                // Find an empty spot for the new player
                const emptySpotIndex = game.players.findIndex(player => player.id === null);
                if (emptySpotIndex !== -1) {
                    game.players[emptySpotIndex].id = playerId;
                } else {
                    // Handle the case where there's no room for a new player
                    // This depends on your game logic, e.g., you might want to send an error message
                }
            }
        }
    }


    getGameState(gameId) {
        return this.games[gameId];
    }

    addPlayerToGame(gameId, playerId) {
        const game = this.getGameState(gameId);
        if (game && !game.players.includes(playerId)) {
            game.players.push(playerId);
        }
    }

    handleMove(gameId, playerId, move) {
        const game = this.getGameState(gameId);
        if (!game || game.players[game.currentPlayerIndex].id !== playerId || !game.isStarted) {
            return { success: false, message: "It's not your turn, the game hasn't started, or the game does not exist." };
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
        this.updateGameState(gameId, game);
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

    checkWinCondition(gameId) {
        const game = this.getGameState(gameId);
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

    updateGameState(gameId, newState) {
        this.games[gameId] = newState;
        io.to(gameId).emit('gameState', newState); // Notify all clients in the room about the game state update
    }


    resolveCombat(gameId, x, y) {
        const game = this.getGameState(gameId);
        if (!game) return;

        const cell = game.board[x][y];
        if (!cell.character) return;

        // Directions to check for adjacent characters
        const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // Down, Right, Up, Left
        directions.forEach(([dx, dy]) => {
            const adjacentX = x + dx;
            const adjacentY = y + dy;
            if (this.isValidPosition(adjacentX, adjacentY, game.board)) {
                const adjacentCell = game.board[adjacentX][adjacentY];
                if (adjacentCell.character) {
                    // Resolve combat based on RPS rules
                    const winner = this.determineCombatWinner(cell.character, adjacentCell.character);
                    if (winner) {
                        // Update board based on combat outcome
                        adjacentCell.character = winner === cell.character ? null : adjacentCell.character;
                        cell.character = winner === adjacentCell.character ? null : cell.character;
                    }
                }
            }
        });
    }

    determineCombatWinner(character1, character2) {
        const combatRules = { 'R': 'S', 'P': 'R', 'S': 'P' }; // Rock beats Scissors, Paper beats Rock, Scissors beats Paper
        if (combatRules[character1.type] === character2.type) {
            return character1; // character1 wins
        } else if (combatRules[character2.type] === character1.type) {
            return character2; // character2 wins
        }
        return null; // Tie or no combat
    }

    isValidPosition(x, y, board) {
        return x >= 0 && y >= 0 && x < board.length && y < board[0].length;
    }


    checkWinCondition(gameId) {
        const game = this.getGameState(gameId);
        if (!game) return;

        // Check if a player has captured the flag or eliminated all opponents
        // ...

        // If win condition met, handle end of game
    }

    endGame(gameId, winningPlayerId) {
        const game = this.getGameState(gameId);
        game.isGameOver = true;
        game.winningPlayerId = winningPlayerId;
        // Notify players that the game has ended and send the id of the winning player
        io.to(gameId).emit('gameOver', { winner: winningPlayerId });
        // Additional logic for cleaning up the game state, if necessary
    }

}
module.exports = GameManager;

