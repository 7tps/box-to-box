import React from 'react';
import './Cell.css';

function Cell({ row, col, cellData, onUpdate }) {
  const handleClear = () => {
    onUpdate(row, col, null);
  };

  if (cellData) {
    return (
      <div className={`cell filled ${cellData.valid ? 'valid' : 'invalid'}`}>
        <div className="cell-header">
          <span className="status-icon">
            {cellData.valid ? '✅' : '❌'}
          </span>
          <button className="clear-button" onClick={handleClear}>×</button>
        </div>
        <div className="player-name">{cellData.playerName}</div>
        <div className="match-details">
          {cellData.rowMatchDetails && (
            <div className="match-info">
              <strong>Row:</strong> {cellData.rowMatchDetails.entity}
            </div>
          )}
          {cellData.colMatchDetails && (
            <div className="match-info">
              <strong>Col:</strong> {cellData.colMatchDetails.entity}
            </div>
          )}
          {!cellData.valid && (
            <div className="no-match">Not a valid match</div>
          )}
        </div>
        {cellData.playerQid && (
          <a 
            href={`https://www.wikidata.org/wiki/${cellData.playerQid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wikidata-link"
          >
            View on Wikidata
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="cell empty">
      <div className="cell-placeholder">
        Empty
      </div>
    </div>
  );
}

export default Cell;

