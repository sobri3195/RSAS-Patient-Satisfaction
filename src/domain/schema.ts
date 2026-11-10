import { z } from 'zod';
export const elementIds = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'] as const;
export type ElementId = (typeof elementIds)[number];
const uuid = z.uuid();
const iso = z.iso.datetime();
const text = z.string().max(500);
export const answerSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.null(),
]);
export type SurveyAnswer = z.infer<typeof answerSchema>;
export const unitSchema = z
  .object({
    id: uuid,
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(70),
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(100),
    category: z.string().min(1).max(80),
    parentId: uuid.nullable().default(null),
    isActive: z.boolean(),
    targetIkm: z.number().min(25).max(100),
    serviceTypes: z.array(z.string().min(1).max(60)).min(1).max(10),
    description: text,
    createdAt: iso,
  })
  .strict();
export const coreQuestionSchema = z
  .object({
    id: z.enum(elementIds),
    label: z.string().min(1).max(100),
    text: z.string().min(1).max(500),
    options: z.array(z.string().min(1).max(100)).length(4),
    allowNull: z.boolean(),
  })
  .strict();
export const extraQuestionSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .max(80),
    text: z.string().min(1).max(250),
    unitIds: z.array(uuid).max(100),
    required: z.boolean(),
    isActive: z.boolean(),
    kind: z.enum(['rating', 'nps']),
  })
  .strict();
export const questionnaireSchema = z
  .object({
    version: z.string().min(1).max(80),
    createdAt: iso,
    core: z.array(coreQuestionSchema).length(9),
    extras: z.array(extraQuestionSchema).max(100),
    weights: z.array(z.number().min(0).max(1)).length(9),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.core.some((q, i) => q.id !== elementIds[i] || q.allowNull !== ['U4', 'U8'].includes(q.id))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Urutan U1–U9 atau aturan tidak relevan tidak valid.',
      });
    if (Math.abs(v.weights.reduce((a, b) => a + b, 0) - 1) > 1e-9)
      ctx.addIssue({ code: 'custom', message: 'Total bobot harus 1.' });
    if (new Set(v.extras.map((q) => q.id)).size !== v.extras.length)
      ctx.addIssue({ code: 'custom', message: 'ID tambahan harus unik.' });
  });
export const responseSchema = z
  .object({
    id: uuid,
    surveyVersion: z.string().min(1).max(80),
    unitId: uuid,
    unitNameSnapshot: z.string().min(1).max(100),
    serviceType: z.string().max(60).optional(),
    respondentType: z.enum(['pasien', 'pendamping', 'keluarga']).optional(),
    ageGroup: z
      .enum(['<18 via pendamping', '18–24', '25–34', '35–44', '45–59', '≥60', ''])
      .optional(),
    payerGroup: z.enum(['BPJS', 'Umum', 'Asuransi Lain', 'Tidak Menjawab', '']).optional(),
    answers: z
      .object({
        U1: answerSchema,
        U2: answerSchema,
        U3: answerSchema,
        U4: answerSchema,
        U5: answerSchema,
        U6: answerSchema,
        U7: answerSchema,
        U8: answerSchema,
        U9: answerSchema,
      })
      .strict(),
    extraAnswers: z.record(
      z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/)
        .max(80),
      z.union([z.number().min(0).max(10), z.string().max(500), z.null()]),
    ),
    positiveFeedback: text.optional(),
    improvementFeedback: text.optional(),
    submittedAt: iso,
    sourceInstanceId: uuid,
    isDemo: z.boolean(),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const id of elementIds)
      if (v.answers[id] === null && !['U4', 'U8'].includes(id))
        ctx.addIssue({ code: 'custom', message: `${id} wajib dijawab.` });
  });
export const categories = [
  'Waktu Tunggu',
  'Perilaku',
  'Informasi',
  'Biaya',
  'Kebersihan',
  'Fasilitas',
  'Obat',
  'Lainnya',
] as const;
export const actionSchema = z
  .object({
    id: uuid,
    title: z.string().min(1).max(150),
    unitId: uuid.nullable(),
    element: z.enum(elementIds),
    evidence: text,
    priority: z.enum(['Tinggi', 'Sedang', 'Rendah']),
    pic: z.string().max(100),
    dueDate: z.iso.date(),
    status: z.enum(['Baru', 'Proses', 'Selesai', 'Verifikasi']),
    pdsa: text,
    reviewDate: z.iso.date().or(z.literal('')),
    audit: z.array(z.object({ at: iso, note: text }).strict()).max(500),
  })
  .strict();
