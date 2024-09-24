import React from 'react';

const GameBoard = ({ board }) => {
  return (
    <div className="grid grid-cols-8 gap-1">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex">
          {row.map((cell, cellIndex) => (
            <div key={cellIndex} className="w-8 h-8 border border-gray-500 flex items-center justify-center">
              {cell.character ? cell.character.type : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default GameBoard;