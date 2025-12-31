import React from 'react';

const TabularTextInputRenderer = ({ question, language }) => {
  // Parse table headers and questions
  const tableHeaders = question.tableHeaderValue?.split('|').filter(h => h.trim()) || [];
  const tableQuestions = question.tableQuestionValue?.split('\n')
    .map(line => {
      const [key, value] = line.split(':');
      return { key: key?.trim(), value: value?.trim() };
    })
    .filter(q => q.key && q.value) || [];

  return (
    <div className="tabular-text-input-renderer">
      <table className="preview-table">
        <thead>
          <tr>
            <th></th>
            {tableHeaders.map((header, idx) => (
              <th key={idx}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableQuestions.map((tq, idx) => (
            <tr key={idx}>
              <td className="row-label">{tq.value}</td>
              {tableHeaders.map((_, colIdx) => (
                <td key={colIdx}>
                  <input 
                    type="text" 
                    className="preview-text-input"
                    placeholder="Enter text"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TabularTextInputRenderer;
