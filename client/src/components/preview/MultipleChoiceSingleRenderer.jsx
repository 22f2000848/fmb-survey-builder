import React, { useState } from 'react';

const MultipleChoiceSingleRenderer = ({ question, language }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const translations = question.translations?.[language] || {};
  const options = translations.options || [];

  return (
    <div className="multiple-choice-single-renderer">
      <div className="pill-buttons">
        {options.map((option, index) => (
          <button
            key={index}
            className={`pill-button ${selectedOption === index ? 'selected' : ''}`}
            onClick={() => setSelectedOption(index)}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MultipleChoiceSingleRenderer;
