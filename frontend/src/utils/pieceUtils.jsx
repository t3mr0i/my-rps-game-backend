import React from 'react';

const pieceIcons = {
  'rock': '🪨',
  'paper': '📄',
  'scissors': '✂️',
  'flag': '🚩',
  'trap': '🕳️',
  'unknown': '❓'
};

export const CustomPiece = ({ piece, isCurrentPlayer }) => {
  const pieceStyle = {
    fontSize: '40px',
    fontWeight: 'bold',
    cursor: 'grab',
    backgroundColor: piece.color,
    borderRadius: '50%',
    padding: '5px',
    position: 'relative'
  };

  return (
    <div style={pieceStyle}>
      {isCurrentPlayer || piece.revealed ? pieceIcons[piece.type] : pieceIcons['unknown']}
    </div>
  );
};

export const customPieces = (currentPlayerColor) => ({
  bR: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'rock', color: 'blue' }} isCurrentPlayer={isCurrentPlayer} />,
  bP: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'paper', color: 'blue' }} isCurrentPlayer={isCurrentPlayer} />,
  bS: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'scissors', color: 'blue' }} isCurrentPlayer={isCurrentPlayer} />,
  bF: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'flag', color: 'blue' }} isCurrentPlayer={isCurrentPlayer} />,
  bT: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'trap', color: 'blue' }} isCurrentPlayer={isCurrentPlayer} />,
  rR: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'rock', color: 'red' }} isCurrentPlayer={isCurrentPlayer} />,
  rP: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'paper', color: 'red' }} isCurrentPlayer={isCurrentPlayer} />,
  rS: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'scissors', color: 'red' }} isCurrentPlayer={isCurrentPlayer} />,
  rF: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'flag', color: 'red' }} isCurrentPlayer={isCurrentPlayer} />,
  rT: ({ isCurrentPlayer }) => <CustomPiece piece={{ type: 'trap', color: 'red' }} isCurrentPlayer={isCurrentPlayer} />,
});

export const boardToPosition = (board, currentPlayerColor) => {
  const position = {};
  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece) {
        const square = `${'abcdefg'[colIndex]}${7 - rowIndex}`;
        const pieceCode = `${piece.color === 'blue' ? 'b' : 'r'}${piece.type[0].toUpperCase()}`;
        position[square] = pieceCode;
      }
    });
  });
  return position;
};
