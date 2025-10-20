import React from 'react';
import './Grid.css';
import Cell from './Cell';

function Grid({ rowLabels, colLabels, cells, updateCell, boardData }) {
  // Get cell data for player counts
  const getCellData = (row, col) => {
    const cellKey = `${row}-${col}`;
    if (boardData && boardData.cells && boardData.cells[cellKey]) {
      const cellData = cells[row][col];
      const filledCount = cellData?.players ? cellData.players.length : 0;
      return {
        totalPlayers: boardData.cells[cellKey].count || 0,
        filledCount: filledCount
      };
    }
    return { totalPlayers: 0, filledCount: 0 };
  };

  // Get badge/icon for label
  const getBadgeElement = (label, type) => {
    // For now, use text badges - can be replaced with actual images later
    return (
      <div className={`badge-container ${type}`}>
        <div className="badge-icon">{label.slice(0, 3).toUpperCase()}</div>
      </div>
    );
  };

  return (
    <div className="grid-container">
      <div className="grid-wrapper">
        {/* Top-left corner (empty) */}
        <div className="corner-cell"></div>
        
        {/* Column labels with badges */}
        {colLabels.map((label, index) => (
          <div key={`col-${index}`} className="label-badge column">
            {getBadgeElement(label, 'column')}
            <div className="label-name">{label}</div>
          </div>
        ))}
        
        {/* Rows */}
        {rowLabels.map((rowLabel, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* Row label with badge */}
            <div className="label-badge row">
              {getBadgeElement(rowLabel, 'row')}
              <div className="label-name">{rowLabel}</div>
            </div>
            
            {/* Cells in this row */}
            {colLabels.map((colLabel, colIndex) => {
              const cellStats = getCellData(rowIndex, colIndex);
              return (
                <Cell
                  key={`cell-${rowIndex}-${colIndex}`}
                  row={rowIndex}
                  col={colIndex}
                  cellData={cells[rowIndex][colIndex]}
                  onUpdate={updateCell}
                  totalPlayers={cellStats.totalPlayers}
                  filledCount={cellStats.filledCount}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default Grid;

