import React, { useState } from 'react';

const LikertScaleRenderer = ({ question, language }) => {
  const [selectedValue, setSelectedValue] = useState(null);
  const translations = question.translations?.[language] || {};
  const options = translations.options || [];

  return (
    <div className="likert-scale-renderer">
      <div className="likert-scale">
        {options.map((option, index) => (
          <button
            key={index}
            className={`likert-button ${selectedValue === index ? 'selected' : ''}`}
            onClick={() => setSelectedValue(index)}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LikertScaleRenderer;
