import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './PlayerInput.css';

// Simple string similarity function
function stringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = (s1, s2) => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };
  
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

function PlayerInput({ boardData, cells, updateCell, isPrecomputing }) {
  const [playerName, setPlayerName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [usedPlayers, setUsedPlayers] = useState(new Set());
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);
  
  // Track used players from cells
  useEffect(() => {
    const used = new Set();
    cells.forEach(row => {
      row.forEach(cell => {
        if (cell && cell.playerName) {
          used.add(cell.playerName.toLowerCase());
        }
      });
    });
    setUsedPlayers(used);
  }, [cells]);

  // Autocomplete with debounce
  useEffect(() => {
    if (playerName.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await axios.get('/api/autocomplete', {
          params: { query: playerName, limit: 10 }
        });
        setSuggestions(response.data);
        setShowSuggestions(response.data.length > 0);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [playerName]);

  const handleSubmit = async (e, selectedPlayer = null) => {
    e.preventDefault();
    
    const nameToCheck = selectedPlayer ? selectedPlayer.label : playerName.trim();
    if (!nameToCheck) return;

    setError(null);
    setMessage(null);
    setShowSuggestions(false);

    if (!boardData || !boardData.allPlayers) {
      setError('Board is still loading. Please wait...');
      return;
    }

    // Find which cell(s) this player is valid for
    const normalizedName = nameToCheck.toLowerCase();
    console.log('🔍 Searching for player:', nameToCheck);
    console.log('📋 Total players in board:', boardData.allPlayers.length);
    
    // Debug: show sample of players
    const samplePlayers = boardData.allPlayers.slice(0, 10).map(p => p?.label || 'NO LABEL');
    console.log('📋 Sample players (first 10):', samplePlayers);
    
    // Search with Messi specifically
    const messiMatches = boardData.allPlayers.filter(p => 
      p?.label?.toLowerCase().includes('messi')
    );
    console.log('🔍 Players with "messi" in name:', messiMatches.map(p => p.label));
    
    const matchingPlayer = boardData.allPlayers.find(p => 
      p?.label?.toLowerCase() === normalizedName ||
      p?.label?.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(p?.label?.toLowerCase())
    );

    console.log('✅ Matching player found:', matchingPlayer);

    if (!matchingPlayer) {
      console.log('❌ No match found. Trying partial matches...');
      // Show similar names for debugging
      const similarPlayers = boardData.allPlayers
        .filter(p => {
          const sim = stringSimilarity(normalizedName, p.label.toLowerCase());
          return sim > 0.5;
        })
        .slice(0, 5);
      
      console.log('Similar players:', similarPlayers.map(p => p.label));
      
      setError(`❌ "${nameToCheck}" is not a valid answer for any cell on this board.${similarPlayers.length > 0 ? ' Did you mean: ' + similarPlayers.map(p => p.label).join(', ') + '?' : ''}`);
      return;
    }

    // Check if cells are available
    const availableCells = matchingPlayer.validCells.filter(cellKey => {
      const [row, col] = cellKey.split('-').map(Number);
      return !cells[row][col]; // Cell is empty
    });

    if (availableCells.length === 0) {
      setError(`"${matchingPlayer.label}" is valid, but all matching cells are already filled!`);
      return;
    }

    // Auto-fill into the first available cell
    const cellKey = availableCells[0];
    const [row, col] = cellKey.split('-').map(Number);
    
    updateCell(row, col, {
      playerName: matchingPlayer.label,
      playerQid: matchingPlayer.qid,
      valid: true,
      rowMatchDetails: boardData.cells[cellKey].rowEntity ? {
        entity: boardData.cells[cellKey].rowEntity.label,
        qid: boardData.cells[cellKey].rowEntity.qid
      } : null,
      colMatchDetails: boardData.cells[cellKey].colEntity ? {
        entity: boardData.cells[cellKey].colEntity.label,
        qid: boardData.cells[cellKey].colEntity.qid
      } : null
    });

    setMessage(`✅ "${matchingPlayer.label}" added to cell (${row + 1}, ${col + 1})!`);
    setPlayerName('');
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const selectSuggestion = (suggestion) => {
    setPlayerName(suggestion.label);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  if (isPrecomputing) {
    return (
      <div className="player-input-container">
        <div className="player-input-loading">
          ⏳ Loading board... Please wait...
        </div>
      </div>
    );
  }

  return (
    <div className="player-input-container">
      <div className="player-input-header">
        <span className="input-label">
          Type any player name to fill the board:
        </span>
        {boardData && (
          <span className="player-count">
            {boardData.playerCount} valid players
          </span>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="player-input-form">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            placeholder="E.g., Lionel Messi, Cristiano Ronaldo..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={!boardData}
            className="player-input-field"
            autoComplete="off"
          />
          <button 
            type="submit" 
            disabled={!boardData || !playerName.trim()}
            className="submit-btn"
          >
            ✓
          </button>
        </div>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((suggestion, index) => {
              const isUsed = usedPlayers.has(suggestion.label.toLowerCase());
              return (
                <div
                  key={index}
                  className={`suggestion-item ${isUsed ? 'suggestion-item-disabled' : ''}`}
                  onClick={() => !isUsed && selectSuggestion(suggestion)}
                >
                  <div className="suggestion-content">
                    <div className="suggestion-name">{suggestion.label}</div>
                    {suggestion.years && (
                      <div className="suggestion-years">{suggestion.years}</div>
                    )}
                  </div>
                  {isUsed ? (
                    <div className="already-used-badge">Already Used</div>
                  ) : (
                    <div className="select-badge">Select</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </form>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
    </div>
  );
}

export default PlayerInput;
