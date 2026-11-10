import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCheck,
  ClipboardCheck,
  HeartHandshake,
  LockKeyhole,
  Monitor,
  ShieldCheck,
  Smile,
} from 'lucide-react';
import { Brand, Notice, Badge } from '../components/UI';
import { institution, serviceTypes } from '../data/defaults';
import { useStore } from '../app/Store';
import { answerSchema, elementIds, responseSchema, type SurveyResponse } from '../domain/schema';
const draftSchema = z.object({
  id: z.uuid(),
  version: z.string(),
  unitId: z.string(),
  serviceType: z.string(),
  respondentType: z.enum(['pasien', 'pendamping', 'keluarga']).optional(),
  ageGroup: responseSchema.shape.ageGroup,
  payerGroup: responseSchema.shape.payerGroup,
  answers: z.object(
    Object.fromEntries(elementIds.map((id) => [id, answerSchema.optional()])) as Record<
      (typeof elementIds)[number],
      z.ZodOptional<typeof answerSchema>
    >,
  ),
  extraAnswers: responseSchema.shape.extraAnswers,
  positiveFeedback: z.string().max(500),
  improvementFeedback: z.string().max(500),
  step: z.number().int().min(0).max(11),
});
type Draft = z.infer<typeof draftSchema>;
export function PublicHeader() {
  const { demo } = useStore();
  return (
    <header className="public-header">
      <Brand />
      <div>
        {demo && <Badge tone="gold">DATA SIMULASI</Badge>}
        <Link className="text-link" to="/admin/dashboard">
          Ruang Tim Mutu <ArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}
export function Landing() {
  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">SUARA ANDA, PELAYANAN YANG LEBIH BAIK</span>
            <h1>
              Pengalaman Anda
              <br />
              berarti bagi <em>kami.</em>
            </h1>
            <p>
              Bantu kami memberikan pelayanan yang lebih baik. Sampaikan pengalaman Anda di{' '}
              {institution} melalui survei singkat dan anonim.
            </p>
            <div className="hero-actions">
              <Link className="button primary large" to="/survei">
                Mulai survei <ArrowRight size={19} />
              </Link>
              <Link className="button secondary large" to="/survei?kiosk=1">
                <Monitor size={19} />
                Mode Kiosk
              </Link>
            </div>
            <div className="hero-meta">
              <span>
                <Check size={15} /> Sekitar 2–4 menit
              </span>
              <span>
                <LockKeyhole size={15} /> Tanpa identitas pasien
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-grid" />
            <span className="floating-badge">
              <ShieldCheck size={18} /> Pelayanan berpusat pada pasien
            </span>
            <div className="visual-heart">
              <HeartHandshake size={96} strokeWidth={1.1} />
            </div>
            <div className="visual-card">
              <div className="icon-tile">
                <Smile size={24} />
              </div>
              <div>
                <strong>Setiap suara membawa perubahan</strong>
                <p>Didengar. Dipahami. Ditindaklanjuti.</p>
              </div>
            </div>
            <span className="visual-caption">KOMITMEN MUTU · RSAS</span>
          </div>
        </section>
        <section className="landing-steps">
          <article>
            <span>01</span>
            <h3>Pilih unit pelayanan</h3>
            <p>Pilih tempat Anda menerima pelayanan.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Ceritakan pengalaman Anda</h3>
            <p>Beri penilaian pada 9 unsur pelayanan.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Bantu kami berbenah</h3>
            <p>Masukan menjadi bahan perbaikan mutu.</p>
          </article>
        </section>
        <div className="landing-notice">
          <Notice />
          <p>
            Survei mengukur pengalaman pelayanan, bukan mutu klinis atau hasil medis. Jangan
            cantumkan nama, NIK, nomor rekam medis, diagnosis, atau nomor telepon.
          </p>
        </div>
      </main>
      <footer className="public-footer">RSAS-SATISFACTION · {institution}</footer>
    </div>
  );
}
export function Survey() {
  const { data, demo, update, notify } = useStore();
  const { slug } = useParams();
  const [params] = useSearchParams();
  const kiosk = params.get('kiosk') === '1' || data.settings.kiosk;
  const key = `rsas.skm.v1.${demo ? 'demo.' : ''}draft`;
  const selected = slug ? data.units.find((u) => u.slug === slug && u.isActive) : undefined;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = draftSchema.parse(JSON.parse(raw));
        if (
          data.questionnaires.some((q) => q.version === saved.version) &&
          (!slug || saved.unitId === selected?.id)
        )
          return saved;
      }
    } catch {
      /* Invalid drafts never replace validated response data. */
    }
    return fresh();
  });
  function fresh(): Draft {
    return {
      id: crypto.randomUUID(),
      version: data.questionnaires.at(-1)!.version,
      unitId: selected?.id ?? '',
      serviceType: selected?.serviceTypes[0] ?? '',
      answers: {},
      extraAnswers: {},
      positiveFeedback: '',
      improvementFeedback: '',
      step: 0,
    };
  }
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const q = data.questionnaires.find((q) => q.version === draft.version)!;
  const unit = data.units.find((u) => u.id === draft.unitId && u.isActive);
  const extras = q.extras.filter(
    (x) => x.isActive && (!x.unitIds.length || x.unitIds.includes(draft.unitId)),
  );
  const core = q.core[draft.step - 1];
  useEffect(() => {
    if (done) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      setError(
        'Brouser tidak dapat menyimpan draf. Jangan tutup halaman; periksa kapasitas penyimpanan sebelum mengirim.',
      );
    }
  }, [draft, key, done]);
  useEffect(() => {
    document.getElementById('survey-heading')?.focus();
  }, [draft.step, done]);
  function change(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
    setError('');
  }
  function next() {
    if (draft.step === 0 && (!unit || !draft.serviceType)) {
      setError('Pilih unit aktif dan jenis layanan.');
      return;
    }
    if (draft.step >= 1 && draft.step <= 9 && draft.answers[core.id] === undefined) {
      setError('Pilih satu jawaban sebelum melanjutkan.');
      return;
    }
    if (draft.step === 10 && extras.some((x) => x.required && draft.extraAnswers[x.id] == null)) {
      setError('Lengkapi pertanyaan tambahan wajib.');
      return;
    }
    change({ step: draft.step + 1 });
  }
  function submit() {
    if (saving) return;
    if (!consent) {
      setError('Baca dan setujui pemberitahuan privasi untuk mengirim.');
      return;
    }
    setSaving(true);
    try {
      if (!unit) throw Error('Unit sudah tidak aktif. Pilih unit kembali.');
      const response = responseSchema.parse({
        id: draft.id,
        surveyVersion: draft.version,
        unitId: unit.id,
        unitNameSnapshot: unit.name,
        serviceType: draft.serviceType,
        respondentType: draft.respondentType,
        ageGroup: draft.ageGroup,
        payerGroup: draft.payerGroup,
        answers: draft.answers,
        extraAnswers: draft.extraAnswers,
        positiveFeedback: draft.positiveFeedback.trim(),
        improvementFeedback: draft.improvementFeedback.trim(),
        submittedAt: new Date().toISOString(),
        sourceInstanceId: data.sourceInstanceId,
        isDemo: demo,
      });
      update((d) => {
        if (d.responses.some((r) => r.id === response.id))
          throw Error('Respons ini sudah dikirim. Mulai survei baru untuk pengisian berikutnya.');
        d.responses.push(response as SurveyResponse);
        return d;
      });
      setDone(true);
      try {
        localStorage.removeItem(key);
      } catch {
        /* The saved UUID still prevents resubmission. */
      }
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? 'Jawaban belum lengkap. Periksa kembali seluruh unsur.'
          : (e as Error).message,
      );
    } finally {
      setSaving(false);
    }
  }
  if (slug && !selected)
    return (
      <div className="public-page">
        <PublicHeader />
        <main className="survey-shell card">
          <h1>Unit tidak tersedia</h1>
          <p>Tautan tidak valid atau unit sudah tidak aktif.</p>
          <Link to="/survei" className="button primary">
            Pilih unit lain
          </Link>
        </main>
      </div>
    );
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="survey-shell">
        {demo && (
          <div className="demo-banner">DATA SIMULASI — jawaban tidak masuk data operasional.</div>
        )}
        {kiosk && <Badge tone="green">MODE KIOSK / TABLET RSAS</Badge>}
        {done ? (
          <div className="card thanks">
            <span className="success-icon">
              <CheckCheck size={42} />
            </span>
            <h1 id="survey-heading" tabIndex={-1}>
              Terima kasih atas suara Anda.
            </h1>
            <p>Jawaban berhasil disimpan di perangkat ini dan membantu perbaikan pelayanan RSAS.</p>
            <Notice />
            <button
              className="primary large"
              onClick={() => {
                setDone(false);
                setDraft(fresh());
                setConsent(false);
                notify('Survei baru siap diisi.');
              }}
            >
              Survei baru <ArrowRight size={18} />
            </button>
            <Link to="/">Kembali ke beranda</Link>
          </div>
        ) : (
          <>
            <div className="survey-intro">
              <span className="eyebrow">SURVEI KEPUASAN PASIEN</span>
              <h1 id="survey-heading" tabIndex={-1}>
                {draft.step === 0
                  ? 'Mari mulai dari pelayanan Anda.'
                  : draft.step <= 9
                    ? 'Bagaimana pengalaman Anda?'
                    : draft.step === 10
                      ? 'Sedikit lagi, suara Anda berarti.'
                      : 'Tinjau penilaian Anda.'}
              </h1>
              <p>{institution}</p>
            </div>
            <div className="survey-progress">
              <span>
                {draft.step >= 1 && draft.step <= 9
                  ? `Unsur ${draft.step} dari 9`
                  : draft.step === 0
                    ? 'Informasi pelayanan'
                    : draft.step === 10
                      ? 'Pengalaman tambahan'
                      : 'Tinjau & kirim'}
              </span>
              <span>Draf otomatis di perangkat ini</span>
              <progress aria-label="Progres survei" value={draft.step} max={11} />
            </div>
            <section className="card survey-card">
              {draft.step === 0 ? (
                <>
                  <div className="question-icon">
                    <ClipboardCheck />
                  </div>
                  <h2>Unit mana yang Anda kunjungi?</h2>
                  <div className="form-grid">
                    <label>
                      Unit pelayanan *
                      <select
                        value={draft.unitId}
                        disabled={!!selected}
                        onChange={(e) => {
                          const u = data.units.find((u) => u.id === e.target.value);
                          change({ unitId: e.target.value, serviceType: u?.serviceTypes[0] ?? '' });
                        }}
                      >
                        <option value="">Pilih unit pelayanan</option>
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
                      Jenis layanan *
                      <select
                        value={draft.serviceType}
                        onChange={(e) => change({ serviceType: e.target.value })}
                      >
                        <option value="">Pilih layanan</option>
                        {(unit?.serviceTypes ?? serviceTypes).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Yang mengisi (opsional)
                      <select
                        value={draft.respondentType ?? ''}
                        onChange={(e) =>
                          change({
                            respondentType: (e.target.value ||
                              undefined) as Draft['respondentType'],
                          })
                        }
                      >
                        <option value="">Tidak menjawab</option>
                        <option value="pasien">Pasien</option>
                        <option value="pendamping">Pendamping</option>
                        <option value="keluarga">Keluarga</option>
                      </select>
                    </label>
                    <label>
                      Kelompok umur (opsional)
                      <select
                        value={draft.ageGroup ?? ''}
                        onChange={(e) => change({ ageGroup: e.target.value as Draft['ageGroup'] })}
                      >
                        <option value="">Tidak menjawab</option>
                        {['<18 via pendamping', '18–24', '25–34', '35–44', '45–59', '≥60'].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Penjamin (opsional)
                      <select
                        value={draft.payerGroup ?? ''}
                        onChange={(e) =>
                          change({ payerGroup: e.target.value as Draft['payerGroup'] })
                        }
                      >
                        <option value="">Tidak menjawab</option>
                        {['BPJS', 'Umum', 'Asuransi Lain'].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Notice>
                    {data.settings.notice} Pengisian di ponsel lain tidak dikirim ke dashboard
                    pusat.
                  </Notice>
                </>
              ) : draft.step <= 9 ? (
                <>
                  <Badge tone="green">
                    {core.id} · {core.label}
                  </Badge>
                  <fieldset className="rating-fieldset">
                    <legend>{core.text}</legend>
                    {core.options.map((label, i) => (
                      <label
                        className={`rating-option ${draft.answers[core.id] === i + 1 ? 'selected' : ''}`}
                        key={label}
                      >
                        <input
                          type="radio"
                          name={core.id}
                          checked={draft.answers[core.id] === i + 1}
                          onChange={() =>
                            change({ answers: { ...draft.answers, [core.id]: i + 1 } })
                          }
                        />
                        <span className="score-number">{i + 1}</span>
                        <span>{label}</span>
                        {draft.answers[core.id] === i + 1 && <Check size={20} />}
                      </label>
                    ))}
                    {core.allowNull && (
                      <label
                        className={`rating-option ${draft.answers[core.id] === null ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={core.id}
                          checked={draft.answers[core.id] === null}
                          onChange={() =>
                            change({ answers: { ...draft.answers, [core.id]: null } })
                          }
                        />
                        <span>Tidak mengetahui / tidak relevan</span>
                      </label>
                    )}
                  </fieldset>
                </>
              ) : draft.step === 10 ? (
                <>
                  <h2>Pengalaman tambahan</h2>
                  <p className="muted">
                    Metrik terpisah; tidak mengubah IKM. Skala 1 sangat kurang sampai 4 sangat baik,
                    atau NPS 0–10.
                  </p>
                  {extras.map((x) => (
                    <label key={x.id} className="extra-field">
                      {x.text} {x.required ? '*' : '(opsional)'}
                      <select
                        value={draft.extraAnswers[x.id] ?? ''}
                        onChange={(e) =>
                          change({
                            extraAnswers: {
                              ...draft.extraAnswers,
                              [x.id]: e.target.value === '' ? null : Number(e.target.value),
                            },
                          })
                        }
                      >
                        <option value="">Tidak menjawab</option>
                        {Array.from(
                          { length: x.kind === 'nps' ? 11 : 4 },
                          (_, i) => i + (x.kind === 'nps' ? 0 : 1),
                        ).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <div className="notice">
                    Jangan tuliskan nama, NIK, nomor rekam medis, diagnosis, atau data pribadi.
                  </div>
                  <label>
                    Apa yang sudah baik? (opsional)
                    <textarea
                      maxLength={500}
                      value={draft.positiveFeedback}
                      onChange={(e) => change({ positiveFeedback: e.target.value })}
                    />
                    <small>{draft.positiveFeedback.length}/500</small>
                  </label>
                  <label>
                    Apa yang perlu diperbaiki? (opsional)
                    <textarea
                      maxLength={500}
                      value={draft.improvementFeedback}
                      onChange={(e) => change({ improvementFeedback: e.target.value })}
                    />
                    <small>{draft.improvementFeedback.length}/500</small>
                  </label>
                </>
              ) : (
                <>
                  <h2>
                    {unit?.name} · {draft.serviceType}
                  </h2>
                  <p>Kuesioner {draft.version}. Anda dapat kembali untuk mengubah jawaban.</p>
                  <dl className="review-list">
                    {q.core.map((x) => (
                      <div key={x.id}>
                        <dt>
                          {x.id} · {x.label}
                        </dt>
                        <dd>
                          {draft.answers[x.id] === null
                            ? 'Tidak relevan'
                            : x.options[(draft.answers[x.id] ?? 1) - 1]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {extras.map((x) => (
                    <p key={x.id}>
                      {x.text}: <strong>{draft.extraAnswers[x.id] ?? 'Tidak menjawab'}</strong>
                    </p>
                  ))}
                  {draft.positiveFeedback && <p>Sudah baik: {draft.positiveFeedback}</p>}
                  {draft.improvementFeedback && (
                    <p>Perlu diperbaiki: {draft.improvementFeedback}</p>
                  )}
                  <Notice>{data.settings.notice}</Notice>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    Saya memahami pemberitahuan privasi dan bersedia mengirim jawaban anonim.
                  </label>
                </>
              )}
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="survey-controls">
                <button
                  disabled={draft.step === 0}
                  onClick={() => change({ step: draft.step - 1 })}
                >
                  <ArrowLeft size={17} />
                  Sebelumnya
                </button>
                {draft.step < 11 ? (
                  <button className="primary" onClick={next}>
                    Berikutnya <ArrowRight size={17} />
                  </button>
                ) : (
                  <button className="primary" disabled={saving} onClick={submit}>
                    {saving ? 'Menyimpan…' : 'Kirim penilaian'}
                    <Check size={18} />
                  </button>
                )}
              </div>
            </section>
            <p className="survey-footnote">
              <ShieldCheck size={14} /> Anonim · Tanpa identitas pasien · Tersimpan lokal
            </p>
          </>
        )}
      </main>
      <footer className="public-footer">{institution} · RSAS-SATISFACTION</footer>
    </div>
  );
}
