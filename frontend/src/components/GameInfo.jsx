import React from 'react';

const GameInfo = ({ gameStage, turn, playerColor, currentGame }) => {
  return (
    <div className="game-info">
      <h2>Game Info</h2>
      <p>Stage: {gameStage}</p>
      <p>Turn: {turn === currentGame?.players[0].id ? 'Blue' : 'Red'}</p>
      <p>Your Color: {playerColor}</p>
      {gameStage === 'setup' && <p>Place your pieces, including flag and trap</p>}
      {gameStage === 'ended' && <p>Game Over! Winner: {currentGame.winner}</p>}
    </div>
  );
};

export default GameInfo;
