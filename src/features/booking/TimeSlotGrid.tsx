import React from 'react';
import { Clock } from 'lucide-react';
import { formatTimeForDisplay } from './utils';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotGridProps {
  timeSlots: TimeSlot[];
  selectedTime: string;
  onSelectTime: (time: string) => void;
  isLoading: boolean;
}

const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({ 
  timeSlots, 
  selectedTime, 
  onSelectTime, 
  isLoading 
}) => {
  // Group time slots by hour for better organization
  const groupedTimeSlots: { [key: string]: TimeSlot[] } = {};
  
  // Sort time slots by hour and minute
  const sortedSlots = [...timeSlots].sort((a, b) => {
    const [aHour, aMinute] = a.time.split(':').map(Number);
    const [bHour, bMinute] = b.time.split(':').map(Number);
    if (aHour === bHour) {
      return aMinute - bMinute;
    }
    return aHour - bHour;
  });
  
  sortedSlots.forEach(slot => {
    // Extract the hour from the 24-hour time string
    const hour = parseInt(slot.time.split(':')[0], 10);
    const groupKey = hour.toString().padStart(2, '0');
    
    if (!groupedTimeSlots[groupKey]) {
      groupedTimeSlots[groupKey] = [];
    }
    groupedTimeSlots[groupKey].push(slot);
  });

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-gray-400">Loading available time slots...</p>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg p-4 text-center">
        <p className="text-yellow-400">
          {isLoading 
            ? 'Loading available time slots...' 
            : 'No time slots available for the selected date. Please try another date.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <Clock size={18} className="mr-2 text-white" />
        <h3 className="text-xl font-medium">Select Time</h3>
      </div>
      
      <div className="space-y-6">
        {Object.entries(groupedTimeSlots).map(([hour, slots]) => {
          return (
            <div key={hour} className="bg-gray-900/50 rounded-lg p-4 relative">
              <h4 className="text-lg font-medium mb-3 text-white">
                {`${hour}:00`}
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {slots.map((slot, index) => (
                  <button
                    key={`${hour}-${slot.time}`}
                    type="button"
                    onClick={() => slot.available && onSelectTime(slot.time)}
                    disabled={!slot.available}
                    className={`
                      py-2 px-3 rounded-md text-center text-sm transition-all duration-300 relative
                      ${
                        selectedTime === slot.time
                          ? 'bg-white text-black'
                          : slot.available
                            ? 'bg-gray-800 text-white hover:bg-gray-700'
                            : 'bg-gray-800/30 text-gray-500 cursor-not-allowed overflow-hidden'
                      }
                    `}
                  >
                    {!slot.available && (
                      <div 
                        className="absolute inset-0 opacity-10"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
                          backgroundSize: '8px 8px'
                        }}
                      />
                    )}
                    {slot.time}
                    {selectedTime === slot.time && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotGrid;