import React from 'react';
import { Chessboard } from 'react-chessboard';
import { boardToPosition, customPieces } from '../utils/pieceUtils';

const GameBoard = ({ board, onSquareClick, onPieceDrop, playerColor }) => {
  return (
    <Chessboard
      position={boardToPosition(board, playerColor)}
      onPieceDrop={onPieceDrop}
      onSquareClick={onSquareClick}
      customPieces={customPieces(playerColor)}
      boardOrientation={playerColor === 'blue' ? 'white' : 'black'}
    />
  );
};

export default GameBoard;
