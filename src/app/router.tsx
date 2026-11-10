import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminLayout } from './Layout';
import { Landing, Survey } from '../pages/Public';
import { useStore } from './Store';
const Analytics = lazy(() =>
  import('../pages/Analytics').then((m) => ({ default: m.AnalyticsPage })),
);
const Units = lazy(() => import('../pages/Management').then((m) => ({ default: m.UnitsPage })));
const Questions = lazy(() =>
  import('../pages/Management').then((m) => ({ default: m.QuestionsPage })),
);
const Actions = lazy(() => import('../pages/Management').then((m) => ({ default: m.ActionsPage })));
const Settings = lazy(() => import('../pages/Tools').then((m) => ({ default: m.SettingsPage })));
const Transfer = lazy(() => import('../pages/Tools').then((m) => ({ default: m.TransferPage })));
const Qr = lazy(() => import('../pages/Tools').then((m) => ({ default: m.QrPage })));
function Root() {
  const { data } = useStore();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.dataset.theme = data.settings.theme;
  }, [location.pathname, data.settings.theme]);
  return (
    <Suspense
      fallback={
        <div className="loading" role="status">
          Memuat RSAS-SATISFACTION…
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}
export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/survei', element: <Survey /> },
      { path: '/survei/:slug', element: <Survey /> },
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          ...(['dashboard', 'unit', 'indikator', 'respons', 'feedback', 'laporan'] as const).map(
            (mode) => ({ path: mode, element: <Analytics key={mode} mode={mode} /> }),
          ),
          { path: 'master-unit', element: <Units /> },
          { path: 'pertanyaan', element: <Questions /> },
          { path: 'tindak-lanjut', element: <Actions /> },
          { path: 'pengaturan', element: <Settings /> },
          { path: 'impor-ekspor', element: <Transfer /> },
          { path: 'qr', element: <Qr /> },
        ],
      },
      {
        path: '*',
        element: (
          <div className="recovery card">
            <h1>Halaman tidak ditemukan</h1>
            <a href="/">Kembali ke beranda RSAS</a>
          </div>
        ),
      },
    ],
  },
]);
