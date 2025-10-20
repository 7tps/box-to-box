import React from 'react';
import './Cell.css';

function Cell({ row, col, cellData, onUpdate, totalPlayers = 0, filledCount = 0 }) {
  const handleClear = () => {
    onUpdate(row, col, null);
  };

  // cellData now contains an array of players
  const players = cellData?.players || [];
  const actualFilledCount = players.length;
  
  const progressPercentage = totalPlayers > 0 ? (actualFilledCount / totalPlayers) * 100 : 0;
  
  // Show the most recent player's name
  const displayName = players.length > 0 ? players[players.length - 1].playerName : '';

  if (players.length > 0) {
    return (
      <div className="cell filled" onClick={handleClear}>
        <div className="cell-content">
          <div className="jersey-container">
            <div className="jersey">
              <div className="jersey-number">{actualFilledCount}</div>
            </div>
          </div>
          <div className="player-name-display">{displayName}</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ height: `${progressPercentage}%` }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="cell empty">
      <div className="cell-content">
        <div className="empty-placeholder">
          <span className="plus-icon">+</span>
          <span className="find-text">FIND PLAYER</span>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ height: '0%' }}></div>
      </div>
    </div>
  );
}

export default Cell;

