import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { CardioPage } from './pages/CardioPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'workout/:id', element: <WorkoutPage /> },
      { path: 'cardio/:modality', element: <CardioPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
