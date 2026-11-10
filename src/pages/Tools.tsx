import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Upload, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../app/Store';
import { emptyDataset, institution } from '../data/defaults';
import { Badge, Notice, PageTitle, Section } from '../components/UI';
import {
  downloadFile,
  mergeDatasets,
  parseImport,
  serializeDataset,
} from '../repositories/storage';
import type { Dataset } from '../domain/schema';
export function TransferPage() {
  const { data, demo, update, notify } = useStore();
  const [incoming, setIncoming] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [restore, setRestore] = useState(false);
  const [busy, setBusy] = useState(false);
  let preview: ReturnType<typeof mergeDatasets> | null = null;
  let mergeError = '';
  if (incoming) {
    try {
      preview = mergeDatasets(data, incoming, demo);
    } catch (e) {
      mergeError = (e as Error).message;
    }
  }
  async function read(file?: File) {
    setError('');
    setIncoming(null);
    setResult('');
    if (!file) return;
    if (file.size > 15_000_000) {
      setError('Ukuran maksimum 15 MB.');
      return;
    }
    setBusy(true);
    try {
      const parsed = parseImport(await file.text());
      if (parsed.responses.some((r) => r.isDemo !== demo))
        throw Error('Data simulasi/operasional tidak sesuai mode aktif.');
      setIncoming(parsed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function apply() {
    if (!incoming) return;
    try {
      if (restore) {
        if (
          !confirm(
            'Restore mengganti seluruh data pada namespace aktif. Unduh backup sebelum melanjutkan.',
          ) ||
          prompt('Ketik RESTORE untuk konfirmasi kedua') !== 'RESTORE'
        )
          return;
        update(() => ({ ...incoming, sourceInstanceId: data.sourceInstanceId }));
        setResult(`Restore selesai: ${incoming.responses.length} respons.`);
      } else {
        if (!preview) throw Error(mergeError);
        const merged = preview;
        update(() => merged.data);
        setResult(
          `Merge selesai: ${merged.added} ditambahkan, ${merged.duplicates} duplikat, ${merged.conflicts} konflik respons dan ${merged.masterConflicts} konflik master mempertahankan versi lokal.`,
        );
      }
      setIncoming(null);
      notify('Data tersimpan. Tidak ada unggahan ke layanan pihak ketiga.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title="Impor & ekspor data"
        description="Cadangkan perangkat ini atau konsolidasikan JSON dari kiosk RSAS lainnya."
      />
      <Notice />
      <div className="two-columns">
        <Section
          title="Ekspor cadangan lengkap"
          sub="JSON versi 1 · mencakup master, seluruh versi kuesioner, respons, RTL, volume, label, dan pengaturan"
        >
          <Badge tone={demo ? 'gold' : 'green'}>
            {demo ? 'DATA SIMULASI' : 'DATA OPERASIONAL'}
          </Badge>
          <p>
            {data.responses.length} respons · {data.units.length} unit · {data.actions.length}{' '}
            tindak lanjut.
          </p>
          <button
            className="primary"
            onClick={() =>
              downloadFile(
                `rsas-${demo ? 'SIMULASI-' : ''}backup-${new Date().toISOString().slice(0, 10)}.json`,
                serializeDataset(data),
              )
            }
          >
            <Download size={17} />
            Unduh backup JSON
          </button>
          <p className="muted">
            File berisi komentar bebas dan catatan lokal. Simpan di tempat aman dan batasi
            penyebarannya.
          </p>
        </Section>
        <Section
          title="Impor & konsolidasi"
          sub="Divalidasi di browser. Tidak ada data yang dikirim ke server."
        >
          <label className="file-upload">
            <Upload size={22} />
            Pilih file JSON (maks. 15 MB)
            <input
              type="file"
              accept="application/json,.json"
              disabled={busy}
              onChange={(e) => void read(e.target.files?.[0])}
            />
          </label>
          <label>
            Metode impor
            <select
              value={restore ? 'restore' : 'merge'}
              onChange={(e) => setRestore(e.target.value === 'restore')}
            >
              <option value="merge">Merge — deduplikasi UUID, pertahankan data lokal</option>
              <option value="restore">Restore — ganti namespace aktif (konfirmasi ganda)</option>
            </select>
          </label>
          {busy && <p role="status">Memvalidasi file…</p>}
        </Section>
      </div>
      {incoming && (
        <Section title="Pratinjau impor">
          <p>
            Schema v{incoming.schemaVersion} · diekspor {incoming.exportedAt} · sumber{' '}
            {incoming.sourceInstanceId}
          </p>
          <p>
            {incoming.units.length} unit · {incoming.questionnaires.length} versi ·{' '}
            {incoming.responses.length} respons · {incoming.actions.length} RTL
          </p>
          {preview && (
            <p>
              {preview.added} respons baru, {preview.duplicates} duplikat, {preview.conflicts}{' '}
              konflik respons, {preview.masterConflicts} konflik master. Merge mempertahankan versi
              lokal untuk UUID yang sama. Konflik versi kuesioner atau slug membatalkan merge.
            </p>
          )}
          {mergeError && (
            <p role="alert" className="error">
              {mergeError}
            </p>
          )}
          <p>
            Merge mempertahankan pengaturan dan identitas perangkat lokal. RTL/volume/label dengan
            ID sama memakai versi lokal. Restore mengganti semuanya, mempertahankan identitas
            perangkat tujuan.
          </p>
          <button className="primary" disabled={!restore && !preview} onClick={apply}>
            {restore ? 'Restore cadangan' : 'Terapkan merge'}
          </button>
          <button onClick={() => setIncoming(null)}>Batal</button>
        </Section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="notice" role="status">
          {result}
        </p>
      )}
      <Section title="Alur konsolidasi beberapa perangkat">
        <ol>
          <li>Isi survei pada kiosk/tablet masing-masing.</li>
          <li>Ekspor backup JSON dari browser dan origin yang sama pada setiap perangkat.</li>
          <li>Pindahkan file secara aman ke perangkat dashboard.</li>
          <li>
            Impor menggunakan Merge, periksa pratinjau, lalu terapkan. UUID yang sama tidak dihitung
            ulang.
          </li>
          <li>Unduh backup dashboard setelah konsolidasi.</li>
        </ol>
        <p>
          Tidak ada sinkronisasi otomatis. QR hanya membuka formulir di perangkat pemindai. Browser
          privat, penghapusan data situs, atau perubahan domain dapat menghilangkan akses ke data.
        </p>
      </Section>
    </>
  );
}
export function QrPage() {
  const { data, demo } = useStore();
  const [unitId, setUnitId] = useState(data.units.find((u) => u.isActive)?.id ?? '');
  const [base, setBase] = useState(location.origin);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const unit = data.units.find((u) => u.id === unitId && u.isActive);
  let url = '';
  try {
    const parsed = new URL(base);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password)
      throw Error();
    url = unit ? `${parsed.origin}/survei/${unit.slug}` : '';
  } catch {
    /* Invalid URL is shown below. */
  }
  useEffect(() => {
    let active = true;
    setQr('');
    setError('');
    if (url)
      QRCode.toDataURL(url, {
        width: 420,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#14324F', light: '#FFFFFF' },
      })
        .then((value) => {
          if (active) setQr(value);
        })
        .catch(() => {
          if (active) setError('QR tidak dapat dibuat. Periksa panjang URL.');
        });
    return () => {
      active = false;
    };
  }, [url]);
  return (
    <>
      <PageTitle
        title="QR survei per unit"
        description="Akses cepat ke formulir anonim. Cocok untuk label meja pelayanan."
        action={
          <button onClick={() => window.print()}>
            <Printer size={16} />
            Cetak label
          </button>
        }
      />
      <Notice />
      <div className="two-columns">
        <Section title="Pengaturan tautan">
          <label>
            Unit aktif
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              {data.units
                .filter((u) => u.isActive)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Origin publik setelah deploy
            <input type="url" value={base} onChange={(e) => setBase(e.target.value)} />
          </label>
          {!url && (
            <p className="error">Masukkan origin HTTP/HTTPS yang valid dan pilih unit aktif.</p>
          )}
          <p className="muted">
            Gunakan domain Vercel yang dapat diakses pasien. Origin localhost hanya untuk pengujian
            pada perangkat ini.
          </p>
          {url && <p className="break-word">{url}</p>}
          {demo && (
            <p className="error">
              Mode simulasi tidak dibawa melalui QR; pemindai membuka mode operasional lokal di
              perangkatnya sendiri.
            </p>
          )}
        </Section>
        <section className="card qr-label">
          <Badge>SUARA ANDA BERARTI</Badge>
          <h2>Berikan penilaian Anda</h2>
          <h3>{unit?.name ?? 'Pilih unit'}</h3>
          {qr && <img width={250} height={250} src={qr} alt={`QR survei ${unit?.name}`} />}
          <p>Anonim · Sekitar 2–4 menit</p>
          <strong>RSAS</strong>
          <small>{institution}</small>
          <p className="muted">
            Data disimpan di perangkat pemindai, tidak langsung masuk dashboard RSAS. Untuk
            konsolidasi, gunakan kiosk RSAS atau ekspor–impor JSON.
          </p>
          {qr && (
            <a className="button primary no-print" href={qr} download={`QR-RSAS-${unit?.slug}.png`}>
              <Download size={16} />
              Unduh QR PNG
            </a>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
export function SettingsPage() {
  const { data, demo, update, setDemo, notify } = useStore();
  const [settings, setSettings] = useState(data.settings);
  const [error, setError] = useState('');
  const [volume, setVolume] = useState({
    unitId: data.units[0]?.id ?? '',
    from: '',
    to: '',
    visits: '',
    definition: '',
  });
  function save() {
    try {
      update((d) => ({ ...d, settings }));
      notify('Pengaturan tersimpan pada perangkat ini.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5_000_000) {
      setError('Gunakan PNG/JPEG/WebP maksimal 5 MB, bukan SVG.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw Error();
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const logo = canvas.toDataURL('image/webp', 0.8);
      if (logo.length > 400000) throw Error();
      setSettings((s) => ({ ...s, logo }));
      setError('');
    } catch {
      setError('Logo tidak dapat dibaca atau dikompres.');
    }
  }
  function addVolume() {
    const visits = Number(volume.visits);
    if (
      !volume.unitId ||
      !Number.isInteger(visits) ||
      visits < 1 ||
      !volume.from ||
      !volume.to ||
      volume.from > volume.to ||
      !volume.definition.trim()
    ) {
      setError('Lengkapi unit, tanggal valid, kunjungan positif, dan definisi denominator.');
      return;
    }
    try {
      update((d) => ({
        ...d,
        manualVolumes: [
          ...d.manualVolumes.filter(
            (x) => !(x.unitId === volume.unitId && x.from === volume.from && x.to === volume.to),
          ),
          { id: crypto.randomUUID(), ...volume, visits },
        ],
      }));
      notify('Volume kunjungan tersimpan. Response rate tersedia pada rentang yang sama.');
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title="Pengaturan perangkat"
        description="Identitas RSAS, tampilan kiosk, dan pengelolaan penyimpanan lokal."
      />
      <Section title="Batasan data & keamanan">
        <Notice />
        <p>
          localStorage hanya tersedia di browser, perangkat, dan origin yang sama. Deploy Vercel
          tidak menyinkronkan isian ponsel ke dashboard pusat. Link/QR pada ponsel lain hanya
          membuka form dan menyimpan secara lokal di ponsel itu.
        </p>
        <p>
          Dashboard tidak memiliki autentikasi aman. Semua pengguna browser dapat mengakses,
          mengekspor, atau mengubah data lokal. Jangan menyimpan kredensial atau identitas/data
          kesehatan pasien. Komentar bebas perlu ditinjau sebelum dibagikan.
        </p>
        <p>
          Gunakan satu kiosk/tablet RSAS atau konsolidasi JSON secara manual. Cadangkan sebelum
          membersihkan browser. Untuk skenario lintas perangkat nyata diperlukan backend dengan
          kontrol akses.
        </p>
        <Link className="button" to="/admin/impor-ekspor">
          Backup & restore
        </Link>
      </Section>
      <Section title="Identitas dan tampilan">
        <div className="form-grid">
          <label>
            Institusi
            <input value={institution} readOnly />
          </label>
          <label>
            Tema
            <select
              value={settings.theme}
              onChange={(e) =>
                setSettings({ ...settings, theme: e.target.value as 'navy' | 'teal' })
              }
            >
              <option value="navy">Navy RSAS</option>
              <option value="teal">Teal RSAS</option>
            </select>
          </label>
          <label>
            Logo lokal opsional (maks. 5 MB, dikompres)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </label>
          <div>
            {settings.logo ? (
              <>
                <img className="logo-preview" src={settings.logo} alt="Pratinjau logo lokal" />
                <button onClick={() => setSettings({ ...settings, logo: '' })}>
                  Gunakan logo bawaan
                </button>
              </>
            ) : (
              <p>Logo bawaan RSAU Prof. dr. Abdulrachman Saleh aktif.</p>
            )}
          </div>
          <label className="full">
            Pemberitahuan survei
            <textarea
              maxLength={1000}
              required
              value={settings.notice}
              onChange={(e) => setSettings({ ...settings, notice: e.target.value })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.kiosk}
              onChange={(e) => setSettings({ ...settings, kiosk: e.target.checked })}
            />
            Aktifkan mode kiosk pada perangkat ini
          </label>
        </div>
        <button className="primary" onClick={save}>
          Simpan pengaturan
        </button>
      </Section>
      <Section
        title="Jumlah kunjungan manual"
        sub="Denominator harus kunjungan yang memenuhi kriteria survei, bukan perkiraan seluruh penduduk."
      >
        <div className="form-grid">
          <label>
            Unit
            <select
              value={volume.unitId}
              onChange={(e) => setVolume({ ...volume, unitId: e.target.value })}
            >
              {data.units.map((u) => (
                <option value={u.id} key={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jumlah kunjungan
            <input
              type="number"
              min={1}
              step={1}
              value={volume.visits}
              onChange={(e) => setVolume({ ...volume, visits: e.target.value })}
            />
          </label>
          <label>
            Tanggal mulai
            <input
              type="date"
              value={volume.from}
              onChange={(e) => setVolume({ ...volume, from: e.target.value })}
            />
          </label>
          <label>
            Tanggal akhir
            <input
              type="date"
              value={volume.to}
              min={volume.from}
              onChange={(e) => setVolume({ ...volume, to: e.target.value })}
            />
          </label>
          <label>
            Definisi denominator
            <textarea
              maxLength={300}
              placeholder="Misal: kunjungan selesai di unit ini yang memenuhi kriteria survei periode ini"
              value={volume.definition}
              onChange={(e) => setVolume({ ...volume, definition: e.target.value })}
            />
          </label>
        </div>
        <button onClick={addVolume}>Simpan denominator</button>
        <p>
          {data.manualVolumes.length} catatan volume tersimpan. Unit dan rentang sama akan
          diperbarui. Versi kuesioner mengikuti filter analisis; bila berganti versi dalam satu
          periode, denominator harus disesuaikan dengan kriteria versi tersebut.
        </p>
      </Section>
      <Section title="Mode simulasi & penghapusan">
        <button onClick={() => setDemo(!demo)}>
          <ShieldCheck size={16} />
          {demo ? 'Kembali ke operasional' : 'Aktifkan simulasi'}
        </button>
        <p>
          Data simulasi deterministik disimpan dalam namespace terpisah. Ekspor mode simulasi selalu
          diberi label SIMULASI.
        </p>
        <button
          className="danger"
          onClick={() => {
            if (
              confirm(
                `Hapus SEMUA data ${demo ? 'SIMULASI' : 'OPERASIONAL'} pada perangkat ini? Unduh backup terlebih dahulu.`,
              ) &&
              prompt('Ketik HAPUS untuk konfirmasi kedua') === 'HAPUS'
            ) {
              try {
                update(() => emptyDataset());
                localStorage.removeItem(`rsas.skm.v1.${demo ? 'demo.' : ''}draft`);
                setSettings(emptyDataset().settings);
                notify('Data pada namespace aktif dihapus.');
              } catch (e) {
                setError((e as Error).message);
              }
            }
          }}
        >
          Hapus data namespace aktif
        </button>
      </Section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
