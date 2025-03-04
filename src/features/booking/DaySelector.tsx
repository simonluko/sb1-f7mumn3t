import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DaySelectorProps {
  onSelectDay: (date: string) => void;
  selectedDate: string;
}

const DaySelector: React.FC<DaySelectorProps> = ({ onSelectDay, selectedDate }) => {
  const [days, setDays] = useState<Array<{ date: Date; formatted: string; dayName: string; dayNumber: string }>>([]);
  const [startIndex, setStartIndex] = useState(0);
  const visibleDays = 7; // Number of days visible at once

  useEffect(() => {
    generateDays();
  }, []);

  const generateDays = () => {
    const today = new Date();
    const nextDays = [];
    
    // Generate the next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      const dayName = dayNames[date.getDay()];
      const dayNumber = date.getDate().toString();
      
      // Format date as YYYY-MM-DD for API
      const formatted = date.toISOString().split('T')[0];
      
      nextDays.push({
        date,
        formatted,
        dayName,
        dayNumber
      });
    }
    
    setDays(nextDays);
  };

  const handlePrevious = () => {
    if (startIndex > 0) {
      setStartIndex(startIndex - 1);
    }
  };

  const handleNext = () => {
    if (startIndex + visibleDays < days.length) {
      setStartIndex(startIndex + 1);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const visibleDaysArray = days.slice(startIndex, startIndex + visibleDays);
  const currentMonthYear = visibleDaysArray.length > 0 ? formatMonthYear(visibleDaysArray[0].date) : '';

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium">Select Date</h3>
        <div className="text-gray-300">{currentMonthYear}</div>
      </div>
      
      <div className="flex items-center">
        <button 
          onClick={handlePrevious}
          disabled={startIndex === 0}
          className={`p-2 rounded-full ${startIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-gray-800'}`}
          aria-label="Previous days"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-7 gap-2">
            {visibleDaysArray.map((day) => (
              <button
                key={day.formatted}
                onClick={() => onSelectDay(day.formatted)}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                  ${selectedDate === day.formatted 
                    ? 'bg-white text-black' 
                    : isToday(day.date)
                      ? 'bg-gray-800 text-white border border-white/50'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }
                `}
              >
                <span className="text-xs font-medium">{day.dayName}</span>
                <span className="text-lg font-bold">{day.dayNumber}</span>
                {isToday(day.date) && <span className="text-xs mt-1">Today</span>}
              </button>
            ))}
          </div>
        </div>
        
        <button 
          onClick={handleNext}
          disabled={startIndex + visibleDays >= days.length}
          className={`p-2 rounded-full ${startIndex + visibleDays >= days.length ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-gray-800'}`}
          aria-label="Next days"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default DaySelector;