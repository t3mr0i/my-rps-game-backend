export const initialBoard = () => {
  return Array(7).fill(null).map(() => Array(7).fill(null));
};

export const createPiece = (type, color) => ({ type, color });

export const isValidMove = (from, to) => {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

export const resolveCombat = (attacker, defender) => {
  if (attacker.type === defender.type) return 'draw';
  if (
    (attacker.type === 'rock' && defender.type === 'scissors') ||
    (attacker.type === 'scissors' && defender.type === 'paper') ||
    (attacker.type === 'paper' && defender.type === 'rock')
  ) {
    return 'win';
  }
  return 'lose';
};

export const checkWinCondition = (board) => {
  let blueFlag = false;
  let redFlag = false;

  for (let row of board) {
    for (let cell of row) {
      if (cell && cell.type === 'flag') {
        if (cell.color === 'blue') blueFlag = true;
        if (cell.color === 'red') redFlag = true;
      }
    }
  }

  if (!blueFlag) return 'red';
  if (!redFlag) return 'blue';
  return null;
};
