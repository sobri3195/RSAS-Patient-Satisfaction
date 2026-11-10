import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Download, Printer, ArrowUpRight, FlaskConical } from 'lucide-react';
import { useAnalysis } from '../hooks/useAnalysis';
import { Filters, Kpis, Charts, UnitTable, ElementTable, Volumes } from '../components/Analysis';
import { Badge, Empty, Modal, Notice, PageTitle, Section } from '../components/UI';
import {
  categoryFeedback,
  displayNumber,
  getPriorityElements,
  safetyFlag,
} from '../domain/analytics';
import { categories, elementIds, type SurveyResponse } from '../domain/schema';
import { downloadFile, serializeDataset } from '../repositories/storage';
import { toCsv } from '../lib/csv';
import { institution } from '../data/defaults';
const titles = {
  dashboard: [
    'Ringkasan kepuasan pasien',
    'Dengarkan pengalaman pasien. Wujudkan pelayanan yang lebih baik.',
  ],
  unit: [
    'Analisis unit pelayanan',
    'Bandingkan pengalaman pelayanan dengan konteks jumlah responden.',
  ],
  indikator: [
    'Indikator kepuasan masyarakat',
    'Sembilan unsur SKM, dihitung transparan dan terpisah dari metrik tambahan.',
  ],
  respons: ['Data respons', 'Jawaban anonim yang tersimpan di perangkat ini.'],
  feedback: ['Suara pasien', 'Masukan untuk didengar, ditinjau, dan ditindaklanjuti.'],
  laporan: ['Laporan kepuasan pasien', 'Ringkasan terukur untuk Tim Mutu dan Pimpinan RSAS.'],
} as const;
export function AnalyticsPage({ mode = 'dashboard' }: { mode?: keyof typeof titles }) {
  const a = useAnalysis();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<SurveyResponse | null>(null);
  const [limit, setLimit] = useState(25);
  const [title, description] = titles[mode];
  const rows = a.rows.filter((r) =>
    `${r.positiveFeedback ?? ''} ${r.improvementFeedback ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const complaints = a.rows.filter((r) => r.improvementFeedback?.trim());
  const labelFor = (r: SurveyResponse) =>
    a.data.feedbackLabels.find((x) => x.responseId === r.id)?.category ??
    categoryFeedback(r.improvementFeedback ?? '');
  const pareto = categories
    .map((name) => ({ name, n: complaints.filter((r) => labelFor(r) === name).length }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n);
  const priorities = getPriorityElements(a.rows);
  const lowest = priorities[0];
  const highest = priorities.at(-1);
  const report = mode === 'laporan';
  function exportCsv() {
    downloadFile(
      `rsas-${a.demo ? 'SIMULASI-' : ''}respons.csv`,
      toCsv([
        ['UUID', 'Tanggal UTC', 'Unit', 'Versi', ...elementIds, 'Komentar positif', 'Perbaikan'],
        ...a.rows.map((r) => [
          r.id,
          r.submittedAt,
          r.unitNameSnapshot,
          r.surveyVersion,
          ...elementIds.map((id) => r.answers[id]),
          r.positiveFeedback,
          r.improvementFeedback,
        ]),
      ]),
      'text/csv;charset=utf-8',
    );
  }
  return (
    <>
      <PageTitle
        title={title}
        description={description}
        action={
          <div className="heading-actions no-print">
            {!a.demo && (
              <button onClick={() => a.setDemo(true)}>
                <FlaskConical size={15} />
                Aktifkan simulasi
              </button>
            )}
            {report ? (
              <button className="primary" onClick={() => window.print()}>
                <Printer size={16} />
                Cetak / PDF
              </button>
            ) : (
              <Link className="button primary" to="/survei">
                Buka survei <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        }
      />
      <Filters a={a} />
      {report && (
        <div className="report-heading">
          <p>{a.demo ? 'DATA SIMULASI · ' : ''}LAPORAN SURVEI KEPUASAN PASIEN</p>
          <h2>RSAU PROF. DR. ABDULRACHMAN SALEH</h2>
          <p>
            Tanggal cetak {format(new Date(), 'dd/MM/yyyy HH:mm')} · {a.filter.from || 'Awal data'}{' '}
            — {a.filter.to || 'Akhir data'} ·{' '}
            {a.data.units.find((u) => u.id === a.filter.unitId)?.name ?? 'Seluruh unit'} ·{' '}
            {a.filter.version} · n={a.stats.n}
          </p>
        </div>
      )}
      {['dashboard', 'unit', 'laporan', 'indikator'].includes(mode) && (
        <>
          <Kpis a={a} />
          {a.stats.n > 0 && a.stats.n < 30 && (
            <p className="sample-note">
              Sampel kecil; interpretasi hati-hati. n &lt; 30 adalah heuristik internal, bukan
              ambang hukum.
            </p>
          )}
        </>
      )}
      {['dashboard', 'unit', 'indikator'].includes(mode) && a.rows.length > 0 && (
        <Section
          title="Fokus perbaikan berdasarkan data"
          sub="Sinyal untuk verifikasi proses, bukan kesimpulan sebab-akibat atau mutu klinis."
        >
          <p>
            Raw IKM: {displayNumber(a.stats.ikm === null ? null : a.stats.ikm / 25)} /4. Tertinggi:{' '}
            {highest?.id} ({displayNumber(highest?.mean ?? null)}/4). Terendah: {lowest?.id} (
            {displayNumber(lowest?.mean ?? null)}/4).{' '}
            {highest?.mean === lowest?.mean
              ? 'Seluruh unsur yang memiliki data bernilai sama.'
              : ''}
          </p>
          <ol>
            {priorities.slice(0, 3).map((x) => (
              <li key={x.id}>
                Tinjau {a.q.core.find((q) => q.id === x.id)?.label.toLowerCase()} ({x.id}, n valid=
                {x.validResponseCount}); verifikasi proses bersama kepala unit dan tetapkan
                percobaan PDSA.
              </li>
            ))}
          </ol>
          {pareto[0] && (
            <p>
              Kategori komentar perbaikan terbanyak: <strong>{pareto[0].name}</strong>,{' '}
              {pareto[0].n} komentar dari {complaints.length}. Baca konteks lokal sebelum menetapkan
              prioritas.
            </p>
          )}
          <Link className="text-link" to="/admin/tindak-lanjut">
            Catat rencana tindak lanjut <ArrowUpRight size={15} />
          </Link>
        </Section>
      )}
      {['dashboard', 'laporan'].includes(mode) && <Charts a={a} />}{' '}
      {['dashboard', 'unit', 'laporan'].includes(mode) && <UnitTable a={a} />}{' '}
      {['unit', 'indikator'].includes(mode) && (
        <>
          <UnitTable a={a} heatmap />
          <ElementTable a={a} />
        </>
      )}
      {mode === 'laporan' && (
        <>
          <ElementTable a={a} />
          <Section title="Ringkasan dan prioritas perbaikan">
            {a.stats.n ? (
              <>
                <p>
                  Terdapat {a.stats.n} respons pada filter terpilih.{' '}
                  {a.stats.ikm === null
                    ? 'IKM belum dapat dihitung karena ada unsur tanpa jawaban valid.'
                    : `IKM gabungan respons ${displayNumber(a.stats.ikm)} dengan mutu ${a.stats.grade}.`}{' '}
                  {lowest &&
                    `Unsur terendah ${lowest.id} (${displayNumber(lowest.mean)}/4), menjadi bahan verifikasi proses oleh Tim Mutu.`}
                </p>
                <p>
                  {complaints.length} komentar perbaikan; kategori terbanyak:{' '}
                  {pareto[0]?.name ?? 'belum ada'}. Jumlah komentar bukan bukti kausalitas atau mutu
                  klinis.
                </p>
              </>
            ) : (
              <Empty />
            )}
            <h3>Metodologi</h3>
            <p>
              PermenPANRB No. 14 Tahun 2017: rerata valid per U1–U9, dikalikan bobot versi{' '}
              {a.q.version}, dijumlahkan lalu ×25. Null tidak dihitung; seluruh unsur wajib memiliki
              data valid. Bobot: {a.q.weights.map((w) => displayNumber(w, 6)).join('; ')}.{' '}
              {a.q.weights.some((w) => Math.abs(w - 1 / 9) > 1e-9)
                ? 'METODOLOGI DIUBAH: bobot kustom.'
                : 'Bobot sama, presisi penuh 1/9.'}
            </p>
            <p>
              Mutu menggunakan angka penuh: A ≥88,31; B ≥76,61; C ≥65; D ≥25. Tampilan dua desimal
              dapat terlihat sama pada sisi berbeda suatu batas; kategori ditentukan sebelum
              pembulatan. Pengalaman tambahan dan NPS tidak masuk IKM. Sumber: localStorage
              perangkat ini, bukan sampel representatif terjamin. Tidak ada pengesahan resmi.
            </p>
          </Section>
          <Section title="Keluhan agregat">
            <table>
              <thead>
                <tr>
                  <th>Kategori lokal</th>
                  <th>Jumlah komentar</th>
                </tr>
              </thead>
              <tbody>
                {pareto.length ? (
                  pareto.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.n}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>Belum ada komentar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>
          <Section title="Rencana tindak lanjut">
            <table>
              <thead>
                <tr>
                  <th>Masalah</th>
                  <th>Unit</th>
                  <th>PIC jabatan</th>
                  <th>Target / status</th>
                </tr>
              </thead>
              <tbody>
                {a.data.actions
                  .filter(
                    (x) =>
                      (!a.filter.unitId || x.unitId === a.filter.unitId) &&
                      (!a.filter.from || x.dueDate >= a.filter.from) &&
                      (!a.filter.to || x.dueDate <= a.filter.to),
                  )
                  .map((x) => (
                    <tr key={x.id}>
                      <td>{x.title}</td>
                      <td>{a.data.units.find((u) => u.id === x.unitId)?.name ?? 'Lintas unit'}</td>
                      <td>{x.pic}</td>
                      <td>
                        {x.dueDate} · {x.status}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="muted">
              RTL disaring berdasarkan target tanggal dalam periode laporan, bukan tanggal respons.
            </p>
          </Section>
          <div className="toolbar no-print">
            <button onClick={exportCsv}>
              <Download size={16} />
              CSV respons terfilter
            </button>
            <button
              onClick={() =>
                downloadFile(
                  `rsas-${a.demo ? 'SIMULASI-' : ''}laporan.json`,
                  serializeDataset({
                    ...a.data,
                    responses: a.rows,
                    feedbackLabels: a.data.feedbackLabels.filter((x) =>
                      a.rows.some((r) => r.id === x.responseId),
                    ),
                  }),
                )
              }
            >
              JSON data laporan
            </button>
          </div>
        </>
      )}
      {['unit', 'laporan'].includes(mode) && <Volumes a={a} />}{' '}
      {mode === 'indikator' && (
        <Section title="Pengalaman tambahan & NPS" sub="Metrik internal terpisah dari IKM resmi">
          <table>
            <thead>
              <tr>
                <th>Pertanyaan</th>
                <th>n valid</th>
                <th>Rerata / NPS</th>
              </tr>
            </thead>
            <tbody>
              {a.q.extras.map((x) => {
                const v = a.rows
                  .map((r) => r.extraAnswers[x.id])
                  .filter((v): v is number => typeof v === 'number');
                const score = v.length
                  ? x.kind === 'nps'
                    ? ((v.filter((v) => v >= 9).length - v.filter((v) => v <= 6).length) /
                        v.length) *
                      100
                    : v.reduce((s, v) => s + v, 0) / v.length
                  : null;
                return (
                  <tr key={x.id}>
                    <td>{x.text}</td>
                    <td>{v.length}</td>
                    <td>
                      {displayNumber(score)} {x.kind === 'nps' ? 'NPS (−100 à 100)' : '/ 4'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
      {(mode === 'respons' || mode === 'dashboard') && (
        <Section
          title={mode === 'dashboard' ? 'Respons terbaru' : 'Seluruh respons terfilter'}
          sub="Tanpa nama, nomor rekam medis, atau identitas pasien"
        >
          {mode === 'respons' && (
            <div className="toolbar">
              <label className="search-field">
                Cari komentar
                <input
                  type="search"
                  placeholder="Kata kunci komentar…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setLimit(25);
                  }}
                />
              </label>
              <button onClick={exportCsv}>Ekspor CSV</button>
            </div>
          )}
          {rows.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal lokal</th>
                      <th>Unit pelayanan</th>
                      <th>Versi</th>
                      <th>Ringkasan</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows]
                      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
                      .slice(0, mode === 'dashboard' ? 5 : limit)
                      .map((r) => (
                        <tr key={r.id}>
                          <td>{format(new Date(r.submittedAt), 'dd MMM yyyy, HH:mm')}</td>
                          <td>{r.unitNameSnapshot}</td>
                          <td>{r.surveyVersion}</td>
                          <td>
                            {r.improvementFeedback
                              ? 'Ada masukan perbaikan'
                              : 'Penilaian tersimpan'}
                          </td>
                          <td>
                            <button onClick={() => setDetail(r)}>Lihat jawaban</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {mode === 'respons' && rows.length > limit && (
                <button onClick={() => setLimit((l) => l + 25)}>Muat 25 berikutnya</button>
              )}
              {mode === 'dashboard' && (
                <Link className="table-note text-link" to="/admin/respons">
                  Lihat seluruh respons <ArrowUpRight size={15} />
                </Link>
              )}
            </>
          ) : (
            <Empty />
          )}
        </Section>
      )}
      {mode === 'feedback' && (
        <>
          <Section
            title="Pareto kategori masukan"
            sub="Aturan kata kunci lokal, bukan model AI. Satu kategori utama per komentar; dapat dikoreksi manual."
          >
            {pareto.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Kategori</th>
                    <th>Jumlah</th>
                    <th>Kumulatif</th>
                  </tr>
                </thead>
                <tbody>
                  {pareto.map((p, i) => (
                    <tr key={p.name}>
                      <td>
                        {p.name}
                        <div
                          className="pareto-bar"
                          style={{ width: `${(p.n / complaints.length) * 100}%` }}
                        />
                      </td>
                      <td>{p.n}</td>
                      <td>
                        {displayNumber(
                          (pareto.slice(0, i + 1).reduce((s, p) => s + p.n, 0) /
                            complaints.length) *
                            100,
                          1,
                        )}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty text="Belum ada masukan perbaikan." />
            )}
            <details>
              <summary>Lihat aturan kategorisasi</summary>
              <p>
                Urutan pertama cocok: Waktu Tunggu (tunggu/lama/lambat/antre/antri), Perilaku
                (ramah/sopan/kasar/marah), Informasi (informasi/jelas/bingung/komunikasi), Biaya
                (biaya/tarif/mahal/bayar), Kebersihan (kotor/bersih/toilet/bau), Fasilitas
                (kursi/ruang/parkir/akses/fasilitas), Obat (obat/resep/farmasi), selainnya Lainnya.
              </p>
              <p>
                Keselamatan: jatuh, salah obat, sesak, keselamatan, cedera, pingsan, darah, darurat.
                Label untuk peninjauan manusia saja; bukan diagnosis.
              </p>
            </details>
          </Section>
          <Section
            title="Masukan untuk ditinjau"
            sub="Teks bebas dapat mengandung data pribadi. Hindari menyebarkannya; laporan cetak hanya menampilkan agregat."
          >
            {complaints.map((r) => (
              <article className="feedback-card" key={r.id}>
                <div>
                  <Badge>{r.unitNameSnapshot}</Badge>
                  <small>{format(new Date(r.submittedAt), 'dd MMM yyyy')}</small>
                </div>
                <p>{r.improvementFeedback}</p>
                {safetyFlag(r.improvementFeedback ?? '') && (
                  <p className="error">
                    Perlu peninjauan manusia — kata kunci keselamatan terdeteksi, bukan kesimpulan
                    klinis.
                  </p>
                )}
                <label>
                  Kategori terverifikasi
                  <select
                    value={labelFor(r)}
                    onChange={(e) => {
                      try {
                        a.update((d) => ({
                          ...d,
                          feedbackLabels: [
                            ...d.feedbackLabels.filter((x) => x.responseId !== r.id),
                            {
                              responseId: r.id,
                              category: e.target.value as (typeof categories)[number],
                            },
                          ],
                        }));
                        a.notify('Kategori diperbarui.');
                      } catch {
                        /* Store displays the error. */
                      }
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <Link className="text-link" to="/admin/tindak-lanjut">
                  Buat tindak lanjut <ArrowUpRight size={15} />
                </Link>
              </article>
            ))}
          </Section>
        </>
      )}
      {mode === 'dashboard' && (
        <div className="dashboard-bottom">
          <Notice />
          <p>
            Aktif: {a.data.units.filter((u) => u.isActive).length} unit · {institution}. IKM menilai
            pengalaman pelayanan, bukan hasil klinis.
          </p>
        </div>
      )}
      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <h2>{detail.unitNameSnapshot}</h2>
          <p>
            {detail.id} · {detail.surveyVersion}
          </p>
          <dl className="review-list">
            {elementIds.map((id, i) => (
              <div key={id}>
                <dt>
                  {
                    a.data.questionnaires.find((q) => q.version === detail.surveyVersion)?.core[i]
                      .text
                  }
                </dt>
                <dd>{detail.answers[id] ?? 'Tidak relevan'}</dd>
              </div>
            ))}
          </dl>
          <p>Positif: {detail.positiveFeedback || '—'}</p>
          <p>Perbaikan: {detail.improvementFeedback || '—'}</p>
          <p>Tambahan: {JSON.stringify(detail.extraAnswers)}</p>
        </Modal>
      )}
    </>
  );
}
