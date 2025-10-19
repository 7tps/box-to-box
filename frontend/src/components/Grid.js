import React from 'react';
import './Grid.css';
import Cell from './Cell';
import LabelEditor from './LabelEditor';

function Grid({ rowLabels, colLabels, setRowLabels, setColLabels, cells, updateCell }) {
  const updateRowLabel = (index, newLabel) => {
    const newLabels = [...rowLabels];
    newLabels[index] = newLabel;
    setRowLabels(newLabels);
  };

  const updateColLabel = (index, newLabel) => {
    const newLabels = [...colLabels];
    newLabels[index] = newLabel;
    setColLabels(newLabels);
  };

  return (
    <div className="grid-container">
      <div className="grid-wrapper">
        {/* Top-left corner (empty) */}
        <div className="corner-cell"></div>
        
        {/* Column labels */}
        {colLabels.map((label, index) => (
          <LabelEditor
            key={`col-${index}`}
            label={label}
            onUpdate={(newLabel) => updateColLabel(index, newLabel)}
            type="column"
          />
        ))}
        
        {/* Rows */}
        {rowLabels.map((rowLabel, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* Row label */}
            <LabelEditor
              label={rowLabel}
              onUpdate={(newLabel) => updateRowLabel(rowIndex, newLabel)}
              type="row"
            />
            
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

