import React from 'react';
import { Chessboard } from 'react-chessboard';
import { boardToPosition, customPieces } from '../utils/pieceUtils';

const GameBoard = ({ board, onSquareClick, onPieceDrop, playerColor, currentGame, user }) => {
  if (!board) return null;  // Add this check

  return (
    <Chessboard
      position={boardToPosition(board, currentGame, user)}
      onPieceDrop={onPieceDrop}
      onSquareClick={onSquareClick}
      customPieces={customPieces(board)}
      boardOrientation={playerColor === 'blue' ? 'white' : 'black'}
    />
  );
};

export default GameBoard;
