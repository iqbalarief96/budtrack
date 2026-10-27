// Wedding planner app constants

// Status options
export const VENUE_STATUS_OPTIONS = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending', 
  CANCELLED: 'cancelled',
  VISITED: 'visited',
  SHORTLISTED: 'shortlisted'
} as const;

// Feature options for venues
export const VENUE_FEATURES = [
  'Indoor', 'Outdoor', 'Parkir Luas', 'AC', 'Ruang Ganti', 'Katering', 
  'Dekorasi', 'Lighting', 'Sound System', 'Taman', 'Gazebo', 'Kolam Renang',
  'Penginapan', 'Valet', 'Free WiFi', 'Generator', 'Bridal Suite'
]; 