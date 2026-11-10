import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  CircleUserRound,
  Layers3,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Analysis } from '../hooks/useAnalysis';
import { Badge, Empty, Section } from './UI';
import {
  aggregateResponses,
  calculateResponseRate,
  displayNumber,
  getTrends,
  getPriorityElements,
} from '../domain/analytics';
export const colors = ['#BD5A55', '#D5AD60', '#51ABA0', '#087F75'];
export function Filters({ a }: { a: Analysis }) {
  return (
    <div className="filters no-print">
      <div className="filter-unit">
        <Layers3 size={17} />
        <label>
          <span className="sr-only">Filter unit</span>
          <select
            value={a.filter.unitId}
            onChange={(e) => a.setFilter((f) => ({ ...f, unitId: e.target.value }))}
          >
            <option value="">Semua unit pelayanan</option>
            {a.data.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {!u.isActive ? ' (nonaktif)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className="sr-only">Preset periode</span>
        <select value={a.period} onChange={(e) => a.preset(e.target.value)}>
          <option value="month">Bulan ini</option>
          <option value="quarter">Triwulan ini</option>
          <option value="year">Tahun ini</option>
          <option value="all">Semua periode</option>
          <option value="custom">Rentang khusus</option>
        </select>
      </label>
      <div className="date-filter">
        <CalendarDays size={16} />
        <label>
          <span className="sr-only">Tanggal mulai</span>
          <input
            aria-label="Tanggal mulai"
            type="date"
            value={a.filter.from}
            onChange={(e) => {
              a.preset('custom');
              a.setFilter((f) => ({ ...f, from: e.target.value }));
            }}
          />
        </label>
        <span>—</span>
        <label>
          <span className="sr-only">Tanggal akhir</span>
          <input
            aria-label="Tanggal akhir"
            type="date"
            value={a.filter.to}
            min={a.filter.from}
            onChange={(e) => {
              a.preset('custom');
              a.setFilter((f) => ({ ...f, to: e.target.value }));
            }}
          />
        </label>
      </div>
      <label>
        <span className="sr-only">Versi kuesioner</span>
        <select
          aria-label="Versi kuesioner"
          value={a.filter.version}
          onChange={(e) => a.setFilter((f) => ({ ...f, version: e.target.value }))}
        >
          {a.data.questionnaires.map((q) => (
            <option key={q.version}>{q.version}</option>
          ))}
        </select>
      </label>
      {a.filter.from > a.filter.to && a.filter.to && (
        <p role="alert" className="error">
          Tanggal akhir harus setelah tanggal mulai.
        </p>
      )}
    </div>
  );
}
export function Kpis({ a }: { a: Analysis }) {
  const lowest = getPriorityElements(a.rows)[0];
  const delta =
    a.stats.ikm !== null && a.previous?.ikm != null ? a.stats.ikm - a.previous.ikm : null;
  const cards = [
    {
      title: 'Indeks Kepuasan Masyarakat',
      value: displayNumber(a.stats.ikm),
      suffix: '/ 100',
      icon: TrendingUp,
      desc:
        a.stats.ikm === null
          ? 'Data belum cukup / tidak lengkap'
          : `Mutu ${a.stats.grade} · IKM gabungan respons`,
      featured: true,
    },
    {
      title: 'Respons terkumpul',
      value: String(a.stats.n),
      suffix: 'respons',
      icon: CircleUserRound,
      desc:
        a.stats.n > 0 && a.stats.n < 30
          ? 'Sampel kecil; interpretasi hati-hati'
          : 'Dalam periode & versi terpilih',
    },
    {
      title: 'Penilaian positif',
      value: displayNumber(a.stats.positiveRate, 1),
      suffix: '%',
      icon: ChartNoAxesCombined,
      desc: 'Rating 3–4 · metrik internal',
    },
    {
      title: 'Unsur prioritas',
      value: lowest?.id ?? '—',
      suffix: lowest ? `${displayNumber(lowest.mean)} / 4` : '',
      icon: Target,
      desc: lowest ? a.q.core.find((q) => q.id === lowest.id)!.label : 'Belum ada jawaban valid',
    },
  ];
  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <article key={c.title} className={`kpi-card ${c.featured ? 'featured' : ''}`}>
          <div className="kpi-label">
            {c.title}
            <c.icon size={18} />
          </div>
          <div className="kpi-value">
            {c.value}
            <span>{c.suffix}</span>
          </div>
          <p>{c.desc}</p>
          {c.featured && delta !== null && (
            <span className="delta">
              {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDown size={14} />}{' '}
              {displayNumber(Math.abs(delta))} poin vs periode sebelumnya
            </span>
          )}
        </article>
      ))}
    </div>
  );
}
export function Charts({ a }: { a: Analysis }) {
  if (!a.rows.length)
    return (
      <Section title="Perjalanan mutu dimulai dari satu suara">
        <Empty />
      </Section>
    );
  const trends = getTrends(a.rows, a.trendPeriod, a.q.weights);
  return (
    <>
      <div className="chart-grid">
        <Section title="Tren kepuasan pasien" sub="IKM gabungan berdasarkan waktu pengisian">
          <div className="chart-toolbar">
            <Badge tone="green">Skala 25–100</Badge>
            <select
              aria-label="Interval tren"
              value={a.trendPeriod}
              onChange={(e) => a.setTrendPeriod(e.target.value as Analysis['trendPeriod'])}
            >
              <option value="day">Harian</option>
              <option value="week">Mingguan</option>
              <option value="month">Bulanan</option>
            </select>
          </div>
          <div
            className="chart"
            role="img"
            aria-label="Grafik tren IKM, angka tersedia dalam tabel tren"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 12, right: 14, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e8edef" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => String(v).slice(5)}
                />
                <YAxis domain={[25, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="ikm"
                  name="IKM"
                  stroke="#087F75"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#087F75' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details>
            <summary>Tabel angka tren</summary>
            <table>
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>n</th>
                  <th>IKM</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t) => (
                  <tr key={t.date}>
                    <td>{t.date}</td>
                    <td>{t.n}</td>
                    <td>{displayNumber(t.ikm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Section>
        <Section title="Distribusi penilaian" sub="Seluruh jawaban valid U1–U9">
          <div
            className="donut-wrap"
            role="img"
            aria-label="Distribusi skor; jumlah tersedia di legenda"
          >
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={a.stats.distribution}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {colors.map((c) => (
                    <Cell key={c} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{displayNumber(a.stats.positiveRate, 1)}%</strong>
              <span>rating 3–4</span>
            </div>
          </div>
          <div className="legend">
            {a.stats.distribution.map((x, i) => (
              <span key={x.name}>
                <i style={{ background: colors[i] }} />
                {x.name}
                <strong>{x.value}</strong>
              </span>
            ))}
          </div>
        </Section>
      </div>
      <Section
        title="Sembilan unsur pelayanan"
        sub="Rata-rata setiap unsur · skala 1–4 · null dikecualikan"
      >
        <div
          className="chart"
          role="img"
          aria-label="Grafik rata-rata unsur; angka tersedia dalam tabel indikator"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.stats.elements} margin={{ left: -25, right: 10, top: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="id" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 4]} />
              <Tooltip />
              <Bar
                isAnimationActive={false}
                dataKey="mean"
                name="Rata-rata"
                fill="#087F75"
                radius={[5, 5, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </>
  );
}
export function UnitTable({ a, heatmap = false }: { a: Analysis; heatmap?: boolean }) {
  const units = a.data.units
    .filter((u) => !a.filter.unitId || u.id === a.filter.unitId)
    .map((u) => ({
      ...u,
      stats: aggregateResponses(
        a.rows.filter((r) => r.unitId === u.id),
        a.q.weights,
      ),
    }));
  const sufficient = units
    .filter((u) => u.stats.n >= 30 && u.stats.ikm !== null)
    .sort((a, b) => b.stats.ikm! - a.stats.ikm!);
  const avg = units.filter((u) => u.stats.ikm !== null);
  return (
    <Section
      title={heatmap ? 'Peta indikator antarunit' : 'Kinerja unit pelayanan'}
      sub="Peringkat hanya untuk unit dengan n ≥ 30 (heuristik internal)"
    >
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Unit pelayanan</th>
              <th>n</th>
              {heatmap ? (
                a.q.core.map((q) => (
                  <th key={q.id} title={q.label}>
                    {q.id}
                  </th>
                ))
              ) : (
                <>
                  <th>IKM</th>
                  <th>Mutu</th>
                  <th>Target lokal</th>
                  <th>Status sampel</th>
                  <th>Peringkat</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id}>
                <td>
                  <button
                    className="table-link"
                    onClick={() => a.setFilter((f) => ({ ...f, unitId: u.id }))}
                  >
                    {u.name}
                  </button>
                  <small>
                    {u.category}
                    {!u.isActive ? ' · nonaktif' : ''}
                  </small>
                </td>
                <td>{u.stats.n}</td>
                {heatmap ? (
                  u.stats.elements.map((x) => (
                    <td
                      key={x.id}
                      style={{
                        background:
                          x.mean === null ? 'transparent' : x.mean < 3 ? '#fbefdf' : '#e9f4f1',
                      }}
                    >
                      {displayNumber(x.mean)}
                      <small>n={x.validResponseCount}</small>
                    </td>
                  ))
                ) : (
                  <>
                    <td className="strong">{displayNumber(u.stats.ikm)}</td>
                    <td>
                      <Badge tone={u.stats.grade === 'A' ? 'green' : ''}>
                        {u.stats.grade ?? '—'}
                      </Badge>
                    </td>
                    <td>{displayNumber(u.targetIkm)}</td>
                    <td>
                      {u.stats.n === 0 ? (
                        'Belum ada data'
                      ) : u.stats.n < 30 ? (
                        <Badge tone="gold">Sampel kecil</Badge>
                      ) : (
                        <Badge tone="green">n ≥ 30</Badge>
                      )}
                    </td>
                    <td>
                      {sufficient.some((x) => x.id === u.id)
                        ? sufficient.findIndex((x) => x.id === u.id) + 1
                        : '—'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Rata-rata IKM unit:{' '}
        {displayNumber(avg.length ? avg.reduce((s, u) => s + u.stats.ikm!, 0) / avg.length : null)}{' '}
        · {avg.length}/{units.length} unit memiliki IKM lengkap. Berbeda dari IKM gabungan respons:{' '}
        {displayNumber(a.stats.ikm)}.
      </p>
    </Section>
  );
}
export function ElementTable({ a }: { a: Analysis }) {
  return (
    <Section title="Rincian indikator" sub="Jumlah jawaban valid dapat berbeda pada U4 dan U8">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Unsur</th>
              <th>Rata-rata</th>
              <th>n valid</th>
              {[1, 2, 3, 4].map((score) => (
                <th key={score}>Skor {score}</th>
              ))}
              <th>Bobot</th>
              <th>Kontribusi IKM</th>
            </tr>
          </thead>
          <tbody>
            {a.stats.elements.map((x, i) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.id}</strong> · {a.q.core[i].label}
                </td>
                <td>{displayNumber(x.mean)}</td>
                <td>{x.validResponseCount}</td>
                {[1, 2, 3, 4].map((score) => (
                  <td key={score}>{a.rows.filter((r) => r.answers[x.id] === score).length}</td>
                ))}
                <td>{displayNumber(a.q.weights[i] * 100, 4)}%</td>
                <td>{displayNumber(x.mean === null ? null : x.mean * a.q.weights[i] * 25)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
export function Volumes({ a }: { a: Analysis }) {
  const v = a.data.manualVolumes.filter(
    (v) =>
      (!a.filter.unitId || v.unitId === a.filter.unitId) &&
      v.from === a.filter.from &&
      v.to === a.filter.to,
  );
  return (
    <Section
      title="Cakupan respons"
      sub="Denominator manual; hanya volume dengan rentang tanggal yang sama persis"
    >
      {v.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Survei valid</th>
                <th>Kunjungan memenuhi kriteria</th>
                <th>Response rate</th>
                <th>Definisi denominator</th>
              </tr>
            </thead>
            <tbody>
              {v.map((x) => {
                const n = a.rows.filter((r) => r.unitId === x.unitId).length;
                return (
                  <tr key={x.id}>
                    <td>{a.data.units.find((u) => u.id === x.unitId)?.name}</td>
                    <td>{n}</td>
                    <td>{x.visits}</td>
                    <td>
                      {displayNumber(calculateResponseRate(n, x.visits))}%
                      {n > x.visits && (
                        <small className="error">
                          Periksa denominator: survei melebihi kunjungan.
                        </small>
                      )}
                    </td>
                    <td>{x.definition}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">
          Jumlah kunjungan belum tersedia untuk periode ini. Response rate tidak dihitung. Tambahkan
          denominator di Pengaturan.
        </p>
      )}
    </Section>
  );
}
