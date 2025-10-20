import React, { useState, useEffect, useRef, useCallback } from 'react';
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

function PlayerInput({ boardData, cells, updateCell, updateMultipleCells, isPrecomputing }) {
  const [playerName, setPlayerName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Get list of already used players
  const getUsedPlayers = useCallback(() => {
    const usedPlayers = new Set();
    cells.flat().forEach(cell => {
      if (cell && cell.players) {
        cell.players.forEach(player => {
          usedPlayers.add(player.playerName.toLowerCase());
        });
      }
    });
    return usedPlayers;
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
      setIsLoadingSuggestions(true);
      try {
        const response = await axios.get('/api/autocomplete', {
          params: { query: playerName, limit: 10 }
        });
        
        // Filter out already used players
        const usedPlayers = getUsedPlayers();
        const filteredSuggestions = response.data.filter(suggestion => 
          !usedPlayers.has(suggestion.label.toLowerCase())
        );
        
        setSuggestions(filteredSuggestions);
        setShowSuggestions(filteredSuggestions.length > 0);
      } catch (error) {
        console.error('Autocomplete error:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [playerName, getUsedPlayers]); // Re-run when cells change to update used players list

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

    // Check if player is already used
    const usedPlayers = getUsedPlayers();
    if (usedPlayers.has(nameToCheck.toLowerCase())) {
      setError(`❌ "${nameToCheck}" has already been used on this board.`);
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
      p?.label?.toLowerCase().includes(normalizedName)
    );

    console.log('✅ Matching player found:', matchingPlayer);
    console.log('🎯 Valid cells for this player:', matchingPlayer?.validCells);

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

    // Fill ALL valid cells for this player
    const cellsFilled = [];
    console.log(`🔄 Processing ${matchingPlayer.validCells.length} valid cells for ${matchingPlayer.label}`);
    
    // Create a copy of the current cells state
    const newCells = cells.map(r => [...r]);
    
    matchingPlayer.validCells.forEach(cellKey => {
      const [row, col] = cellKey.split('-').map(Number);
      console.log(`  📍 Processing cell ${cellKey} (row ${row}, col ${col})`);
      
      // Create new player data
      const newPlayer = {
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
      };
      
      // Get existing cell data
      const existingCellData = newCells[row][col];
      console.log(`    📊 Existing cell data:`, existingCellData);
      
      if (existingCellData && existingCellData.players) {
        // Add to existing players array
        const updatedPlayers = [...existingCellData.players, newPlayer];
        console.log(`    ➕ Adding to existing players. New count: ${updatedPlayers.length}`);
        newCells[row][col] = { players: updatedPlayers };
      } else {
        // Create new cell with single player
        console.log(`    🆕 Creating new cell with first player`);
        newCells[row][col] = { players: [newPlayer] };
      }
      
      cellsFilled.push(`(${row + 1}, ${col + 1})`);
    });
    
    // Update all cells at once using batch update
    console.log(`🔄 Updating ${cellsFilled.length} cells with batch update`);
    const cellUpdates = matchingPlayer.validCells.map(cellKey => {
      const [row, col] = cellKey.split('-').map(Number);
      return { row, col, cellData: newCells[row][col] };
    });
    updateMultipleCells(cellUpdates);

    const cellsText = cellsFilled.length === 1 
      ? `cell ${cellsFilled[0]}` 
      : `${cellsFilled.length} cells: ${cellsFilled.join(', ')}`;
    
    setMessage(`✅ "${matchingPlayer.label}" added to ${cellsText}!`);
    setPlayerName('');
    setSuggestions([]); // Clear suggestions after successful submission
    setShowSuggestions(false);
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const selectSuggestion = (suggestion) => {
    setPlayerName(suggestion.label);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Don't allow submission while suggestions are loading
      if (isLoadingSuggestions) {
        console.log('⏳ Suggestions still loading, please wait...');
        return;
      }
      
      if (suggestions.length > 0) {
        // Select the first suggestion
        selectSuggestion(suggestions[0]);
      } else {
        // Submit the current input
        handleSubmit(e);
      }
    }
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
            placeholder="Search Player..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!boardData}
            className="player-input-field"
            autoComplete="off"
          />
          <button 
            type="button" 
            className="done-btn"
            onClick={() => alert('Game completed! Good job!')}
          >
            DONE?
          </button>
        </div>
        
        {isLoadingSuggestions && (
          <div className="suggestions-dropdown">
            <div className="suggestion-item loading">
              <div className="suggestion-content">
                <div className="suggestion-name">Loading suggestions...</div>
              </div>
            </div>
          </div>
        )}
        
        {showSuggestions && suggestions.length > 0 && !isLoadingSuggestions && (
          <div className="suggestions-dropdown">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => selectSuggestion(suggestion)}
              >
                <div className="suggestion-content">
                  <div className="suggestion-name">{suggestion.label}</div>
                  {suggestion.years && (
                    <div className="suggestion-years">{suggestion.years}</div>
                  )}
                </div>
                <div className="select-badge">Select</div>
              </div>
            ))}
          </div>
        )}
      </form>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
    </div>
  );
}

export default PlayerInput;
