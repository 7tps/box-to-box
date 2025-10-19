import React, { useState } from 'react';
import './LabelEditor.css';

function LabelEditor({ label, onUpdate, type }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(label);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className={`label-editor ${type}`}>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyPress}
          autoFocus
          className="label-input"
        />
      </div>
    );
  }

  return (
    <div 
      className={`label-editor ${type}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <span className="label-text">{label}</span>
      <span className="edit-icon">✏️</span>
    </div>
  );
}

export default LabelEditor;

