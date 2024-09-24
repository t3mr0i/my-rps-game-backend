import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './App.css';
import Auth from './Auth';
import GameBoard from './GameBoard';

function App() {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'games'), (snapshot) => {
      const gamesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGames(gamesList);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const createGame = async () => {
    if (user) {
      const game = {
        isStarted: false,
        players: [user.uid],
        board: Array(8).fill(Array(8).fill({ character: null, isTrap: false, isFlag: false }))
      };
      const gameRef = await addDoc(collection(db, 'games'), game);
      setCurrentGame({ id: gameRef.id, ...game });
    }
  };

  const joinGame = async (gameId) => {
    if (user) {
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        players: arrayUnion(user.uid)
      });
      const gameSnap = await getDoc(gameRef);
      setCurrentGame({ id: gameSnap.id, ...gameSnap.data() });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-4xl font-bold">RPS on ICQ</h1>
        <Auth />
        {user && (
          <button onClick={createGame} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4">
            Create Game
          </button>
        )}
        <ul className="mt-4">
          {games.map(game => (
            <li key={game.id} className="mt-2">
              {game.id} - {game.isStarted ? 'Started' : 'Not Started'}
              {user && !game.players.includes(user.uid) && (
                <button onClick={() => joinGame(game.id)} className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded ml-2">
                  Join Game
                </button>
              )}
            </li>
          ))}
        </ul>
        {currentGame && (
          <div className="mt-4">
            <h2 className="text-2xl font-bold">Game ID: {currentGame.id}</h2>
            <h3 className="text-xl">Players:</h3>
            <ul>
              {currentGame.players.map(player => (
                <li key={player}>{player}</li>
              ))}
            </ul>
            <GameBoard board={currentGame.board} />
          </div>
        )}
      </header>
    </div>
  );
}

export default App;