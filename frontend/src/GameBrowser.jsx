import React, { useMemo } from 'react';
import { useTable, useSortBy, useFilters, useGlobalFilter } from 'react-table';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

const GameBrowser = ({ games, onJoinGame, currentUser }) => {
  const columns = useMemo(
    () => [
      {
        Header: 'Game ID',
        accessor: 'id',
      },
      {
        Header: 'Status',
        accessor: 'isStarted',
        Cell: ({ value }) => (value ? 'Started' : 'Not Started'),
      },
      {
        Header: 'Players',
        accessor: 'players',
        Cell: ({ value }) => Array.isArray(value) ? `${value.length}/2` : 'N/A',
      },
      {
        Header: 'Actions',
        Cell: ({ row }) => {
          const game = row.original;
          const canJoin = currentUser && 
                          game && 
                          Array.isArray(game.players) && 
                          !game.players.includes(currentUser.uid) && 
                          !game.isStarted;
          
          return canJoin ? (
            <button 
              onClick={() => onJoinGame(game.id)} 
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
            >
              Join Game
            </button>
          ) : null;
        },
      },
    ],
    [currentUser, onJoinGame]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data: games,
    },
    useFilters,
    useGlobalFilter,
    useSortBy
  );

  const { globalFilter } = state;

  return (
    <div>
      <input
        value={globalFilter || ''}
        onChange={e => setGlobalFilter(e.target.value)}
        placeholder="Search games..."
        className="mb-4 p-2 border rounded bg-kb-grey text-kb-white"
      />
      <table {...getTableProps()} className="w-full">
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  className="p-2 text-left"
                  key={column.id}
                >
                  {column.render('Header')}
                  <span>
                    {column.isSorted ? (column.isSortedDesc ? <FaSortDown /> : <FaSortUp />) : <FaSort />}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()} className="p-2" key={cell.column.id}>
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default GameBrowser;
