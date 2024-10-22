import React, { useState, useEffect } from 'react';
import { db, auth, rtdb } from './firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { ref, onValue, set, push, get, update } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Auth from './Auth';
import { FaUserCircle, FaCircle, FaCopy, FaBars, FaTimes } from 'react-icons/fa';
import GameBrowser from './GameBrowser';
import Chat from './Chat';
import GameBoard from './components/GameBoard';
import GameInfo from './components/GameInfo';
import { initialBoard, createPiece, isValidMove, resolveCombat, checkWinCondition } from './utils/gameLogic';
import { boardToPosition, customPieces } from './utils/pieceUtils';
import { useLocation } from 'react-router-dom';

const App = () => {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [board, setBoard] = useState(initialBoard());
  const [gameStage, setGameStage] = useState('setup'); // 'setup', 'play', 'ended'
  const [setupPhase, setSetupPhase] = useState('placing'); // 'placing', 'flag', 'trap'
  const [placedPieces, setPlacedPieces] = useState(0);
  const [turn, setTurn] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [publicGames, setPublicGames] = useState([]);
  const [privateGames, setPrivateGames] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

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
          setCurrentGame(data);
          setBoard(data.board || initialBoard());  // Ensure board is always set
          setGameStage(data.gameStage);
          setTurn(data.turn);
        }
      });
      return () => unsubscribe();
    }
  }, [currentGame?.id]);

  useEffect(() => {
    const handleGameLink = async () => {
      const path = location.pathname;
      const match = path.match(/\/game\/(.+)/);
      if (match && match[1]) {
        const gameId = match[1];
        await joinGame(gameId);
      }
    };

    handleGameLink();
  }, [location, user]);

  const createGame = async (isPublic = true) => {
    if (user) {
      const newBoard = Array(7).fill(null).map(() => Array(7).fill(null));
      const newGameRef = push(ref(rtdb, 'games'));
      const newGame = {
        id: newGameRef.key,
        players: [{ id: user.uid, name: user.displayName || 'Player 1' }],
        board: newBoard,
        gameStage: 'setup',
        setupPhase: 'placing',
        turn: user.uid,
        isPublic: isPublic
      };
      await set(newGameRef, newGame);
      setCurrentGame(newGame);
      setBoard(newBoard);
      setPlayerColor('blue');
      setInviteLink(`${window.location.origin}/game/${newGameRef.key}`);
      toast.success('Game created successfully!');
    } else {
      toast.error('Please sign in to create a game.');
    }
  };

  const joinGame = async (gameId) => {
    if (user) {
      const gameRef = ref(rtdb, `games/${gameId}`);
      const gameSnapshot = await get(gameRef);
      if (gameSnapshot.exists()) {
        const gameData = gameSnapshot.val();
        if (gameData.players.length < 2) {
          const updatedPlayers = [...gameData.players, { id: user.uid, name: user.displayName || 'Player 2' }];
          await update(gameRef, { players: updatedPlayers });
          setCurrentGame({ ...gameData, id: gameId, players: updatedPlayers });
          setPlayerColor(gameData.players[0].id === user.uid ? 'blue' : 'red');
          setBoard(gameData.board || initialBoard());
          setGameStage(gameData.gameStage || 'setup');
          setTurn(gameData.turn || gameData.players[0].id);
          toast.success('Joined game successfully!');
        } else {
          toast.error('Game is full.');
        }
      } else {
        toast.error('Game not found.');
      }
    } else {
      toast.error('Please sign in to join a game.');
    }
  };

  const handleSetupPlacement = (square) => {
    if (gameStage !== 'setup' || turn !== user.uid) return;

    const [col, row] = square.split('');
    const rowIndex = 7 - parseInt(row);
    const colIndex = 'abcdefg'.indexOf(col);

    // Check if the clicked square is in the player's starting area
    const isValidStartingArea = playerColor === 'blue' ? rowIndex >= 5 : rowIndex <= 1;

    if (!isValidStartingArea) {
      toast.error('You can only place pieces in your starting area.');
      return;
    }

    let newBoard = [...board];
    if (!newBoard[rowIndex]) {
      newBoard[rowIndex] = Array(7).fill(null);
    }

    if (setupPhase === 'placing') {
      if (placedPieces < 12) {
        const pieceType = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
        newBoard[rowIndex][colIndex] = createPiece(pieceType, playerColor);
        setPlacedPieces(placedPieces + 1);
        if (placedPieces === 11) {
          setSetupPhase('flag');
        }
      }
    } else if (setupPhase === 'flag') {
      newBoard[rowIndex][colIndex] = createPiece('flag', playerColor);
      setSetupPhase('trap');
    } else if (setupPhase === 'trap') {
      newBoard[rowIndex][colIndex] = createPiece('trap', playerColor);
      finishSetup();
    }

    setBoard(newBoard);
    updateGameState({ board: newBoard });
  };

  const finishSetup = () => {
    updateGameState({
      [`${playerColor}Ready`]: true,
      turn: currentGame.players.find(p => p.id !== user.uid).id
    });
    toast.success('Setup complete. Waiting for opponent.');
  };

  const handleMove = (from, to) => {
    if (gameStage !== 'play' || turn !== user.uid) return;

    const [fromCol, fromRow] = from.split('');
    const [toCol, toRow] = to.split('');
    const fromIndex = [7 - parseInt(fromRow), 'abcdefg'.indexOf(fromCol)];
    const toIndex = [7 - parseInt(toRow), 'abcdefg'.indexOf(toCol)];

    if (!isValidMove(fromIndex, toIndex)) {
      toast.error('Invalid move');
      return;
    }

    const newBoard = [...board];
    const movingPiece = newBoard[fromIndex[0]][fromIndex[1]];
    const targetPiece = newBoard[toIndex[0]][toIndex[1]];

    if (targetPiece) {
      if (targetPiece.type === 'flag') {
        endGame(playerColor);
        return;
      }
      if (targetPiece.type === 'trap') {
        newBoard[fromIndex[0]][fromIndex[1]] = null;
        newBoard[toIndex[0]][toIndex[1]] = null;
      } else {
        const result = resolveCombat(movingPiece, targetPiece);
        if (result === 'win') {
          newBoard[toIndex[0]][toIndex[1]] = movingPiece;
          newBoard[fromIndex[0]][fromIndex[1]] = null;
        } else if (result === 'lose') {
          newBoard[fromIndex[0]][fromIndex[1]] = null;
        }
      }
    } else {
      newBoard[toIndex[0]][toIndex[1]] = movingPiece;
      newBoard[fromIndex[0]][fromIndex[1]] = null;
    }

    setBoard(newBoard);
    updateGameState({
      board: newBoard,
      turn: currentGame.players.find(p => p.id !== turn).id
    });

    const winner = checkWinCondition(newBoard);
    if (winner) {
      endGame(winner);
    }
  };

  const updateGameState = (newState) => {
    if (currentGame) {
      const gameRef = ref(rtdb, `games/${currentGame.id}`);
      update(gameRef, newState);
    }
  };

  const startGame = () => {
    if (currentGame.blueReady && currentGame.redReady) {
      const startingPlayer = Math.random() < 0.5 ? currentGame.players[0].id : currentGame.players[1].id;
      updateGameState({
        gameStage: 'play',
        turn: startingPlayer
      });
      setGameStage('play');
      setTurn(startingPlayer);
      toast.success('Game started!');
    }
  };

  const endGame = (winner) => {
    updateGameState({
      gameStage: 'ended',
      winner: winner
    });
    setGameStage('ended');
    toast.success(`Game Over! ${winner === playerColor ? 'You win!' : 'You lose!'}`);
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
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        {currentGame ? (
          <div className="game-container flex flex-col w-full max-w-6xl mx-auto my-5">
            <div className="game-info mb-4">
              <GameInfo
                gameStage={gameStage}
                turn={turn}
                playerColor={playerColor}
                currentGame={currentGame}
              />
            </div>
            <div className="flex flex-col md:flex-row justify-center items-start">
              <div className="game-board w-full md:w-2/3 mb-4 md:mb-0">
                <GameBoard
                  board={board}
                  onSquareClick={handleSetupPlacement}
                  onPieceDrop={handleMove}
                  playerColor={playerColor}
                  currentGame={currentGame}
                  user={user}
                />
              </div>
              {currentGame.players.length === 2 && (
                <div className="chat-container w-full md:w-1/3 md:pl-4">
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
            <button onClick={() => setIsModalOpen(false)} className="bg-kb-live-red hover:bg-kb-dark-grey text-kb-white font-bold py-2 px-4 rounded mt-4 transition duration-300">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invite link */}
      {inviteLink && (
        <div className="fixed bottom-4 left-4 flex items-center bg-kb-grey p-2 rounded">
          <input type="text" value={inviteLink} readOnly className="bg-kb-dark-grey text-kb-white p-2 rounded mr-2" />
          <button onClick={() => {navigator.clipboard.writeText(inviteLink); toast.info('Invite link copied to clipboard!');}} className="bg-blue-500 hover:bg-blue-600 text-kb-white font-bold py-2 px-4 rounded">
            <FaCopy />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
