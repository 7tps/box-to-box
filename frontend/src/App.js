import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Grid from './components/Grid';
import Instructions from './components/Instructions';
import PlayerInput from './components/PlayerInput';
import ValidPlayersList from './components/ValidPlayersList';

function App() {
  const [rowLabels, setRowLabels] = useState(['Argentina', 'Brazil', 'Spain']);
  const [colLabels, setColLabels] = useState(['Barcelona', 'Real Madrid', 'Manchester United']);
  const [cells, setCells] = useState(
    Array(3).fill(null).map(() => Array(3).fill(null))
  );
  const [boardData, setBoardData] = useState(null);
  const [isPrecomputing, setIsPrecomputing] = useState(false);

  // Precompute board whenever labels change
  useEffect(() => {
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
      
      {isPrecomputing && (
        <div className="loading-banner">
          🔄 Loading valid players for all cells... This may take 10-20 seconds.
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

