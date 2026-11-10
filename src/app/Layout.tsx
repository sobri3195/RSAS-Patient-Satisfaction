import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ChartNoAxesCombined,
  MessagesSquare,
  ClipboardList,
  ListChecks,
  FileChartColumn,
  Settings,
  QrCode,
  ArrowLeftRight,
  CircleHelp,
  Menu,
  ArrowUpRight,
  ChevronRight,
  FlaskConical,
  X,
} from 'lucide-react';
import { Brand, Badge } from '../components/UI';
import { useStore } from './Store';
const nav = [
  ['dashboard', 'Ringkasan', LayoutDashboard],
  ['unit', 'Analisis unit', Building2],
  ['indikator', 'Indikator SKM', ChartNoAxesCombined],
  ['respons', 'Data respons', ClipboardList],
  ['feedback', 'Suara pasien', MessagesSquare],
  ['tindak-lanjut', 'Tindak lanjut', ListChecks],
  ['laporan', 'Laporan', FileChartColumn],
  ['master-unit', 'Master unit', Building2],
  ['pertanyaan', 'Kuesioner', ClipboardList],
  ['qr', 'QR survei', QrCode],
  ['impor-ekspor', 'Impor & ekspor', ArrowLeftRight],
  ['pengaturan', 'Pengaturan', Settings],
] as const;
export function AdminLayout() {
  const { demo, setDemo, data } = useStore();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return (
    <div className="admin-shell">
      <a className="skip" href="#main">
        Langsung ke konten
      </a>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Brand light />
          <button
            className="mobile-only icon-button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">
          RUANG KERJA TIM MUTU <span>LOKAL</span>
        </div>
        <nav>
          {nav.map(([path, label, Icon], i) => (
            <div key={path}>
              {i === 7 && <div className="nav-divider">PENGELOLAAN</div>}
              <NavLink onClick={() => setOpen(false)} to={`/admin/${path}`}>
                <Icon size={18} />
                {label}
                {path === 'feedback' && data.responses.some((r) => r.improvementFeedback) && (
                  <span className="nav-dot" />
                )}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <CircleHelp size={18} />
          <div>
            <strong>Satu perangkat, satu sumber data</strong>
            <p>Cadangkan data secara berkala.</p>
          </div>
        </div>
        <div className="sidebar-footer">
          RSAS-SATISFACTION <span>v1.0</span>
        </div>
      </aside>
      {open && (
        <button className="menu-scrim" aria-label="Tutup menu" onClick={() => setOpen(false)} />
      )}
      <div className="admin-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-only icon-button"
              aria-label="Buka menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span>Tim Mutu</span>
            <ChevronRight size={14} />
            <strong>{nav.find((x) => location.pathname.endsWith(x[0]))?.[1] ?? 'Dashboard'}</strong>
          </div>
          <div className="topbar-actions">
            <Badge tone={demo ? 'gold' : 'green'}>
              {demo ? 'DATA SIMULASI' : 'Penyimpanan lokal'}
            </Badge>
            <Link to="/survei" className="text-link">
              Buka survei <ArrowUpRight size={15} />
            </Link>
            <span className="avatar">TM</span>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <FlaskConical size={17} />
            <strong>DATA SIMULASI</strong> · Angka contoh, bukan hasil pasien nyata.
            <button onClick={() => setDemo(false)}>Kembali ke operasional</button>
          </div>
        )}
        <main id="main" className="main-content">
          <Outlet />
        </main>
        <footer className="admin-footer">
          <span>{'RSAU Prof. dr. Abdulrachman Saleh'} · Sistem Survei Kepuasan Pasien</span>
          <span>Data lokal · Untuk perbaikan pelayanan</span>
        </footer>
      </div>
    </div>
  );
}
