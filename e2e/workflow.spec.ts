import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function menu(page: Page, name: string) {
  if (await page.getByRole('button', { name: 'Buka menu' }).isVisible())
    await page.getByRole('button', { name: 'Buka menu' }).click();
  await page.getByRole('link', { name, exact: true }).click();
}
async function completeSurvey(page: Page) {
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  for (let i = 1; i <= 9; i++) {
    await page.locator('.rating-option').nth(3).click();
    await page.getByRole('button', { name: 'Berikutnya' }).click();
  }
  await page.getByLabel('Apa yang perlu diperbaiki?').fill('Waktu tunggu lama.');
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Kirim penilaian' }).click();
  await expect(page.getByRole('heading', { name: 'Terima kasih atas suara Anda.' })).toBeVisible();
}
for (const width of [375, 768, 1440])
  test(`complete operational workflow at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Pengalaman Anda/ })).toBeVisible();
    await page.keyboard.press('Tab');
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Ruang Tim Mutu' }).click();
    await expect(
      page.getByRole('heading', { name: 'Belum ada respons pada filter ini.' }).first(),
    ).toBeVisible();
    await menu(page, 'Master unit');
    await page.getByRole('button', { name: 'Tambah unit' }).click();
    await page.getByLabel('Nama unit').fill('Poli Uji');
    await page.getByLabel('Kode *', { exact: true }).fill('PU');
    await page.getByLabel('Slug unik').fill('poli-uji');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Simpan unit', exact: true }).click();
    await expect(page.getByText('Master unit tersimpan.')).toBeVisible();
    await page.goto('/survei/poli-uji?kiosk=1');
    await expect(page.getByLabel('Unit pelayanan')).toHaveValue(/.+/);
    await page.getByRole('button', { name: 'Berikutnya' }).click();
    await page.locator('.rating-option').nth(3).click();
    await page.reload();
    await expect(page.locator('.rating-option').nth(3).getByRole('radio')).toBeChecked();
    await page.getByRole('button', { name: 'Sebelumnya' }).click();
    await completeSurvey(page);
    await page.goto('/admin/dashboard');
    await expect(page.locator('.kpi-card').first()).toContainText('100,00');
    await page.reload();
    await expect(page.locator('.kpi-card').nth(1)).toContainText('1');
    await expect(page.getByText('Sampel kecil', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true });
    await menu(page, 'Indikator SKM');
    await expect(page.getByRole('heading', { name: 'Rincian indikator' })).toBeVisible();
    await menu(page, 'Suara pasien');
    await expect(page.getByText('Waktu tunggu lama.', { exact: true })).toBeVisible();
    await menu(page, 'Pengaturan');
    await page
      .getByLabel('Pemberitahuan survei')
      .fill('Pemberitahuan privasi uji pada perangkat lokal.');
    await page.getByRole('button', { name: 'Simpan pengaturan' }).click();
    await page.reload();
    await expect(page.getByLabel('Pemberitahuan survei')).toHaveValue(
      'Pemberitahuan privasi uji pada perangkat lokal.',
    );
    await menu(page, 'Impor & ekspor');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Unduh backup JSON' }).click();
    const download = await downloading;
    const path = await download.path();
    expect(path).toBeTruthy();
    const raw = await readFile(path!, 'utf8');
    const backup = JSON.parse(raw);
    expect(backup.responses).toHaveLength(1);
    await page.getByLabel(/Pilih file JSON/).setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(raw),
    });
    await expect(page.getByRole('heading', { name: 'Pratinjau impor' })).toBeVisible();
    await expect(page.getByText(/0 respons baru, 1 duplikat/)).toBeVisible();
    await page.getByRole('button', { name: 'Terapkan merge' }).click();
    await expect(page.getByText(/Merge selesai: 0 ditambahkan, 1 duplikat/)).toBeVisible();
    await page.getByLabel(/Pilih file JSON/).setInputFiles({
      name: 'malicious.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"schemaVersion":999}'),
    });
    await expect(page.getByRole('alert')).toContainText('JSON ditolak');
    await page.getByLabel(/Pilih file JSON/).setInputFiles({
      name: 'restore.json',
      mimeType: 'application/json',
      buffer: Buffer.from(raw),
    });
    await page.getByLabel('Metode impor').selectOption('restore');
    page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'RESTORE' : undefined));
    await page.getByRole('button', { name: 'Restore cadangan', exact: true }).click();
    await expect(page.getByText('Restore selesai: 1 respons.')).toBeVisible();
    await menu(page, 'Laporan');
    await expect(page.getByText('LAPORAN SURVEI KEPUASAN PASIEN', { exact: true })).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: testInfo.outputPath(`report-${width}.pdf`), format: 'A4' });
    await page.emulateMedia({ media: 'screen' });
    await menu(page, 'QR survei');
    await expect(page.getByRole('img', { name: /QR survei/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
test('simulation never alters operational data and every admin route opens', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await page.getByRole('button', { name: 'Aktifkan simulasi' }).click();
  await expect(page.locator('.demo-banner')).toContainText('DATA SIMULASI');
  await expect(page.locator('.kpi-card').nth(1).locator('.kpi-value')).not.toHaveText('0respons');
  for (const path of [
    'unit',
    'indikator',
    'respons',
    'feedback',
    'tindak-lanjut',
    'laporan',
    'master-unit',
    'pertanyaan',
    'qr',
    'impor-ekspor',
    'pengaturan',
  ]) {
    await page.goto(`/admin/${path}`);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/admin/dashboard');
  await page.getByRole('button', { name: 'Kembali ke operasional' }).click();
  await expect(
    page.getByRole('heading', { name: 'Belum ada respons pada filter ini.' }).first(),
  ).toBeVisible();
});
test('questionnaire snapshots, keyboard survey, response rate, and action audit persist', async ({
  page,
}) => {
  await page.goto('/survei/igd');
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await page.getByRole('radio').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio').nth(1)).toBeChecked();
  await page.getByRole('button', { name: 'Berikutnya' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Unsur 2 dari 9')).toBeVisible();
  await page.goto('/admin/pertanyaan');
  await page
    .getByLabel('Teks pertanyaan', { exact: true })
    .first()
    .fill('Persyaratan mudah dipahami?');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Simpan versi baru' }).first().click();
  await expect(page.getByRole('status')).toContainText('Versi kuesioner baru');
  await page.goto('/survei/igd');
  await expect(page.getByText('Unsur 2 dari 9')).toBeVisible();
  await page.getByRole('button', { name: 'Sebelumnya' }).click();
  await expect(
    page.getByText(
      'Seberapa mudah persyaratan administrasi untuk memperoleh pelayanan di unit ini?',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sebelumnya' }).click();
  await completeSurvey(page);
  await page.getByRole('button', { name: 'Survei baru' }).click();
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByText('Persyaratan mudah dipahami?')).toBeVisible();
  await page.goto('/admin/tindak-lanjut');
  await page.getByRole('button', { name: 'Buat tindak lanjut' }).click();
  await page.getByLabel('Judul masalah').fill('Perbaikan alur antrean');
  await page.getByLabel('PIC (jabatan)').fill('Kepala Unit');
  await page.getByRole('button', { name: 'Simpan tindak lanjut' }).click();
  await page.getByRole('button', { name: 'Kelola', exact: true }).click();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('Proses');
  await page.getByRole('button', { name: 'Simpan tindak lanjut' }).click();
  await page.reload();
  await expect(page.getByRole('cell', { name: 'Proses', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kelola', exact: true }).click();
  await expect(page.getByText('Audit lokal (2)')).toBeVisible();
  await page.goto('/admin/pengaturan');
  const today = new Date();
  const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const to = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}`;
  await page.getByLabel('Jumlah kunjungan', { exact: true }).fill('4');
  await page.getByLabel('Tanggal mulai').fill(from);
  await page.getByLabel('Tanggal akhir').fill(to);
  await page
    .getByLabel('Definisi denominator')
    .fill('Kunjungan IGD yang menyelesaikan layanan dengan versi SKM-1.');
  await page.getByRole('button', { name: 'Simpan denominator' }).click();
  await page.goto('/admin/unit');
  await page.getByLabel('Versi kuesioner').selectOption('SKM-1');
  await expect(page.getByRole('cell', { name: '25,00%', exact: true })).toBeVisible();
});
