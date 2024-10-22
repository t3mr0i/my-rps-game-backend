import React, { useState, useEffect } from 'react';
import { db, auth, rtdb } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { ref, onValue, set, push, get, update } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Auth from './Auth';
import { Chessboard } from 'react-chessboard';
import { FaUserCircle, FaCircle, FaCopy, FaBars, FaTimes } from 'react-icons/fa';
import GameBrowser from './GameBrowser';
import Chat from './Chat';

// Custom piece components
const CustomPiece = ({ type }) => {
  const pieceStyle = { fontSize: '40px', fontWeight: 'bold', cursor: 'grab' };
  const pieceIcons = {
    'bR': '🪨', 'bP': '📄', 'bS': '✂️',
    'wR': '🪨', 'wP': '📄', 'wS': '✂️',
  };
  return <div style={pieceStyle}>{pieceIcons[type]}</div>;
};

const customPieces = {
  bR: () => <CustomPiece type="bR" />,
  bP: () => <CustomPiece type="bP" />,
  bS: () => <CustomPiece type="bS" />,
  wR: () => <CustomPiece type="wR" />,
  wP: () => <CustomPiece type="wP" />,
  wS: () => <CustomPiece type="wS" />,
};

const initialBoard = () => {
  const board = Array(7).fill(null).map(() => Array(7).fill(null).map(() => ({
    character: null,
    isFlag: false,
    isTrap: false
  })));

  const assignCharacter = (row, type) => {
    const items = ['rock', 'paper', 'scissors'];
    for (let col = 0; col < 7; col++) {
      board[row][col] = {
        character: { type: `${type}-${items[Math.floor(Math.random() * items.length)]}` },
        isFlag: false,
        isTrap: false
      };
    }
  };

  assignCharacter(0, 'blue');
  assignCharacter(1, 'blue');
  assignCharacter(5, 'red');
  assignCharacter(6, 'red');

  return board;
};

const serializeBoard = (board) => {
  return board.flat().map(cell => ({
    character: cell.character ? { type: cell.character.type } : null,
    isFlag: cell.isFlag,
    isTrap: cell.isTrap
  }));
};

const deserializeBoard = (serializedBoard) => {
  const board = [];
  for (let i = 0; i < 7; i++) {
    board.push(serializedBoard.slice(i * 7, (i + 1) * 7));
  }
  return board;
};

