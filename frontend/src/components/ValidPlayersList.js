import React, { useState } from 'react';
import './ValidPlayersList.css';

function ValidPlayersList({ boardData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterText, setFilterText] = useState('');

  if (!boardData || !boardData.allPlayers) {
    return null;
  }

  const filteredPlayers = filterText
    ? boardData.allPlayers.filter(p => 
        p.label.toLowerCase().includes(filterText.toLowerCase())
      )
    : boardData.allPlayers;

  const getCellLabel = (cellKey) => {
    const [row, col] = cellKey.split('-').map(Number);
    const cellData = boardData.cells[cellKey];
    return `(${row + 1}, ${col + 1}) ${cellData.rowEntity?.label || '?'} × ${cellData.colEntity?.label || '?'}`;
  };

  return (
    <div className="valid-players-container">
      <button 
        className="valid-players-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▼' : '▶'} Show Valid Players ({boardData.playerCount})
      </button>
      
      {isExpanded && (
        <div className="valid-players-content">
          <div className="filter-section">
            <input
              type="text"
              placeholder="Filter players..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="filter-input"
            />
            <span className="filter-count">
              Showing {filteredPlayers.length} of {boardData.playerCount}
            </span>
          </div>

          <div className="players-list">
            {filteredPlayers.slice(0, 100).map((player, index) => (
              <div key={index} className="player-item">
                <div className="player-header">
                  <span className="player-name">{player.label}</span>
                  <span className="player-qid">{player.qid}</span>
                </div>
                <div className="player-cells">
                  Valid for: {player.validCells.map(cellKey => (
                    <span key={cellKey} className="cell-badge">
                      {getCellLabel(cellKey)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {filteredPlayers.length > 100 && (
              <div className="more-players">
                ... and {filteredPlayers.length - 100} more players
              </div>
            )}
          </div>

          <div className="debug-section">
            <h4>📊 Cell Breakdown:</h4>
            {Object.entries(boardData.cells).map(([cellKey, cellData]) => (
              <div key={cellKey} className="cell-debug">
                <strong>{getCellLabel(cellKey)}:</strong> {cellData.count} players
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ValidPlayersList;

