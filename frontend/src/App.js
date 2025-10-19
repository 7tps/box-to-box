import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Grid from './components/Grid';
import Instructions from './components/Instructions';
import PlayerInput from './components/PlayerInput';
import ValidPlayersList from './components/ValidPlayersList';

function App() {
  const [rowLabels, setRowLabels] = useState([]);
  const [colLabels, setColLabels] = useState([]);
  const [cells, setCells] = useState(
    Array(3).fill(null).map(() => Array(3).fill(null))
  );
  const [boardData, setBoardData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrecomputing, setIsPrecomputing] = useState(false);

  // Generate board on initial load
  useEffect(() => {
    generateNewBoard();
  }, []);

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
        console.error('Error precomputing board:', error);
        alert('Failed to precompute board. Check console for details.');
      } finally {
        setIsPrecomputing(false);
      }
    };

    precomputeBoard();
  }, [rowLabels, colLabels]);

  const generateNewBoard = async () => {
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
      console.error('Error generating board:', error);
      alert('Failed to generate board. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateCell = (row, col, cellData) => {
    const newCells = cells.map(r => [...r]);
    newCells[row][col] = cellData;
    setCells(newCells);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>⚽ Box to Box</h1>
        <p className="subtitle">Soccer Player Validation Game</p>
      </header>
      
      <Instructions />
      
      <div className="board-controls">
        <button 
          onClick={generateNewBoard} 
          disabled={isGenerating || isPrecomputing}
          className="regenerate-btn"
        >
          {isGenerating ? '🔄 Generating...' : '🎲 New Board'}
        </button>
      </div>
      
      {isPrecomputing && (
        <div className="loading-banner">
          🔄 Loading valid players for all cells... This may take 30-60 seconds for achievement categories.
        </div>
      )}
      
      <PlayerInput
        boardData={boardData}
        cells={cells}
        updateCell={updateCell}
        isPrecomputing={isPrecomputing}
      />
      
      <ValidPlayersList boardData={boardData} />
      
      <Grid 
        rowLabels={rowLabels}
        colLabels={colLabels}
        setRowLabels={setRowLabels}
        setColLabels={setColLabels}
        cells={cells}
        updateCell={updateCell}
      />
      
      <footer className="App-footer">
        <p>Powered by <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata</a></p>
      </footer>
    </div>
  );
}

export default App;

