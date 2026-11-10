import { format, startOfWeek } from 'date-fns';
import { elementIds, type ElementId, type SurveyResponse } from './schema';
export type Filter = { unitId: string; from: string; to: string; version: string };
export const defaultWeights = Array<number>(9).fill(1 / 9);
export function filterResponses(responses: SurveyResponse[], f: Filter, demo = false) {
  return responses.filter(
    (r) =>
      r.isDemo === demo &&
      (!f.unitId || r.unitId === f.unitId) &&
      (!f.version || r.surveyVersion === f.version) &&
      (!f.from || format(new Date(r.submittedAt), 'yyyy-MM-dd') >= f.from) &&
      (!f.to || format(new Date(r.submittedAt), 'yyyy-MM-dd') <= f.to),
  );
}
export function calculateElementMean(responses: SurveyResponse[], id: ElementId) {
  const values = responses
    .map((r) => r.answers[id])
    .filter((v): v is 1 | 2 | 3 | 4 => v !== null && v >= 1 && v <= 4);
  return {
    mean: values.length ? values.reduce((s, v) => s + v, 0) / values.length : null,
    validResponseCount: values.length,
  };
}
export function classifyIkm(value: number | null) {
  if (value === null || value < 25 || value > 100 || !Number.isFinite(value)) return null;
  return value >= 88.31 ? 'A' : value >= 76.61 ? 'B' : value >= 65 ? 'C' : 'D';
}
export function calculateIkm(responses: SurveyResponse[], weights = defaultWeights) {
  if (
    weights.length !== 9 ||
    weights.some((w) => !Number.isFinite(w) || w < 0) ||
    Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-9
  )
    throw Error('Total bobot harus 1.');
  const means = elementIds.map((id) => calculateElementMean(responses, id).mean);
  if (means.some((v) => v === null)) return null;
  const equal = weights.every((w) => w === 1 / 9);
  const raw = equal
    ? means.reduce<number>((sum, m) => sum + (m ?? 0), 0) / 9
    : means.reduce<number>((sum, m, i) => sum + (m ?? 0) * weights[i], 0);
  return Math.min(100, raw * 25);
}
export function groupResponsesByUnit(responses: SurveyResponse[]) {
  const groups: Record<string, SurveyResponse[]> = {};
  for (const r of responses) (groups[r.unitId] ??= []).push(r);
  return groups;
}
export function aggregateResponses(responses: SurveyResponse[], weights = defaultWeights) {
  const elements = elementIds.map((id) => ({ id, ...calculateElementMean(responses, id) }));
  const distribution = [1, 2, 3, 4].map((score) => ({
    name: `Skor ${score}`,
    score,
    value: responses.reduce(
      (n, r) => n + elementIds.filter((id) => r.answers[id] === score).length,
      0,
    ),
  }));
  const total = distribution.reduce((a, b) => a + b.value, 0);
  const ikm = calculateIkm(responses, weights);
  return {
    n: responses.length,
    ikm,
    grade: classifyIkm(ikm),
    elements,
    distribution,
    positiveRate: total
      ? (distribution.filter((x) => x.score >= 3).reduce((a, b) => a + b.value, 0) / total) * 100
      : null,
  };
}
export function getPriorityElements(responses: SurveyResponse[]) {
  return elementIds
    .map((id) => ({ id, ...calculateElementMean(responses, id) }))
    .filter((x) => x.mean !== null)
    .sort((a, b) => a.mean! - b.mean!);
}
export function getTrends(
  responses: SurveyResponse[],
  period: 'day' | 'week' | 'month' = 'day',
  weights = defaultWeights,
) {
  const groups = new Map<string, SurveyResponse[]>();
  for (const r of responses) {
    let d = new Date(r.submittedAt);
    if (period === 'week') d = startOfWeek(d, { weekStartsOn: 1 });
    const key = format(d, period === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd');
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({ date, n: rows.length, ikm: calculateIkm(rows, weights) }));
}
export function calculateResponseRate(count: number, visits?: number) {
  return visits && visits > 0 ? (count / visits) * 100 : null;
}
export function categoryFeedback(text: string) {
  const rules = [
    ['Waktu Tunggu', /tunggu|lama|lambat|antre|antri/i],
    ['Perilaku', /ramah|sopan|kasar|marah/i],
    ['Informasi', /informasi|jelas|bingung|komunikasi/i],
    ['Biaya', /biaya|tarif|mahal|bayar/i],
    ['Kebersihan', /kotor|bersih|toilet|bau/i],
    ['Fasilitas', /kursi|ruang|parkir|akses|fasilitas/i],
    ['Obat', /obat|resep|farmasi/i],
  ] as const;
  return rules.find(([, re]) => re.test(text))?.[0] ?? 'Lainnya';
}
export function safetyFlag(text: string) {
  return /jatuh|salah obat|sesak|keselamatan|cedera|pingsan|darah|darurat/i.test(text);
}
export const displayNumber = (v: number | null, digits = 2) =>
  v === null
    ? '—'
    : new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(v);
