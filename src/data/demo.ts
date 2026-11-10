import { emptyDataset } from './defaults';
import { elementIds, type SurveyResponse } from '../domain/schema';
export function makeDemo(anchor = new Date()): ReturnType<typeof emptyDataset> {
  const data = emptyDataset();
  data.sourceInstanceId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  data.responses = Array.from({ length: 180 }, (_, i) => {
    const unit = data.units[i % 10];
    const date = new Date(start);
    date.setDate(date.getDate() - (i % 28));
    date.setHours(9 + (i % 8), 0, 0, 0);
    return {
      id: `dddddddd-dddd-4ddd-8ddd-${String(i + 1).padStart(12, '0')}`,
      surveyVersion: 'SKM-1',
      unitId: unit.id,
      unitNameSnapshot: unit.name,
      serviceType: unit.serviceTypes[0],
      answers: Object.fromEntries(
        elementIds.map((id, j) => [id, (i * 7 + j * 3) % 11 < 2 ? 2 : (i + j) % 5 === 0 ? 4 : 3]),
      ) as SurveyResponse['answers'],
      extraAnswers: { komunikasi: 3, privasi: 4, nps: i % 11 },
      positiveFeedback: i % 5 === 0 ? 'Petugas ramah dan informasi jelas.' : '',
      improvementFeedback:
        i % 3 === 0
          ? 'Waktu tunggu lama.'
          : i % 7 === 0
            ? 'Kursi ruang tunggu perlu diperbaiki.'
            : '',
      submittedAt: date.toISOString(),
      sourceInstanceId: data.sourceInstanceId,
      isDemo: true,
    };
  });
  return data;
}
