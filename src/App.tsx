import type { ReactElement } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { getSession } from './lib/session';
import { Login } from './pages/Login';
import { Worklist } from './pages/Worklist';
import { Upload } from './pages/Upload';
import { Reconstruction } from './pages/Reconstruction';
import { VirtualFitting } from './pages/VirtualFitting';
import { Report } from './pages/Report';

// Hash router: bundle statis tidak punya server yang bisa mengembalikan
// index.html untuk deep link, jadi rute hidup di fragmen (`/#/worklist`).
/**
 * Tanpa sesi, halaman kasus dipantulkan ke login — supaya tombol "Keluar"
 * benar-benar mengakhiri akses, bukan sekadar mengganti tampilan header.
 */
function RequireAuth({ children }: { children: ReactElement }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

export const router = createHashRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/worklist', element: <RequireAuth><Worklist /></RequireAuth> },
  { path: '/cases/:id/upload', element: <RequireAuth><Upload /></RequireAuth> },
  { path: '/cases/:id/reconstruction', element: <RequireAuth><Reconstruction /></RequireAuth> },
  { path: '/cases/:id/fitting', element: <RequireAuth><VirtualFitting /></RequireAuth> },
  { path: '/cases/:id/report', element: <RequireAuth><Report /></RequireAuth> },
]);
