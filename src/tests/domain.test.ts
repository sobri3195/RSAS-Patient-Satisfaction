import { describe, expect, it } from 'vitest';
import { emptyDataset } from '../data/defaults';
import { makeDemo } from '../data/demo';
import { elementIds, datasetSchema, type SurveyResponse } from '../domain/schema';
import {
  aggregateResponses,
  calculateElementMean,
  calculateIkm,
  calculateResponseRate,
  categoryFeedback,
  classifyIkm,
  filterResponses,
  getPriorityElements,
  getTrends,
  groupResponsesByUnit,
  safetyFlag,
} from '../domain/analytics';
import {
  mergeDatasets,
  mergeImportedResponses,
  parseImport,
  saveDataset,
} from '../repositories/storage';
import { csvCell, toCsv } from '../lib/csv';
const data = emptyDataset();
function response(score = 4): SurveyResponse {
  return {
    id: crypto.randomUUID(),
    unitId: data.units[0].id,
    unitNameSnapshot: 'IGD',
    surveyVersion: 'SKM-1',
    answers: Object.fromEntries(elementIds.map((id) => [id, score])) as SurveyResponse['answers'],
    extraAnswers: {},
    sourceInstanceId: data.sourceInstanceId,
    submittedAt: '2026-11-10T03:00:00.000Z',
    isDemo: false,
  };
}
describe('IKM, precision and methodology', () => {
  it('all 4 = 100 A; all 1 = 25 D', () => {
    expect(calculateIkm([response()])).toBeCloseTo(100, 12);
    expect(classifyIkm(calculateIkm([response()]))).toBe('A');
    expect(calculateIkm([response(1)])).toBe(25);
    expect(classifyIkm(25)).toBe('D');
  });
  it('mean 3.4 = 85 B using exact 1/9', () => {
    const rows = [response(3), response(3), response(3), response(4), response(4)];
    expect(calculateIkm(rows)).toBeCloseTo(85, 12);
    expect(classifyIkm(calculateIkm(rows))).toBe('B');
  });
  it.each([
    [64.999, 'D'],
    [65, 'C'],
    [76.6099, 'C'],
    [76.61, 'B'],
    [88.3099, 'B'],
    [88.31, 'A'],
    [100, 'A'],
  ] as const)('classifies unrounded boundary %s', (n, grade) => expect(classifyIkm(n)).toBe(grade));
  it('excludes null without substituting positive scores', () => {
    const r = response(1);
    r.answers.U4 = null;
    const x = calculateElementMean([r, response(3)], 'U4');
    expect(x).toEqual({ mean: 3, validResponseCount: 1 });
    expect(calculateIkm([r, response(3)])).toBeCloseTo(((2 * 8 + 3) / 9) * 25);
  });
  it('zero responses and incomplete element are unavailable', () => {
    expect(calculateIkm([])).toBeNull();
    expect(aggregateResponses([]).positiveRate).toBeNull();
    const r = response();
    r.answers.U8 = null;
    expect(calculateIkm([r])).toBeNull();
  });
  it('extra rating/NPS never changes IKM', () => {
    const r = response(3);
    const before = calculateIkm([r]);
    r.extraAnswers = { nps: 0, komunikasi: 1 };
    expect(calculateIkm([r])).toEqual(before);
  });
  it('rejects invalid weights', () =>
    expect(() => calculateIkm([response()], Array(9).fill(0.11))).toThrow());
  it('keeps unit groups and categories separate', () => {
    const r = response(1),
      b = response(4);
    b.unitId = data.units[4].id;
    const g = groupResponsesByUnit([r, b]);
    expect(Object.keys(g)).toHaveLength(2);
    expect(calculateIkm(g[b.unitId])).toBeCloseTo(100);
    expect(data.units[4].category).toBe('Penunjang');
  });
  it('finds lower elements and computes valid response rates', () => {
    const r = response();
    r.answers.U3 = 1;
    expect(getPriorityElements([r])[0].id).toBe('U3');
    expect(calculateResponseRate(5)).toBeNull();
    expect(calculateResponseRate(5, 20)).toBe(25);
  });
});
describe('filters and chart boundaries', () => {
  it('filters by unit, version and inclusive local calendar dates', () => {
    const r = response();
    const date = new Date(2026, 10, 10, 23, 59, 59);
    r.submittedAt = date.toISOString();
    const f = { unitId: r.unitId, version: 'SKM-1', from: '2026-11-10', to: '2026-11-10' };
    expect(filterResponses([r], f)).toHaveLength(1);
    expect(filterResponses([r], { ...f, from: '2026-11-11' })).toHaveLength(0);
    expect(filterResponses([r], { ...f, unitId: 'other' })).toHaveLength(0);
    expect(filterResponses([r], { ...f, version: 'other' })).toHaveLength(0);
  });
  it('never mixes simulation in production analysis', () => {
    const r = response();
    const demo = makeDemo();
    const f = { unitId: '', version: '', from: '', to: '' };
    expect(filterResponses([r, ...demo.responses], f)).toEqual([r]);
    expect(filterResponses([r, ...demo.responses], f, true)).toHaveLength(180);
  });
  it('trends match table and grouping', () => {
    const rows = [response(1), response(3)];
    expect(getTrends(rows)[0]).toMatchObject({ n: 2, ikm: 50 });
    expect(getTrends(rows, 'week')).toHaveLength(1);
    expect(getTrends(rows, 'month')[0].date).toBe('2026-11');
    expect(getTrends([])).toEqual([]);
  });
  it('demo generator has deterministic responses for a fixed anchor', () => {
    const d = new Date(2026, 10, 10);
    expect(makeDemo(d).responses).toEqual(makeDemo(d).responses);
  });
});
describe('interoperability, privacy and storage failures', () => {
  it('deduplicates response UUID with explicit conflicts', () => {
    const r = response();
    const conflicting = { ...r, positiveFeedback: 'other' };
    const m = mergeImportedResponses([r], [r, conflicting, response()]);
    expect(m.added).toBe(1);
    expect(m.duplicates).toBe(2);
    expect(m.conflicts).toBe(1);
    expect(m.responses[0]).toEqual(r);
  });
  it('merges data repeatably preserving local settings and active version', () => {
    const incoming = emptyDataset();
    incoming.responses = [response()];
    const first = mergeDatasets(data, incoming);
    expect(first.added).toBe(1);
    expect(mergeDatasets(first.data, incoming).added).toBe(0);
    expect(first.data.settings).toEqual(data.settings);
  });
  it('rejects questionnaire conflicts and namespace mixing', () => {
    const bad = emptyDataset();
    bad.questionnaires[0].core[0].text = 'Changed';
    expect(() => mergeDatasets(data, bad)).toThrow(/kuesioner/);
    expect(() => mergeDatasets(data, makeDemo())).toThrow(/Namespace/);
  });
  it.each(['not json', '{"schemaVersion":999}', '{"__proto__":{"polluted":true}}'])(
    'rejects invalid imports safely',
    (raw) => {
      expect(() => parseImport(raw)).toThrow(/JSON ditolak/);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    },
  );
  it('rejects executable logo and unsolicited patient identity fields', () => {
    expect(() =>
      parseImport(
        JSON.stringify({
          ...data,
          settings: { ...data.settings, logo: 'data:image/svg+xml,<svg onload=alert(1)>' },
        }),
      ),
    ).toThrow();
    expect(() =>
      parseImport(JSON.stringify({ ...data, responses: [{ ...response(), nik: '123' }] })),
    ).toThrow();
  });
  it('rejects missing required core, impossible values, broken references', () => {
    const r = response();
    r.answers.U1 = null;
    expect(datasetSchema.safeParse({ ...data, responses: [r] }).success).toBe(false);
    expect(
      datasetSchema.safeParse({
        ...data,
        responses: [{ ...response(), unitId: crypto.randomUUID() }],
      }).success,
    ).toBe(false);
  });
  it('requires valid scores for required extras', () => {
    const d = emptyDataset();
    d.questionnaires[0].extras[0].required = true;
    d.responses = [response()];
    expect(datasetSchema.safeParse(d).success).toBe(false);
  });
  it('escapes spreadsheet formula injection including whitespace prefixes', () => {
    for (const s of ['=SUM(A1)', '+cmd', '-2', '@x', '\t=evil']) expect(csvCell(s)).toMatch(/^"'/);
    expect(csvCell('say "yes"')).toBe('"say ""yes"""');
    expect(toCsv([['a', 'b']])).toBe('\uFEFF"a","b"');
  });
  it('storage quota failure is actionable without clearing data', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        setItem() {
          throw Error('QuotaExceededError');
        },
      },
      configurable: true,
    });
    expect(() => saveDataset(data)).toThrow(/Penyimpanan penuh/);
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  it('categorizes locally and flags human safety review', () => {
    expect(categoryFeedback('antre lama')).toBe('Waktu Tunggu');
    expect(categoryFeedback('toilet kotor')).toBe('Kebersihan');
    expect(safetyFlag('pasien jatuh')).toBe(true);
  });
});
