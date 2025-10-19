import React from 'react';
import './Grid.css';
import Cell from './Cell';

function Grid({ rowLabels, colLabels, cells, updateCell }) {
  return (
    <div className="grid-container">
      <div className="grid-wrapper">
        {/* Top-left corner (empty) */}
        <div className="corner-cell"></div>
        
        {/* Column labels */}
        {colLabels.map((label, index) => (
          <div key={`col-${index}`} className="label-editor column static">
            <span className="label-text">{label}</span>
          </div>
        ))}
        
        {/* Rows */}
        {rowLabels.map((rowLabel, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* Row label */}
            <div className="label-editor row static">
              <span className="label-text">{rowLabel}</span>
            </div>
            
            {/* Cells in this row */}
            {colLabels.map((colLabel, colIndex) => (
              <Cell
                key={`cell-${rowIndex}-${colIndex}`}
                row={rowIndex}
                col={colIndex}
                cellData={cells[rowIndex][colIndex]}
                onUpdate={updateCell}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default Grid;

