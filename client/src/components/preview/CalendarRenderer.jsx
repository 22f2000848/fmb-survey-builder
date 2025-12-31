import React, { useState } from 'react';

const CalendarRenderer = ({ question }) => {
  const [selectedDate, setSelectedDate] = useState('');

  return (
    <div className="calendar-renderer">
      <input
        type="date"
        className="preview-date-input"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />
    </div>
  );
};

export default CalendarRenderer;