const settingsSchema = z
  .object({
    logo: z
      .string()
      .max(400000)
      .refine((v) => v === '' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)),
    notice: z.string().min(1).max(1000),
    kiosk: z.boolean(),
    theme: z.enum(['navy', 'teal']),
  })
  .strict();
export const datasetSchema = z
  .object({
    schemaVersion: z.literal(1),
    exportedAt: iso,
    sourceInstanceId: uuid,
    units: z.array(unitSchema).max(500),
    questionnaires: z.array(questionnaireSchema).min(1).max(500),
    responses: z.array(responseSchema).max(50000),
    actions: z.array(actionSchema).max(5000),
    manualVolumes: z
      .array(
        z
          .object({
            id: uuid,
            unitId: uuid,
            from: z.iso.date(),
            to: z.iso.date(),
            visits: z.number().int().positive(),
            definition: z.string().min(1).max(300),
          })
          .strict(),
      )
      .max(5000),
    feedbackLabels: z
      .array(z.object({ responseId: uuid, category: z.enum(categories) }).strict())
      .max(50000),
    settings: settingsSchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const [name, ids] of [
      ['unit', v.units.map((x) => x.id)],
      ['slug', v.units.map((x) => x.slug)],
      ['versi', v.questionnaires.map((x) => x.version)],
      ['respons', v.responses.map((x) => x.id)],
      ['RTL', v.actions.map((x) => x.id)],
      ['volume', v.manualVolumes.map((x) => x.id)],
    ] as const)
      if (new Set(ids).size !== ids.length) fail(`${name} duplikat.`);
    for (const u of v.units) {
      let parent = u.parentId;
      const visited = new Set([u.id]);
      while (parent) {
        if (visited.has(parent)) {
          fail('Siklus induk unit tidak valid.');
          break;
        }
        visited.add(parent);
        const found = v.units.find((x) => x.id === parent);
        if (!found) {
          fail('Induk unit tidak valid.');
          break;
        }
        parent = found.parentId;
      }
    }
    for (const q of v.questionnaires)
      for (const x of q.extras)
        if (x.unitIds.some((id) => !v.units.some((u) => u.id === id)))
          fail('Referensi unit pertanyaan tambahan tidak valid.');
    for (const r of v.responses) {
      const q = v.questionnaires.find((x) => x.version === r.surveyVersion);
      if (!q || !v.units.some((u) => u.id === r.unitId)) fail('Referensi respons tidak valid.');
      if (q) {
        const extras = q.extras.filter(
          (x) => x.isActive && (!x.unitIds.length || x.unitIds.includes(r.unitId)),
        );
        for (const x of extras) {
          const a = r.extraAnswers[x.id];
          if (x.required && typeof a !== 'number') fail('Jawaban tambahan wajib tidak tersedia.');
          if (
            a !== undefined &&
            a !== null &&
            (typeof a !== 'number' ||
              !Number.isInteger(a) ||
              a < (x.kind === 'nps' ? 0 : 1) ||
              a > (x.kind === 'nps' ? 10 : 4))
          )
            fail('Skala tambahan tidak valid.');
        }
      }
    }
    for (const x of [...v.actions, ...v.manualVolumes])
      if (x.unitId && !v.units.some((u) => u.id === x.unitId)) fail('Referensi unit tidak valid.');
    for (const x of v.manualVolumes) if (x.from > x.to) fail('Periode volume tidak valid.');
    for (const x of v.feedbackLabels)
      if (!v.responses.some((r) => r.id === x.responseId)) fail('Referensi komentar tidak valid.');
  });
export type Unit = z.infer<typeof unitSchema>;
export type Questionnaire = z.infer<typeof questionnaireSchema>;
export type SurveyResponse = z.infer<typeof responseSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
