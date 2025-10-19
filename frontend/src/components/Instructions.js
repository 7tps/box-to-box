import React, { useState } from 'react';
import './Instructions.css';

function Instructions() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="instructions">
      <button 
        className="instructions-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▼' : '▶'} How to Play
      </button>
      
      {isExpanded && (
        <div className="instructions-content">
          <h3>Rules:</h3>
          <ul>
            <li>Enter a soccer player's name to fill the board</li>
            <li>The player must match <strong>BOTH</strong> the row label (nationality) <strong>AND</strong> the column label (club)</li>
            <li>Row labels represent countries (nationalities)</li>
            <li>Column labels represent clubs</li>
            <li>You can edit row and column labels by clicking on them</li>
            <li>The app will automatically place players in the correct cell</li>
          </ul>
          
          <h3>Examples:</h3>
          <p>If row = "Argentina" and column = "Barcelona":</p>
          <ul>
            <li>✅ Lionel Messi (Argentine AND played for Barcelona)</li>
            <li>✅ Javier Mascherano (Argentine AND played for Barcelona)</li>
            <li>❌ Sergio Agüero (Argentine but never played for Barcelona)</li>
            <li>❌ Xavi (Played for Barcelona but not Argentine)</li>
            <li>❌ Cristiano Ronaldo (Portuguese, never played for Barcelona)</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Instructions;

