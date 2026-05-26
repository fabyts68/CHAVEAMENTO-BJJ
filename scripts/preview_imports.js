import fs from 'fs';
import path from 'path';
import { read, utils } from 'xlsx';

async function previewXlsx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const workbook = read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json(sheet, { defval: '' });
  console.log('=== XLSX PREVIEW ===');
  console.log(JSON.stringify(rows.slice(0, 10), null, 2));
}

async function previewPdf(filePath) {
  const pdfParse = await import('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse.default(buffer);
  const text = data.text || '';
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  console.log('=== PDF PREVIEW ===');
  console.log(lines.slice(0, 200));
}

(async () => {
  try {
    const xlsxPath = path.resolve('teste.xlsx');
    const pdfPath = path.resolve('teste.pdf');

    if (fs.existsSync(xlsxPath)) await previewXlsx(xlsxPath);
    else console.log('teste.xlsx not found');

    if (fs.existsSync(pdfPath)) await previewPdf(pdfPath);
    else console.log('teste.pdf not found');
  } catch (err) {
    console.error('Error previewing files:', err);
    process.exitCode = 1;
  }
})();
