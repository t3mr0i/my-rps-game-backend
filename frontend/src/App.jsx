import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import './App.css';
import Auth from './Auth';

function App() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'games'), (snapshot) => {
      const gamesList = snapshot.docs.map(doc => doc.data());
      setGames(gamesList);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-4xl font-bold">RPS on ICQ</h1>
        <Auth />
        <ul className="mt-4">
          {games.map(game => (
            <li key={game.id} className="mt-2">
              {game.id} - {game.isStarted ? 'Started' : 'Not Started'}
            </li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;