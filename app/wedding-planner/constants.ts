// Wedding planner app constants

// Demo wedding ID - in a real app, you'd get this from user context or session
// Diperbarui dengan ID yang benar berdasarkan hasil pengecekan database
export const DEMO_WEDDING_ID = "cm9pysel20025j8m4cmakn4pv";

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