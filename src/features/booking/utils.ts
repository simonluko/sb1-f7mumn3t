import { BUSINESS_HOURS } from './constants';

/**
 * Formats a date and time for webhook submission
 * @param date ISO date string (YYYY-MM-DD)
 * @param time Time string (e.g., "2:30 PM" or "14:30")
 * @returns ISO datetime string for Google Calendar
 */
export const formatDateTimeForWebhook = (date: string, time: string): string => {
  // Parse the time string
  let hours = 0;
  let minutes = 0;
  
  // Parse 24-hour time format (e.g., "14:30")
  const [hourStr, minuteStr] = time.split(':');
  hours = parseInt(hourStr, 10);
  minutes = parseInt(minuteStr, 10);
  
  // Create a date object from the date string
  const bookingDate = new Date(date);
  // Set the hours and minutes
  bookingDate.setHours(hours, minutes, 0, 0);
  
  // Return ISO string format
  return bookingDate.toISOString();
};

/**
 * Generates default time slots in 30-minute intervals
 * @returns Array of time slots from 9:00 AM to 8:00 PM
 */
// Helper function to check if a time slot is before the minimum buffer time
const isBeforeMinimumBuffer = (timeSlot: string, date: string): boolean => {
  const now = new Date();
  const selectedDate = new Date(date);
  
  // If the selected date is in the future, all time slots are valid
  if (selectedDate.getDate() > now.getDate() || 
      selectedDate.getMonth() > now.getMonth() || 
      selectedDate.getFullYear() > now.getFullYear()) {
    return false;
  }
  
  // Convert timeSlot to a Date object for the selected date
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const slotTime = new Date(selectedDate);
  slotTime.setHours(hours, minutes, 0, 0);
  
  // Calculate the minimum buffer time (current time + 30 minutes)
  const bufferTime = new Date(now);
  bufferTime.setMinutes(bufferTime.getMinutes() + 30);
  
  // Round up to the next 15-minute interval
  const remainder = bufferTime.getMinutes() % 15;
  if (remainder > 0) {
    bufferTime.setMinutes(bufferTime.getMinutes() + (15 - remainder));
  }
  
  return slotTime < bufferTime;
};

export const generateDefaultTimeSlots = () => {
  const slots = [];
  
  // Default to Monday's hours if no date is provided
  const dayOfWeek = 1;
  const { start, end } = BUSINESS_HOURS[dayOfWeek as keyof typeof BUSINESS_HOURS];
  
  // Generate slots based on business hours
  for (let hour = start; hour < end; hour++) {
    const displayHour = hour.toString().padStart(2, '0');
    
    // Generate slots in 15-minute intervals
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${displayHour}:${minute.toString().padStart(2, '0')}`;
      
      // Check if this time slot is before the minimum buffer time
      const isTooSoon = isBeforeMinimumBuffer(time, new Date().toISOString().split('T')[0]);
      
      slots.push({
        time,
        available: !isTooSoon
      });
    }
  }
  
  return slots;
};

export const formatTimeForDisplay = (time: string): string => {
  if (!time) return '';
  
  // Parse the time string
  const [hours, minutes] = time.split(':').map(Number);
  
  // Format in 24-hour time
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const formatTimeForStorage = (time: string): string => {
  if (!time) return '';
  
  // If already in 24-hour format, return as is
  if (time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
    return time;
  }
  
  // Parse 12-hour format (e.g., "2:30 PM")
  const match = time.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return time;
  
  let [_, hours, minutes, period] = match;
  let hour = parseInt(hours, 10);
  
  // Convert to 24-hour format
  if (period.toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  
  return `${hour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

/**
 * Validates an Irish phone number
 * @param phone Phone number to validate
 * @returns Boolean indicating if the phone number is valid
 */
export const validateIrishPhone = (phone: string): boolean => {
  // Remove spaces for validation
  const cleanPhone = phone.replace(/\s/g, '');
  const phoneRegex = /^08[0-9][0-9]{7}$/;
  return phoneRegex.test(cleanPhone);
};

/**
 * Formats a date for display
 * @param dateString ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Monday, January 1, 2024")
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Gets the next 30 days starting from today
 * @returns Array of date objects for the next 30 days
 */
export const getNext30Days = () => {
  const days = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  
  return days;
};

/**
 * Parses webhook response and formats time slots
 * @param data Response data from webhook
 * @returns Array of formatted time slots
 */
export const parseWebhookTimeSlots = (data: any): { time: string, available: boolean }[] => {
  try {
    const bookedTimes = new Set();
    
    // Default to business hours for the current day
    const dayOfWeek = new Date().getDay();
    const { start, end } = BUSINESS_HOURS[dayOfWeek as keyof typeof BUSINESS_HOURS];
    
    // If the response contains an array of events
    if (data && data.items && Array.isArray(data.items)) {
      data.items.forEach((event: any) => {
        if (event.start && event.start.dateTime && event.end && event.end.dateTime) {
          const startDate = new Date(event.start.dateTime);
          const endDate = new Date(event.end.dateTime);
          const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
          
          // Add all 15-minute slots within the event duration
          for (let i = 0; i < durationMinutes; i += 15) {
            const slotDate = new Date(startDate.getTime() + i * 60 * 1000);
            const hours = slotDate.getHours().toString().padStart(2, '0');
            const minutes = slotDate.getMinutes().toString().padStart(2, '0');
            const time = `${hours}:${minutes}`;
            bookedTimes.add(time);
          }
        }
      });
    }
    // If it's a single event response
    else if (data && data.start && data.start.dateTime && data.end && data.end.dateTime) {
      const startDate = new Date(data.start.dateTime);
      const endDate = new Date(data.end.dateTime);
      const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      
      // Add all 15-minute slots within the event duration
      for (let i = 0; i < durationMinutes; i += 15) {
        const slotDate = new Date(startDate.getTime() + i * 60 * 1000);
        const hours = slotDate.getHours().toString().padStart(2, '0');
        const minutes = slotDate.getMinutes().toString().padStart(2, '0');
        const time = `${hours}:${minutes}`;
        bookedTimes.add(time);
      }
    }
    // If the response contains a simple array of booked times
    else if (data && data.bookedTimes && Array.isArray(data.bookedTimes)) {
      data.bookedTimes.forEach((time: string) => {
        bookedTimes.add(time.includes('M') ? formatTimeForStorage(time) : time);
      });
    }
    
    // Generate all possible time slots and mark booked ones as unavailable
    const allTimeSlots = [];
    
    // Generate slots based on business hours
    for (let hour = start; hour < end; hour++) {
      const displayHour = hour.toString().padStart(2, '0');
      
      // Generate slots in 15-minute intervals
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${displayHour}:${minute.toString().padStart(2, '0')}`;
        allTimeSlots.push({
          time,
          available: !bookedTimes.has(time)
        });
      }
    }
    
    return allTimeSlots.map(slot => ({
      time: slot.time,
      available: !bookedTimes.has(slot.time)
    }));
  } catch (error) {
    console.error('Error parsing webhook response:', error);
    // Return empty array instead of default slots on error
    return [];
  }
};

/**
 * Formats selected services for webhook submission
 * @param selectedServices Array of service IDs
 * @param servicesList Array of service objects
 * @returns Object with individual service properties
 */
export const formatSelectedServices = (selectedServices: string[], servicesList: any[]): Record<string, string> => {
  const result: Record<string, string> = {};
  
  selectedServices.forEach((serviceId, index) => {
    const service = servicesList.find(s => s.id === serviceId);
    if (service) {
      result[`service${index + 1}`] = service.name;
    }
  });
  
  return result;
};