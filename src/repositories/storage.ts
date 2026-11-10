import { datasetSchema, type Dataset, type SurveyResponse } from '../domain/schema';
import { emptyDataset } from '../data/defaults';
export const storageKey = (demo = false) => `rsas.skm.v1.${demo ? 'demo.' : ''}dataset`;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(value) ?? 'null';
}
export class StorageError extends Error {}
export function loadDataset(demo = false): Dataset {
  try {
    const raw = localStorage.getItem(storageKey(demo));
    const parsed = raw ? datasetSchema.parse(JSON.parse(raw)) : emptyDataset();
    if (parsed.responses.some((r) => r.isDemo !== demo))
      throw new StorageError('Namespace tidak sesuai.');
    return parsed;
  } catch {
    throw new StorageError(
      'Data lokal tidak dapat dibaca. Unduh salinan mentah untuk pemulihan sebelum menghapus data.',
    );
  }
}
export function saveDataset(data: Dataset, demo = false) {
  const parsed = datasetSchema.parse(data);
  if (parsed.responses.some((r) => r.isDemo !== demo))
    throw new StorageError('Data simulasi dan operasional tidak boleh dicampur.');
  try {
    localStorage.setItem(storageKey(demo), JSON.stringify(parsed));
  } catch {
    throw new StorageError(
      'Penyimpanan penuh atau tidak diizinkan. Ekspor cadangan, kosongkan ruang browser, lalu coba lagi. Data sebelumnya tetap tersimpan.',
    );
  }
}
export function parseImport(raw: string) {
  if (raw.length > 15_000_000) throw Error('File melebihi batas 15 MB.');
  try {
    return datasetSchema.parse(JSON.parse(raw));
  } catch {
    throw Error(
      'JSON ditolak: format, skema versi 1, referensi, atau nilai jawaban tidak valid. Tidak ada data yang diubah.',
    );
  }
}
export function mergeImportedResponses(local: SurveyResponse[], incoming: SurveyResponse[]) {
  const lookup = new Map(local.map((r) => [r.id, r]));
  const seen = new Set(lookup.keys());
  const added: SurveyResponse[] = [];
  let duplicates = 0,
    conflicts = 0;
  for (const r of incoming) {
    const previous = lookup.get(r.id);
    if (seen.has(r.id)) {
      duplicates++;
      if (previous && canonical(previous) !== canonical(r)) conflicts++;
    } else {
      seen.add(r.id);
      added.push(r);
    }
  }
  return { responses: [...local, ...added], added: added.length, duplicates, conflicts };
}
export function mergeDatasets(local: Dataset, incoming: Dataset, demo = false) {
  if (incoming.responses.some((r) => r.isDemo !== demo))
    throw Error(
      'Namespace berbeda. Impor simulasi hanya di Mode Simulasi dan data riil hanya di Mode Operasional.',
    );
  const merged = mergeImportedResponses(local.responses, incoming.responses);
  let masterConflicts = 0;
  const units = [...local.units];
  for (const unit of incoming.units) {
    const previous = units.find((x) => x.id === unit.id);
    if (previous) {
      if (canonical(previous) !== canonical(unit)) masterConflicts++;
    } else {
      if (units.some((u) => u.slug === unit.slug))
        throw Error(
          `Slug unit bentrok: ${unit.slug}. Ubah slug pada perangkat sumber sebelum mengekspor ulang.`,
        );
      units.push(unit);
    }
  }
  const questionnaires = [...local.questionnaires];
  for (const q of incoming.questionnaires) {
    const prev = questionnaires.find((x) => x.version === q.version);
    if (prev && canonical(prev) !== canonical(q))
      throw Error(
        `Versi kuesioner ${q.version} bentrok. Impor dibatalkan agar metodologi tidak berubah.`,
      );
    if (!prev) questionnaires.push(q);
  }
  const append = <T extends { id: string }>(a: T[], b: T[]) => [
    ...a,
    ...b.filter((x) => !a.some((y) => y.id === x.id)),
  ];
  const active = local.questionnaires.at(-1)!;
  const ordered = [...questionnaires.filter((q) => q.version !== active.version), active];
  const data = datasetSchema.parse({
    ...local,
    units,
    questionnaires: ordered,
    responses: merged.responses,
    actions: append(local.actions, incoming.actions),
    manualVolumes: append(local.manualVolumes, incoming.manualVolumes),
    feedbackLabels: [
      ...local.feedbackLabels,
      ...incoming.feedbackLabels.filter(
        (x) => !local.feedbackLabels.some((y) => y.responseId === x.responseId),
      ),
    ],
  });
  return {
    data,
    added: merged.added,
    duplicates: merged.duplicates,
    conflicts: merged.conflicts,
    masterConflicts,
  };
}
export function serializeDataset(data: Dataset) {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
}
export function downloadFile(name: string, content: string, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
