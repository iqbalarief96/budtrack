// Utility to migrate dashboard layout from localStorage to database
export async function migrateDashboardLayoutToDatabase() {
  try {
    // Check if there's data in localStorage
    const localStorageKey = 'dashboardLayout';
    const localData = localStorage.getItem(localStorageKey);
    
    if (!localData) {
      console.log('No localStorage data to migrate');
      return { success: true, migrated: false };
    }

    // Parse the local data
    const layout = JSON.parse(localData);

    // Save to database
    const response = await fetch('/api/dashboard/layout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ layout }),
    });

    if (!response.ok) {
      throw new Error('Failed to migrate layout to database');
    }

    // Clear localStorage after successful migration
    localStorage.removeItem(localStorageKey);
    
    console.log('Dashboard layout migrated successfully from localStorage to database');
    return { success: true, migrated: true };
  } catch (error) {
    console.error('Error migrating dashboard layout:', error);
    return { success: false, error };
  }
}

// Check if migration is needed
export function needsDashboardMigration(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('dashboardLayout') !== null;
}
