import React, { useState, useEffect } from 'react';
import { db, auth, rtdb } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { ref, onValue, set } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Auth from './Auth';
import { Chessboard } from 'react-chessboard';
import { FaUserCircle, FaCircle, FaCopy } from 'react-icons/fa';
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

  const createGame = async (isPublic = true) => {
    if (user) {
      const newGame = {
        id: Math.random().toString(36).substr(2, 9),
        board: serializeBoard(board),
        players: [user.uid],
        isStarted: false,
        isPublic: isPublic
      };
      const docRef = await addDoc(collection(db, 'games'), newGame);
      setCurrentGame({ ...newGame, id: docRef.id });
      setInviteLink(`${window.location.origin}/game/${docRef.id}`);
      toast.success('Game created successfully!');
    } else {
      toast.error('Please sign in to create a game.');
    }
  };

  const joinGame = async (gameId) => {
    if (!user) {
      await signInAnonymously(auth);
    }
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      players: arrayUnion(user.uid)
    });
    const gameSnap = await getDoc(gameRef);
    const gameData = gameSnap.data();
    gameData.board = deserializeBoard(gameData.board);
    setCurrentGame({ id: gameSnap.id, ...gameData });
    toast.success('Joined game successfully!');
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.info('Invite link copied to clipboard!');
  };

  const startGame = () => {
    if (currentGame && currentGame.players.length === 2) {
      const startingPlayer = Math.random() < 0.5 ? 'blue' : 'red';
      setTurn(startingPlayer);
      setCurrentGame(prevGame => ({
        ...prevGame,
        isStarted: true
      }));
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
      } else {
        newBoard[toRow][toCol].character = targetPiece; // Target piece stays
      }
      newBoard[fromRow][fromCol].character = null; // Clear original position
      showModal(winner, movingPiece, targetPiece);
    } else {
      if (newBoard[toRow][toCol].isTrap) {
        newBoard[toRow][toCol].character = null; // Trap triggered, piece dies
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
  };

  const handlePlaceFlag = (rowIndex, cellIndex) => {
    const newBoard = [...board];
    newBoard[rowIndex][cellIndex].isFlag = true;
    setBoard(newBoard);
    setPlacingFlag(false);
  };

  const handlePlaceTrap = (rowIndex, cellIndex) => {
    const newBoard = [...board];
    newBoard[rowIndex][cellIndex].isTrap = true;
    setBoard(newBoard);
    setPlacingTrap(false);
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
      set(gameRef, {
        ...currentGame,
        ...newState,
        board: serializeBoard(newState.board || currentGame.board)
      });
    }
  };

  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <header className="App-header">
        <h1 className="text-4xl font-bold">RPS on ICQ</h1>
        <Auth />
        {user ? (
          <>
            <button onClick={() => createGame(true)} className="bg-kb-live-red hover:bg-kb-dark-grey font-bold py-2 px-4 rounded mt-4">
              Create Public Game
            </button>
            <button onClick={() => createGame(false)} className="bg-kb-grey hover:bg-kb-dark-grey  font-bold py-2 px-4 rounded mt-4">
              Create Private Game
            </button>
          </>
        ) : (
          <button onClick={() => signInAnonymously(auth)} className="bg-kb-light-grey hover:bg-kb-dark-grey text-kb-black font-bold py-2 px-4 rounded mt-4">
            Play as Guest
          </button>
        )}
        <button onClick={() => setIsModalOpen(true)} className="bg-kb-dark-grey hover:bg-kb-grey  font-bold py-2 px-4 rounded mt-4">
          Browse Games
        </button>
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg w-3/4 max-w-3xl text-white">
              <h2 className="text-2xl font-bold mb-4">Game Browser</h2>
              <h3 className="text-xl font-bold mt-4">Public Games</h3>
              <GameBrowser games={publicGames} onJoinGame={joinGame} currentUser={user} />
              <h3 className="text-xl font-bold mt-4">Private Games</h3>
              <GameBrowser games={privateGames} onJoinGame={joinGame} currentUser={user} />
              <button onClick={() => setIsModalOpen(false)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-4">
                Close
              </button>
            </div>
          </div>
        )}
        {currentGame && (
          <div className="game-container">
            <div className="game-info">
              {currentGame.players.length < 2 ? (
                <div className="waiting-screen">
                  <h2 className="text-2xl font-bold">Waiting for second player...</h2>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">Game ID: {currentGame.id}</h2>
                  <h3 className="text-xl">Players:</h3>
                  <ul>
                    {currentGame.players.map((player, index) => (
                      <li key={index}>{player}</li>
                    ))}
                  </ul>
                  <h3 className="text-xl flex items-center">
                    Turn: {turn === 'blue' ? <FaCircle className="text-blue-500" /> : <FaCircle className="text-red-500" />}
                  </h3>
                  {!currentGame.isStarted && (
                    <button onClick={startGame} className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mt-4">
                      Start Game
                    </button>
                  )}
                  <div className="flex items-center mt-4">
                    <FaUserCircle className={`text-4xl ${currentGame.players[0] === user.uid ? 'text-blue-500' : 'text-red-500'}`} />
                    <span className="ml-2 text-xl">{currentGame.players[0] === user.uid ? 'You are Blue' : 'You are Red'}</span>
                  </div>
                  <button onClick={() => setPlacingFlag(true)} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mt-4">
                    Place Flag
                  </button>
                  <button onClick={() => setPlacingTrap(true)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-4">
                    Place Trap
                  </button>
                  <div className="mt-4">
                    <input
                      type="text"
                      placeholder="Enter new name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-gray-700 text-white p-2 rounded"
                    />
                    <button onClick={() => changeUserName(newName)} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2">
                      Change Name
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="game-board">
              {currentGame.players.length === 2 && (
                <Chessboard 
                  position={position}
                  onPieceDrop={onPieceDrop}
                  customPieces={customPieces}
                  boardOrientation={currentGame.players[0] === user.uid ? 'white' : 'black'}
                />
              )}
            </div>
            {currentGame.players.length === 2 && (
              <Chat gameId={currentGame.id} user={user} />
            )}
            {inviteLink && (
              <div className="mt-4 flex items-center">
                <input type="text" value={inviteLink} readOnly className="bg-gray-700 text-white p-2 rounded" />
                <button onClick={copyInviteLink} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2">
                  <FaCopy />
                </button>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
};

export default App;
