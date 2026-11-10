import { ArrowUpRight, Database, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useRef, type ReactNode } from 'react';
import { institution } from '../data/defaults';
import { useStore } from '../app/Store';
export function Brand({ light = false }: { light?: boolean }) {
  const { data } = useStore();
  return (
    <Link to="/" className={`brand ${light ? 'light' : ''}`} title="Kembali ke beranda RSAS">
      <img
        src={data.settings.logo || '/rsas-logo.webp'}
        alt={
          data.settings.logo ? 'Logo RSAS unggahan lokal' : 'Logo RSAU Prof. dr. Abdulrachman Saleh'
        }
      />
      <span>
        <strong>
          RSAS<span className="gold"> · </span>SATISFACTION
        </strong>
        <small>{institution}</small>
      </span>
    </Link>
  );
}
export function Empty({ text = 'Belum ada respons pada filter ini.' }: { text?: string }) {
  return (
    <div className="empty">
      <Database size={34} />
      <h3>{text}</h3>
      <p>Setiap pengalaman membantu kami memperbaiki pelayanan.</p>
      <Link className="button primary" to="/survei">
        Isi survei pertama <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Notice({ children }: { children?: ReactNode }) {
  return (
    <div className="notice">
      <ShieldCheck size={19} />
      <p>
        {children ??
          'Data tersimpan hanya di browser dan perangkat ini. Tidak ada sinkronisasi antarperangkat. Gunakan kiosk RSAS atau ekspor–impor JSON untuk konsolidasi.'}
      </p>
    </div>
  );
}
export function PageTitle({
  eyebrow = 'MONITORING MUTU PELAYANAN',
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Section({
  title,
  sub,
  children,
  className = '',
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="section-title">
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </section>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal card"
      aria-label="Detail respons"
      onCancel={onClose}
      onClose={onClose}
    >
      <button autoFocus onClick={onClose}>
        Tutup detail
      </button>
      {children}
    </dialog>
  );
}
