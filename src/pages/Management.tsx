import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Plus, Save, ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../app/Store';
import { Badge, Notice, PageTitle, Section } from '../components/UI';
import {
  actionSchema,
  elementIds,
  questionnaireSchema,
  unitSchema,
  type Action,
  type Questionnaire,
  type Unit,
} from '../domain/schema';
import { serviceTypes } from '../data/defaults';
export function UnitsPage() {
  const { data, update, notify } = useStore();
  const [editing, setEditing] = useState<Unit | null>(null);
  const [error, setError] = useState('');
  function create() {
    setEditing({
      id: crypto.randomUUID(),
      name: '',
      slug: '',
      code: '',
      category: 'Pelayanan Utama',
      isActive: true,
      parentId: null,
      targetIkm: 88.31,
      serviceTypes: [serviceTypes[0]],
      description: '',
      createdAt: new Date().toISOString(),
    });
    setError('');
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      const u = unitSchema.parse(editing);
      if (data.units.some((x) => x.id !== u.id && x.slug === u.slug))
        throw Error('Slug harus unik.');
      let parent = u.parentId;
      const visited = new Set([u.id]);
      while (parent) {
        if (visited.has(parent)) throw Error('Hubungan induk unit tidak boleh membentuk siklus.');
        visited.add(parent);
        parent = data.units.find((x) => x.id === parent)?.parentId ?? null;
      }
      if (
        !confirm(
          'Simpan perubahan unit dan target lokal? Respons lama tetap memakai snapshot nama saat pengisian. Perubahan slug akan mengubah tautan/QR.',
        )
      )
        return;
      update((d) => ({ ...d, units: [...d.units.filter((x) => x.id !== u.id), u] }));
      setEditing(null);
      notify('Master unit tersimpan.');
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'ZodError'
          ? 'Lengkapi kolom, slug huruf kecil, dan target 25–100.'
          : (e as Error).message,
      );
    }
  }
  return (
    <>
      <PageTitle
        title="Master unit pelayanan"
        description="Kelola unit, subunit, layanan, dan target perbaikan internal RSAS."
        action={
          <button className="primary" onClick={create}>
            <Plus size={17} />
            Tambah unit
          </button>
        }
      />
      <Section
        title="Daftar unit"
        sub="Unit yang memiliki respons historis dinonaktifkan, bukan dihapus."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Unit / kode</th>
                <th>Slug tetap</th>
                <th>Kategori / induk</th>
                <th>Target IKM</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.units.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{u.code}</small>
                  </td>
                  <td>{u.slug}</td>
                  <td>
                    {u.category}
                    <small>{data.units.find((p) => p.id === u.parentId)?.name}</small>
                  </td>
                  <td>{u.targetIkm}</td>
                  <td>
                    <Badge tone={u.isActive ? 'green' : ''}>
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setEditing(structuredClone(u));
                        setError('');
                      }}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {editing && (
        <Section title={data.units.some((u) => u.id === editing.id) ? 'Edit unit' : 'Unit baru'}>
          <form onSubmit={save} className="form-grid">
            <label>
              Nama unit *
              <input
                required
                maxLength={100}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <label>
              Kode *
              <input
                required
                maxLength={20}
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
              />
            </label>
            <label>
              Slug unik *
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={70}
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </label>
            <label>
              Kategori *
              <input
                required
                maxLength={80}
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              />
            </label>
            <label>
              Induk unit
              <select
                value={editing.parentId ?? ''}
                onChange={(e) => setEditing({ ...editing, parentId: e.target.value || null })}
              >
                <option value="">Tidak ada — unit utama</option>
                {data.units
                  .filter((u) => u.id !== editing.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Target IKM internal *
              <input
                type="number"
                min={25}
                max={100}
                step="0.01"
                required
                value={editing.targetIkm}
                onChange={(e) => setEditing({ ...editing, targetIkm: Number(e.target.value) })}
              />
            </label>
            <label>
              Jenis layanan (pisahkan koma) *
              <input
                required
                value={editing.serviceTypes.join(', ')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    serviceTypes: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
              />
            </label>
            <label>
              Deskripsi
              <textarea
                maxLength={500}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              />
              Unit aktif menerima survei
            </label>
            <div className="form-actions">
              <button className="primary" type="submit">
                <Save size={16} />
                Simpan unit
              </button>
              <button type="button" onClick={() => setEditing(null)}>
                Batal
              </button>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        </Section>
      )}
    </>
  );
}
export function QuestionsPage() {
  const { data, update, notify } = useStore();
  const [draft, setDraft] = useState<Questionnaire>(() =>
    structuredClone(data.questionnaires.at(-1)!),
  );
  const [error, setError] = useState('');
  function save() {
    try {
      const q = questionnaireSchema.parse({
        ...draft,
        version: `SKM-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        createdAt: new Date().toISOString(),
      });
      if (
        !confirm(
          'Buat versi kuesioner baru? Perubahan teks inti atau bobot dapat mempengaruhi keterbandingan IKM. Snapshot versi lama tetap tersimpan.',
        )
      )
        return;
      update((d) => ({ ...d, questionnaires: [...d.questionnaires, q] }));
      setDraft(q);
      notify('Versi kuesioner baru tersimpan. Survei baru akan menggunakannya.');
      setError('');
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'ZodError'
          ? 'Periksa semua teks, pilihan, dan total bobot harus 1.'
          : (e as Error).message,
      );
    }
  }
  return (
    <>
      <PageTitle
        title="Kuesioner & metodologi"
        description={`Versi aktif ${data.questionnaires.at(-1)!.version}. Versi lama dan snapshot jawaban dipertahankan.`}
        action={
          <button className="primary" onClick={save}>
            <Save size={16} />
            Simpan versi baru
          </button>
        }
      />
      <Notice>
        U1–U9 dan aturan null tetap. Mengubah teks inti atau bobot mengubah metodologi dan
        keterbandingan. Analisis selalu dipisahkan berdasarkan versi kuesioner.
      </Notice>
      <Section
        title="Sembilan unsur inti"
        sub="Bobot default 1/9 dengan presisi penuh, bukan 0,11 × 9."
      >
        {draft.core.map((q, i) => (
          <div className="question-editor" key={q.id}>
            <Badge>{q.id}</Badge>
            <label>
              Teks pertanyaan
              <input
                maxLength={500}
                value={q.text}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    core: d.core.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                  }))
                }
              />
            </label>
            <div className="form-grid">
              {q.options.map((v, j) => (
                <label key={j}>
                  Pilihan {j + 1}
                  <input
                    value={v}
                    maxLength={100}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        core: d.core.map((x, k) =>
                          k === i
                            ? {
                                ...x,
                                options: x.options.map((o, l) => (l === j ? e.target.value : o)),
                              }
                            : x,
                        ),
                      }))
                    }
                  />
                </label>
              ))}
              <label>
                Bobot (0–1)
                <input
                  type="number"
                  min={0}
                  max={1}
                  step="any"
                  value={draft.weights[i]}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      weights: d.weights.map((w, j) => (j === i ? Number(e.target.value) : w)),
                    }))
                  }
                />
              </label>
            </div>
          </div>
        ))}
        <button onClick={() => setDraft((d) => ({ ...d, weights: Array(9).fill(1 / 9) }))}>
          Kembalikan bobot sama (1/9)
        </button>
        <p>Total bobot: {draft.weights.reduce((a, b) => a + b, 0)}</p>
      </Section>
      <Section
        title="Pertanyaan pengalaman tambahan"
        sub="Terpisah dari IKM · urutan dapat diubah · konteks unit opsional"
      >
        {draft.extras.map((q, i) => (
          <div className="question-editor" key={q.id}>
            <label>
              Teks pertanyaan tambahan
              <input
                value={q.text}
                maxLength={250}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    extras: d.extras.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                  }))
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Skala
                <select
                  value={q.kind}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      extras: d.extras.map((x, j) =>
                        j === i ? { ...x, kind: e.target.value as 'rating' | 'nps' } : x,
                      ),
                    }))
                  }
                >
                  <option value="rating">Rating 1–4</option>
                  <option value="nps">NPS 0–10</option>
                </select>
              </label>
              <label>
                Konteks unit
                <select
                  value={q.unitIds[0] ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      extras: d.extras.map((x, j) =>
                        j === i ? { ...x, unitIds: e.target.value ? [e.target.value] : [] } : x,
                      ),
                    }))
                  }
                >
                  <option value="">Semua unit</option>
                  {data.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      extras: d.extras.map((x, j) =>
                        j === i ? { ...x, required: e.target.checked } : x,
                      ),
                    }))
                  }
                />
                Wajib
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={q.isActive}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      extras: d.extras.map((x, j) =>
                        j === i ? { ...x, isActive: e.target.checked } : x,
                      ),
                    }))
                  }
                />
                Aktif
              </label>
            </div>
            <div className="toolbar">
              <button
                aria-label={`Naikkan pertanyaan ${i + 1}`}
                disabled={i === 0}
                onClick={() =>
                  setDraft((d) => {
                    const extras = [...d.extras];
                    [extras[i - 1], extras[i]] = [extras[i], extras[i - 1]];
                    return { ...d, extras };
                  })
                }
              >
                <ArrowUp size={16} />
              </button>
              <button
                aria-label={`Turunkan pertanyaan ${i + 1}`}
                disabled={i === draft.extras.length - 1}
                onClick={() =>
                  setDraft((d) => {
                    const extras = [...d.extras];
                    [extras[i], extras[i + 1]] = [extras[i + 1], extras[i]];
                    return { ...d, extras };
                  })
                }
              >
                <ArrowDown size={16} />
              </button>
              <button
                onClick={() =>
                  setDraft((d) => ({ ...d, extras: d.extras.filter((x) => x.id !== q.id) }))
                }
              >
                <Trash2 size={15} />
                Hapus dari versi baru
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() =>
            setDraft((d) => ({
              ...d,
              extras: [
                ...d.extras,
                {
                  id: crypto.randomUUID(),
                  text: 'Pertanyaan baru',
                  kind: 'rating',
                  unitIds: [],
                  required: false,
                  isActive: true,
                },
              ],
            }))
          }
        >
          <Plus size={16} />
          Tambah pertanyaan
        </button>
      </Section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" onClick={save}>
        Simpan versi baru
      </button>
    </>
  );
}
export function ActionsPage() {
  const { data, update, notify } = useStore();
  const [draft, setDraft] = useState<Action | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const today = format(new Date(), 'yyyy-MM-dd');
  function save(e: FormEvent) {
    e.preventDefault();
    try {
      const action = actionSchema.parse(draft);
      const previous = data.actions.find((x) => x.id === action.id);
      action.audit = [
        ...action.audit,
        {
          at: new Date().toISOString(),
          note: `${previous ? 'Diperbarui' : 'Dibuat'}: status ${action.status}; prioritas ${action.priority}.`,
        },
      ];
      update((d) => ({ ...d, actions: [...d.actions.filter((x) => x.id !== action.id), action] }));
      setDraft(null);
      notify('Tindak lanjut tersimpan pada perangkat ini.');
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'ZodError'
          ? 'Lengkapi judul, unsur, dan tanggal target.'
          : (e as Error).message,
      );
    }
  }
  return (
    <>
      <PageTitle
        title="Rencana tindak lanjut"
        description="Dari masukan menjadi perbaikan. Catatan PDSA dan audit lokal perangkat ini."
        action={
          <button
            className="primary"
            onClick={() => {
              setError('');
              setDraft({
                id: crypto.randomUUID(),
                title: '',
                unitId: null,
                element: 'U3',
                evidence: '',
                priority: 'Sedang',
                pic: '',
                dueDate: today,
                status: 'Baru',
                pdsa: '',
                reviewDate: '',
                audit: [],
              });
            }}
          >
            <Plus size={17} />
            Buat tindak lanjut
          </button>
        }
      />
      <Notice>
        PIC cukup nama jabatan. Hindari identitas pasien dan rincian sensitif dalam bukti atau
        catatan. Audit lokal dapat diubah pengguna browser; bukan audit yang tahan manipulasi.
      </Notice>
      <Section title="Daftar perbaikan">
        <label>
          Filter status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status</option>
            {['Baru', 'Proses', 'Selesai', 'Verifikasi'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Masalah</th>
                <th>Unit / unsur</th>
                <th>Prioritas</th>
                <th>PIC / target</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.actions
                .filter((x) => !status || x.status === status)
                .map((x) => (
                  <tr key={x.id}>
                    <td>
                      {x.title}
                      <small>{x.evidence}</small>
                    </td>
                    <td>
                      {data.units.find((u) => u.id === x.unitId)?.name ?? 'Lintas unit'} ·{' '}
                      {x.element}
                    </td>
                    <td>
                      <Badge tone={x.priority === 'Tinggi' ? 'gold' : ''}>{x.priority}</Badge>
                    </td>
                    <td>
                      {x.pic}
                      <small>{x.dueDate}</small>
                    </td>
                    <td>{x.status}</td>
                    <td>
                      <button
                        onClick={() => {
                          setDraft(structuredClone(x));
                          setError('');
                        }}
                      >
                        Kelola
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!data.actions.length && (
          <p className="muted">
            Belum ada tindak lanjut. Gunakan analisis indikator dan keluhan untuk menentukan
            prioritas.
          </p>
        )}
      </Section>
      {draft && (
        <Section title="Catatan perbaikan PDSA">
          <form onSubmit={save} className="form-grid">
            <label>
              Judul masalah *
              <input
                required
                maxLength={150}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              Unit
              <select
                value={draft.unitId ?? ''}
                onChange={(e) => setDraft({ ...draft, unitId: e.target.value || null })}
              >
                <option value="">Lintas unit</option>
                {data.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unsur terkait
              <select
                value={draft.element}
                onChange={(e) =>
                  setDraft({ ...draft, element: e.target.value as Action['element'] })
                }
              >
                {elementIds.map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
            <label>
              Bukti agregat
              <textarea
                maxLength={500}
                value={draft.evidence}
                onChange={(e) => setDraft({ ...draft, evidence: e.target.value })}
              />
            </label>
            <label>
              Prioritas
              <select
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value as Action['priority'] })
                }
              >
                {['Tinggi', 'Sedang', 'Rendah'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              PIC (jabatan)
              <input
                maxLength={100}
                placeholder="Contoh: Kepala Unit Farmasi"
                value={draft.pic}
                onChange={(e) => setDraft({ ...draft, pic: e.target.value })}
              />
            </label>
            <label>
              Target tanggal *
              <input
                type="date"
                required
                value={draft.dueDate}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
              />
            </label>
            <label>
              Status
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as Action['status'] })}
              >
                {['Baru', 'Proses', 'Selesai', 'Verifikasi'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Aksi Plan–Do–Study–Act
              <textarea
                maxLength={500}
                value={draft.pdsa}
                onChange={(e) => setDraft({ ...draft, pdsa: e.target.value })}
              />
            </label>
            <label>
              Tanggal review
              <input
                type="date"
                value={draft.reviewDate}
                onChange={(e) => setDraft({ ...draft, reviewDate: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary">
                Simpan tindak lanjut
              </button>
              <button type="button" onClick={() => setDraft(null)}>
                Batal
              </button>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
          <details>
            <summary>Audit lokal ({draft.audit.length})</summary>
            {draft.audit.map((x, i) => (
              <p key={i}>
                {x.at} · {x.note}
              </p>
            ))}
          </details>
        </Section>
      )}
    </>
  );
}