const App = () => {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [board, setBoard] = useState(initialBoard());
  const [placingFlag, setPlacingFlag] = useState(false);
  const [placingTrap, setPlacingTrap] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [turn, setTurn] = useState(null);
  const [newName, setNewName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState({});
  const [inviteLink, setInviteLink] = useState('');
  const [publicGames, setPublicGames] = useState([]);
  const [privateGames, setPrivateGames] = useState([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'games'), (snapshot) => {
      const gamesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGames(gamesList);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribePublic = onSnapshot(query(collection(db, 'games'), where('isPublic', '==', true)), (snapshot) => {
      const publicGamesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPublicGames(publicGamesList);
    });

    const unsubscribePrivate = onSnapshot(query(collection(db, 'games'), where('isPublic', '==', false)), (snapshot) => {
      const privateGamesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrivateGames(privateGamesList);
    });

    return () => {
      unsubscribePublic();
      unsubscribePrivate();
    };
  }, []);

  useEffect(() => {
    if (currentGame) {
      const gameRef = ref(rtdb, `games/${currentGame.id}`);
      const unsubscribe = onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setCurrentGame(prevGame => ({
            ...prevGame,
            ...data,
            board: deserializeBoard(data.board)
          }));
          setTurn(data.turn);
          setPosition(boardToPosition(deserializeBoard(data.board)));
        }
      });
      return () => unsubscribe();
    }
  }, [currentGame?.id]);

  useEffect(() => {
    const handleGameLink = async () => {
      const path = window.location.pathname;
      const match = path.match(/\/game\/(.+)/);
      if (match && match[1]) {
        const gameId = match[1];
        await joinGame(gameId);
      }
    };

    handleGameLink();
  }, [user]); // Add this useEffect near the top of your component

  const createGame = async (isPublic = true) => {
    if (user) {
      const newGameRef = push(ref(rtdb, 'games'));
      const newGame = {
        id: newGameRef.key,
        board: serializeBoard(initialBoard()),
        players: [user.uid],
        isStarted: false,
        isPublic: isPublic,
        turn: null,
        setupComplete: false
      };
      await set(newGameRef, newGame);
      setCurrentGame({ ...newGame, board: deserializeBoard(newGame.board) });
      setInviteLink(`${window.location.origin}/game/${newGameRef.key}`);
      toast.success('Game created successfully!');
    } else {
      toast.error('Please sign in to create a game.');
    }
  };

  const joinGame = async (gameId) => {
    if (!user) {
      await signInAnonymously(auth);
    }
    const gameRef = ref(rtdb, `games/${gameId}`);
    const gameSnapshot = await get(gameRef);
    
    if (gameSnapshot.exists()) {
      const gameData = gameSnapshot.val();
      if (!gameData.players.includes(user.uid) && gameData.players.length < 2) {
        const updatedPlayers = [...gameData.players, user.uid];
        await update(gameRef, { players: updatedPlayers });
        setCurrentGame({ id: gameId, ...gameData, board: deserializeBoard(gameData.board), players: updatedPlayers });
        toast.success('Joined game successfully!');
      } else if (gameData.players.includes(user.uid)) {
        setCurrentGame({ id: gameId, ...gameData, board: deserializeBoard(gameData.board) });
        toast.info('Rejoined existing game.');
      } else {
        toast.error('Game is full!');
      }
    } else {
      toast.error('Game not found!');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.info('Invite link copied to clipboard!');
  };

  const startGame = () => {
    if (currentGame && currentGame.players.length === 2 && setupComplete) {
      const startingPlayer = Math.random() < 0.5 ? 'blue' : 'red';
      setTurn(startingPlayer);
      updateGameState({
        isStarted: true,
        turn: startingPlayer
      });
      toast.success('Game started!');
    } else {
      toast.error('Cannot start game. Ensure both players have completed setup.');
    }
  };

  const checkGameOver = (board) => {
    for (let row of board) {
      for (let cell of row) {
        if (cell.isFlag && cell.character) {
          return true; // Game over if flag is captured
        }
      }
    }
    return false;
  };

  const handleMove = (from, to) => {
    if (currentGame.turn !== (currentGame.players[0] === user.uid ? 'blue' : 'red')) {
      toast.error("It's not your turn!");
      return;
    }

    const newBoard = [...board];
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const movingPiece = newBoard[fromRow][fromCol].character;
    const targetPiece = newBoard[toRow][toCol].character;

    if (targetPiece && movingPiece.type.split('-')[0] !== targetPiece.type.split('-')[0]) {
      // Duel logic
      const winner = determineWinner(movingPiece.type.split('-')[1], targetPiece.type.split('-')[1]);
      if (winner === movingPiece.type.split('-')[1]) {
        newBoard[toRow][toCol].character = movingPiece; // Move piece
        toast.success(`${movingPiece.type} defeats ${targetPiece.type}!`);
      } else {
        newBoard[toRow][toCol].character = targetPiece; // Target piece stays
        toast.error(`${targetPiece.type} defeats ${movingPiece.type}!`);
      }
      newBoard[fromRow][fromCol].character = null; // Clear original position
    } else {
      if (newBoard[toRow][toCol].isTrap) {
        newBoard[toRow][toCol].character = null; // Trap triggered, piece dies
        toast.warning('Trap triggered! Piece destroyed.');
      } else {
        newBoard[toRow][toCol].character = movingPiece; // Move piece
      }
      newBoard[fromRow][fromCol].character = null; // Clear original position
    }

    setBoard(newBoard);
    updateGameState({
      board: newBoard,
      turn: turn === 'blue' ? 'red' : 'blue'
    });

    if (checkGameOver(newBoard)) {
      toast.success(`Game Over! ${turn === 'blue' ? 'Blue' : 'Red'} wins!`);
      updateGameState({ isStarted: false });
    }
  };

  const handlePlaceFlag = (rowIndex, cellIndex) => {
    const newBoard = [...board];
    newBoard[rowIndex][cellIndex].isFlag = true;
    setBoard(newBoard);
    setPlacingFlag(false);
    checkSetupComplete();
    updateGameState({ board: newBoard });
  };

  const handlePlaceTrap = (rowIndex, cellIndex) => {
    const newBoard = [...board];
    newBoard[rowIndex][cellIndex].isTrap = true;
    setBoard(newBoard);
    setPlacingTrap(false);
    checkSetupComplete();
    updateGameState({ board: newBoard });
  };

  const checkSetupComplete = () => {
    const playerSetupComplete = board.some(row => row.some(cell => cell.isFlag)) &&
                                board.some(row => row.some(cell => cell.isTrap));
    if (playerSetupComplete) {
      setSetupComplete(true);
      updateGameState({ setupComplete: true });
    }
  };

  const handleCellClick = (rowIndex, cellIndex) => {
    if (!currentGame || !user) return;

    const playerColor = currentGame.players[0] === user.uid ? 'blue' : 'red';
    if (turn !== playerColor) {
      console.log("It's not your turn!");
      return;
    }

    if (placingFlag) {
      handlePlaceFlag(rowIndex, cellIndex);
    } else if (placingTrap) {
      handlePlaceTrap(rowIndex, cellIndex);
    } else if (selectedCell) {
      handleMove(selectedCell, [rowIndex, cellIndex]);
      setSelectedCell(null);
      setValidMoves([]);
    } else {
      setSelectedCell([rowIndex, cellIndex]);
      setValidMoves(getValidMoves(rowIndex, cellIndex, board));
    }
  };

  const determineWinner = (type1, type2) => {
    if (type1 === type2) return null; // Draw
    if ((type1 === 'rock' && type2 === 'scissors') ||
        (type1 === 'scissors' && type2 === 'paper') ||
        (type1 === 'paper' && type2 === 'rock')) {
      return type1;
    }
    return type2;
  };

  const showModal = (winner, movingPiece, targetPiece) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-button">&times;</span>
        <p>${winner ? `${winner} wins!` : 'It\'s a draw!'}</p>
        <p>${movingPiece.type} vs ${targetPiece.type}</p>
      </div>
    `;
    document.body.appendChild(modal);

    const closeButton = modal.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 3000);
  };

  const changeUserName = async (newName) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { name: newName });
      setUser({ ...user, displayName: newName });
    }
  };

  const boardToPosition = (board) => {
    const pos = {};
    const pieceTypes = { 'rock': 'R', 'paper': 'P', 'scissors': 'S' };
    board.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.character) {
          const [color, type] = cell.character.type.split('-');
          const square = `${'abcdefg'[colIndex]}${7 - rowIndex}`;
          pos[square] = `${color === 'blue' ? 'w' : 'b'}${pieceTypes[type]}`;
        }
      });
    });
    return pos;
  };

  useEffect(() => {
    setPosition(boardToPosition(board));
  }, [board]);

  const onPieceDrop = (sourceSquare, targetSquare, piece) => {
    const newBoard = [...board];
    const [fromCol, fromRow] = ['abcdefg'.indexOf(sourceSquare[0]), 7 - parseInt(sourceSquare[1])];
    const [toCol, toRow] = ['abcdefg'.indexOf(targetSquare[0]), 7 - parseInt(targetSquare[1])];

    const movingPiece = newBoard[fromRow][fromCol].character;
    const targetPiece = newBoard[toRow][toCol].character;

    if (targetPiece && movingPiece.type.split('-')[0] !== targetPiece.type.split('-')[0]) {
      // Duel logic
      const winner = determineWinner(movingPiece.type.split('-')[1], targetPiece.type.split('-')[1]);
      if (winner === movingPiece.type.split('-')[1]) {
        newBoard[toRow][toCol].character = movingPiece;
      } else {
        return false; // Invalid move, piece doesn't capture
      }
    } else {
      if (newBoard[toRow][toCol].isTrap) {
        newBoard[toRow][toCol].character = null;
      } else {
        newBoard[toRow][toCol].character = movingPiece;
      }
    }

    newBoard[fromRow][fromCol].character = null;
    setBoard(newBoard);
    updateGameState({
      board: newBoard,
      turn: turn === 'blue' ? 'red' : 'blue'
    });

    return true; // Move was valid
  };

  const updateGameState = (newState) => {
    if (currentGame) {
      const gameRef = ref(rtdb, `games/${currentGame.id}`);
      update(gameRef, {
        ...newState,
        board: serializeBoard(newState.board || currentGame.board)
      });
    }
  };

  return (
    <div className="App bg-kb-black text-kb-white min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      
      {/* Header with menu button */}
      <header className="flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold text-kb-live-red">RPS Revival</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-kb-white">
          {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </header>

      {/* Side menu */}
      <div className={`fixed top-0 right-0 h-full w-64 bg-kb-dark-grey p-4 transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out z-50`}>
        <Auth />
        <div className="flex flex-col gap-4 mt-4">
          {user ? (
            <>
              <button onClick={() => { createGame(true); setIsMenuOpen(false); }} className="bg-kb-live-red hover:bg-kb-grey text-kb-white font-bold py-2 px-4 rounded transition duration-300">
                Create Public Game
              </button>
              <button onClick={() => { createGame(false); setIsMenuOpen(false); }} className="bg-kb-grey hover:bg-kb-dark-grey text-kb-white font-bold py-2 px-4 rounded transition duration-300">
                Create Private Game
              </button>
            </>
          ) : (
            <button onClick={() => signInAnonymously(auth)} className="bg-kb-light-grey hover:bg-kb-dark-grey text-kb-black font-bold py-2 px-4 rounded transition duration-300">
              Play as Guest
            </button>
          )}
          <button onClick={() => setIsModalOpen(true)} className="bg-kb-dark-grey hover:bg-kb-grey text-kb-white font-bold py-2 px-4 rounded transition duration-300">
            Browse Games
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex justify-center items-center min-h-[calc(100vh-80px)]">
        {currentGame ? (
          <div className="game-container flex flex-col md:flex-row justify-center items-start w-full max-w-6xl mx-auto my-5">
            <div className="game-board md:w-2/3 mb-4 md:mb-0">
              {currentGame.players.length === 2 && (
                <Chessboard 
                  position={position}
                  onPieceDrop={onPieceDrop}
                  customPieces={customPieces}
                  boardOrientation={currentGame.players[0] === user.uid ? 'white' : 'black'}
                />
              )}
            </div>
            <div className="game-info md:w-1/3 md:pl-4">
              {currentGame.players.length < 2 ? (
                <div className="waiting-screen">
                  <h2 className="text-2xl font-bold">Waiting for second player...</h2>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">Game ID: {currentGame.id}</h2>
                  <h3 className="text-lg mt-2">Players:</h3>
                  <ul>
                    {currentGame.players.map((player, index) => (
                      <li key={index}>{player}</li>
                    ))}
                  </ul>
                  <h3 className="text-lg mt-2 flex items-center">
                    Turn: {turn === 'blue' ? <FaCircle className="text-blue-500 ml-2" /> : <FaCircle className="text-red-500 ml-2" />}
                  </h3>
                  {!currentGame.isStarted && (
                    <div className="mt-4">
                      <button onClick={() => setPlacingFlag(true)} className="bg-yellow-500 hover:bg-yellow-600 text-kb-white font-bold py-2 px-4 rounded mr-2" disabled={setupComplete}>
                        Place Flag
                      </button>
                      <button onClick={() => setPlacingTrap(true)} className="bg-red-500 hover:bg-red-600 text-kb-white font-bold py-2 px-4 rounded" disabled={setupComplete}>
                        Place Trap
                      </button>
                    </div>
                  )}
                  {!currentGame.isStarted && setupComplete && currentGame.players.length === 2 && (
                    <button onClick={startGame} className="bg-kb-live-red hover:bg-kb-dark-grey text-kb-white font-bold py-2 px-4 rounded mt-4">
                      Start Game
                    </button>
                  )}
                </>
              )}
              {currentGame.players.length === 2 && (
                <div className="chat-container mt-4">
                  <Chat gameId={currentGame.id} user={user} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to RPS Revival</h2>
            <p>Create a new game or join an existing one to start playing!</p>
          </div>
        )}
      </main>

      {/* Game browser modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-kb-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-kb-dark-grey p-6 rounded-lg shadow-lg w-full max-w-3xl text-kb-white">
            <h2 className="text-2xl font-bold mb-4">Game Browser</h2>
            <GameBrowser games={publicGames.concat(privateGames)} onJoinGame={joinGame} currentUser={user} />
            <button onClick={() => setIsModalOpen(false)} className="bg-kb-live-red hover:bg-kb-dark-grey text-kb-white font-bold py-2 px-4 rounded mt-4">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invite link */}
      {inviteLink && (
        <div className="fixed bottom-4 left-4 flex items-center bg-kb-grey p-2 rounded">
          <input type="text" value={inviteLink} readOnly className="bg-kb-dark-grey text-kb-white p-2 rounded mr-2" />
          <button onClick={copyInviteLink} className="bg-blue-500 hover:bg-blue-600 text-kb-white font-bold py-2 px-4 rounded">
            <FaCopy />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
