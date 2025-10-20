import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Grid from './components/Grid';
import PlayerInput from './components/PlayerInput';

function App() {
  const [rowLabels, setRowLabels] = useState([]);
  const [colLabels, setColLabels] = useState([]);
  const [cells, setCells] = useState(
    Array(3).fill(null).map(() => Array(3).fill(null))
  );
  const [boardData, setBoardData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrecomputing, setIsPrecomputing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const generateNewBoard = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isGenerating || isPrecomputing) {
      console.log('⏳ Board generation already in progress, skipping...');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🎲 Generating new board...');
      const response = await axios.get('/api/generate-board');
      setRowLabels(response.data.rowLabels);
      setColLabels(response.data.colLabels);
      // Clear all cells
      setCells(Array(3).fill(null).map(() => Array(3).fill(null)));
      console.log('✅ Board generated:', response.data);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('⏳ Board generation already in progress on server, skipping...');
        return;
      }
      console.error('Error generating board:', error);
      alert('Failed to generate board. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, isPrecomputing]);

  // Generate board on initial load ONLY
  useEffect(() => {
    if (!hasInitialized) {
      console.log('🚀 Initial board generation...');
      generateNewBoard();
      setHasInitialized(true);
    }
  }, [hasInitialized, generateNewBoard]);

  // Precompute board whenever labels change
  useEffect(() => {
    if (rowLabels.length === 0 || colLabels.length === 0) return;

    const precomputeBoard = async () => {
      setIsPrecomputing(true);
      try {
        console.log('🔄 Precomputing board...');
        const response = await axios.post('/api/precompute-board', {
          rowLabels,
          colLabels
        });
        setBoardData(response.data);
        console.log(`✅ Board ready! ${response.data.playerCount} valid players found`);
      } catch (error) {
        if (error.response?.status === 429) {
          console.log('⏳ Precompute already in progress on server, skipping...');
          return;
        }
        console.error('Error precomputing board:', error);
        alert('Failed to precompute board. Check console for details.');
      } finally {
        setIsPrecomputing(false);
      }
    };

    precomputeBoard();
  }, [rowLabels, colLabels]);

  const updateCell = (row, col, cellData) => {
    const newCells = cells.map(r => [...r]);
    newCells[row][col] = cellData;
    setCells(newCells);
  };

  const updateMultipleCells = (cellUpdates) => {
    const newCells = cells.map(r => [...r]);
    cellUpdates.forEach(({ row, col, cellData }) => {
      newCells[row][col] = cellData;
    });
    setCells(newCells);
  };

  // Calculate stats
  const filledBoxes = cells.flat().filter(cell => cell !== null && cell.players && cell.players.length > 0).length;
  
  // Count total player instances (not unique players)
  // If a player is in multiple cells, count each instance
  const totalPlayerInstances = cells.flat()
    .filter(cell => cell !== null && cell.players)
    .reduce((sum, cell) => sum + cell.players.length, 0);
  
  // Calculate total valid players across all cells
  const totalValidPlayers = boardData ? 
    Object.values(boardData.cells).reduce((sum, cell) => sum + (cell.count || 0), 0) : 0;
  
  const completionPercentage = totalValidPlayers > 0 ? 
    Math.round((totalPlayerInstances / totalValidPlayers) * 100) : 0;

  return (
    <div className="App">
      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{filledBoxes}</span>
          <span className="stat-label">BOXES</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalPlayerInstances}</span>
          <span className="stat-label">PLAYERS</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{completionPercentage}%</span>
          <span className="stat-label">COMPLETE</span>
        </div>
        <button 
          onClick={generateNewBoard} 
          disabled={isGenerating || isPrecomputing}
          className="new-board-btn"
        >
          🎲 NEW
        </button>
      </div>
      
      {isPrecomputing && (
        <div className="loading-banner">
          🔄 Loading valid players...
        </div>
      )}
      
      <PlayerInput
        boardData={boardData}
        cells={cells}
        updateCell={updateCell}
        updateMultipleCells={updateMultipleCells}
        isPrecomputing={isPrecomputing}
      />
      
      <Grid 
        rowLabels={rowLabels}
        colLabels={colLabels}
        cells={cells}
        updateCell={updateCell}
        boardData={boardData}
      />
    </div>
  );
}

export default App;



