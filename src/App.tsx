import { createHashRouter, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Worklist } from './pages/Worklist';
import { Upload } from './pages/Upload';
import { Reconstruction } from './pages/Reconstruction';
import { VirtualFitting } from './pages/VirtualFitting';
import { Report } from './pages/Report';

// Hash router: bundle statis tidak punya server yang bisa mengembalikan
// index.html untuk deep link, jadi rute hidup di fragmen (`/#/worklist`).
export const router = createHashRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/worklist', element: <Worklist /> },
  { path: '/cases/:id/upload', element: <Upload /> },
  { path: '/cases/:id/reconstruction', element: <Reconstruction /> },
  { path: '/cases/:id/fitting', element: <VirtualFitting /> },
  { path: '/cases/:id/report', element: <Report /> },
]);
