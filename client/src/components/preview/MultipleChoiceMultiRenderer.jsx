import React, { useState } from 'react';

const MultipleChoiceMultiRenderer = ({ question, language }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const translations = question.translations?.[language] || {};
  const options = translations.options || [];

  const toggleOption = (index) => {
    setSelectedOptions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="multiple-choice-multi-renderer">
      <div className="checkbox-options">
        {options.map((option, index) => (
          <label key={index} className="checkbox-option">
            <input
              type="checkbox"
              checked={selectedOptions.includes(index)}
              onChange={() => toggleOption(index)}
            />
            <span className="checkbox-label">{option.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default MultipleChoiceMultiRenderer;
