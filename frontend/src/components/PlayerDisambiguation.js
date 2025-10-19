import React from 'react';
import './PlayerDisambiguation.css';

function PlayerDisambiguation({ candidates, onSelect, onCancel }) {
  return (
    <div className="disambiguation-overlay">
      <div className="disambiguation-modal">
        <div className="modal-header">
          <h3>Multiple players found</h3>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <p className="modal-subtitle">Please select the player you meant:</p>
        <div className="candidates-list">
          {candidates.map((player, index) => (
            <button
              key={index}
              className="candidate-button"
              onClick={() => onSelect(player)}
            >
              <div className="candidate-name">{player.label}</div>
              <div className="candidate-details">
                {player.dob && <span>Born: {player.dob}</span>}
                {player.placeOfBirth && <span> • {player.placeOfBirth}</span>}
              </div>
              {player.description && (
                <div className="candidate-description">{player.description}</div>
              )}
            </button>
          ))}
        </div>
        <button className="cancel-button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default PlayerDisambiguation;

