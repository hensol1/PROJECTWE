import loadable from '@loadable/component';

// Lazy load components
export const AdminPage = loadable(() => import('./AdminPage'), {
  fallback: '<div>Loading...</div>'
});

export const Matches = loadable(() => import('./Matches'), {
  fallback: '<div>Loading...</div>'
});

export const StatsPage = loadable(() => import('./StatsPage'), {
  fallback: '<div>Loading...</div>'
});

export const AboutUs = loadable(() => import('./AboutUs'), {
  fallback: '<div>Loading...</div>'
});

// Add more components as needed