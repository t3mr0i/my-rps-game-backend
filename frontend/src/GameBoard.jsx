import React from 'react';
import { FaUser, FaGem, FaToiletPaper, FaFlag, FaTimes, FaArrowRight, FaArrowLeft, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { GiScissors } from 'react-icons/gi';

const GameBoard = ({ board, onCellClick, placingFlag, placingTrap, selectedCell, validMoves }) => {
  console.log('Board data:', board);

  if (!Array.isArray(board) || !board.every(row => Array.isArray(row))) {
    return <div>Error: Invalid board data</div>;
  }

  const getCellClass = (rowIndex, cellIndex) => {
    if (selectedCell && selectedCell[0] === rowIndex && selectedCell[1] === cellIndex) {
      return 'bg-yellow-300';
    }
    return (rowIndex + cellIndex) % 2 === 0 ? 'bg-gray-600' : 'bg-gray-800';
  };

  const getIcon = (type) => {
    const [color, item] = type.split('-');
    const colorClass = color === 'blue' ? 'text-blue-500' : 'text-red-500';

    switch (item) {
      case 'rock':
        return <FaGem className={`w-12 h-12 ${colorClass}`} />;
      case 'paper':
        return <FaToiletPaper className={`w-12 h-12 ${colorClass}`} />;
      case 'scissors':
        return <GiScissors className={`w-12 h-12 ${colorClass}`} />;
      default:
        return <FaUser className={`w-12 h-12 ${colorClass}`} />;
    }
  };

  const isValidMove = (rowIndex, cellIndex) => {
    return validMoves && validMoves.some(([r, c]) => r === rowIndex && c === cellIndex);
  };

  const getArrowIcon = (rowIndex, cellIndex) => {
    if (!selectedCell) return null;
    const [selectedRow, selectedCol] = selectedCell;
    if (rowIndex === selectedRow && cellIndex === selectedCol + 1) return <FaArrowRight className="text-green-500" />;
    if (rowIndex === selectedRow && cellIndex === selectedCol - 1) return <FaArrowLeft className="text-green-500" />;
    if (rowIndex === selectedRow + 1 && cellIndex === selectedCol) return <FaArrowDown className="text-green-500" />;
    if (rowIndex === selectedRow - 1 && cellIndex === selectedCol) return <FaArrowUp className="text-green-500" />;
    return null;
  };

  return (
    <div className="grid grid-cols-7 gap-1 p-4 bg-gray-800 rounded-lg shadow-lg">
      {board.map((row, rowIndex) => (
        row.map((cell, cellIndex) => (
          <div
            key={`${rowIndex}-${cellIndex}`}
            className={`w-16 h-16 border border-gray-500 flex items-center justify-center ${getCellClass(rowIndex, cellIndex)} ${placingFlag || placingTrap ? 'cursor-pointer' : ''}`}
            onClick={() => {
              console.log(`Cell clicked in GameBoard: (${rowIndex}, ${cellIndex})`);
              onCellClick(rowIndex, cellIndex);
            }}
          >
            {cell.character ? getIcon(cell.character.type) : ''}
            {cell.isFlag && <FaFlag className="w-12 h-12 text-yellow-500" />}
            {cell.isTrap && <FaTimes className="w-12 h-12 text-red-500" />}
            {isValidMove(rowIndex, cellIndex) && getArrowIcon(rowIndex, cellIndex)}
          </div>
        ))
      ))}
    </div>
  );
};

export default GameBoard;