// Webhook URLs
// Business hours configuration
export const BUSINESS_HOURS = {
  1: { start: 9, end: 20 }, // Monday
  2: { start: 9, end: 20 }, // Tuesday
  3: { start: 9, end: 20 }, // Wednesday
  4: { start: 9, end: 20 }, // Thursday
  5: { start: 9, end: 20 }, // Friday
  6: { start: 9, end: 16 }, // Saturday
  0: { start: 9, end: 14 }  // Sunday
};

export const FETCH_TIMES_WEBHOOK = 'https://hook.eu2.make.com/grngzzawl52b9irt56fup7a2uqooa2hs';
export const SUBMIT_BOOKING_WEBHOOK = 'https://hook.eu2.make.com/h5ve63bmn3wajmvksd7qagt47ibh522o';

// Define service types
export const services = [
  { id: '360-booth', name: '360 Booth', icon: '📸', description: 'Immersive 360° video experience for events and brand activations', price: '€100/hr OR €350 for 5hr' },
  { id: 'photography', name: 'Photography', icon: '📷', description: 'Professional photography for products, fashion, and portraits', price: '€100+' },
  { id: 'videography', name: 'Videography', icon: '🎥', description: 'High-quality video production for events and brand content', price: '€100+' },
  { id: 'touchplus', name: 'Touch+', icon: '✨', description: 'Premium subscription service for monthly content creation', isPremium: true, price: '€250/mo' }
];