/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Athlete, Belt, AgeDivision, WeightClass, Gender } from "../types";

export interface ParsedAthleteRow {
  name: string;
  teamName: string;
  belt: Belt;
  ageDivision: AgeDivision;
  weightClass: WeightClass;
  gender: Gender;
  rankingPoints: number;
  weightOk: boolean;
  giOk: boolean;
}

const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const truthy = new Set(["sim", "s", "1", "true", "t", "ok", "yes", "y"]);

const beltMap = new Map<string, Belt>([
  ["cinza", Belt.GREY],
  ["branca", Belt.WHITE],
  ["azul", Belt.BLUE],
  ["roxa", Belt.PURPLE],
  ["marrom", Belt.BROWN],
  ["preta", Belt.BLACK],
  ["grey", Belt.GREY],
  ["white", Belt.WHITE],
  ["blue", Belt.BLUE],
  ["purple", Belt.PURPLE],
  ["brown", Belt.BROWN],
  ["black", Belt.BLACK],
]);

const genderMap = new Map<string, Gender>([
  ["masculino", Gender.MALE],
  ["m", Gender.MALE],
  ["male", Gender.MALE],
  ["feminino", Gender.FEMALE],
  ["f", Gender.FEMALE],
  ["female", Gender.FEMALE],
]);

const ageMap = new Map<string, AgeDivision>([
  ["pré-mirim(2-3anos)", AgeDivision.PRE_MIRIM_2_3],
  ["premirim2-3", AgeDivision.PRE_MIRIM_2_3],
  ["pré-mirim", AgeDivision.PRE_MIRIM],
  ["premirim", AgeDivision.PRE_MIRIM],
  ["mirim", AgeDivision.MIRIM],
  ["infantil", AgeDivision.INFANTIL],
  ["infanto-juvenil", AgeDivision.INFANTO_JUVENIL],
  ["infantojovem", AgeDivision.INFANTO_JUVENIL],
  ["juvenil", AgeDivision.JUVENIL],
  ["adulto", AgeDivision.ADULT],
  ["master1", AgeDivision.MASTER_1],
  ["master2", AgeDivision.MASTER_2],
  ["master3", AgeDivision.MASTER_3],
  ["master4", AgeDivision.MASTER_4],
  ["master5", AgeDivision.MASTER_5],
  ["master6", AgeDivision.MASTER_6],
  ["master7", AgeDivision.MASTER_7],
]);

const weightMap = new Map<string, WeightClass>([
  ["galo", WeightClass.ROOSTER],
  ["pluma", WeightClass.LIGHT_FEATHER],
  ["pena", WeightClass.FEATHER],
  ["leve", WeightClass.LIGHT],
  ["médio", WeightClass.MIDDLE],
  ["medio", WeightClass.MIDDLE],
  ["meio-pesado", WeightClass.MEDIUM_HEAVY],
  ["meio pesado", WeightClass.MEDIUM_HEAVY],
  ["pesado", WeightClass.HEAVY],
  ["super-pesado", WeightClass.SUPER_HEAVY],
  ["super pesado", WeightClass.SUPER_HEAVY],
  ["pesadíssimo", WeightClass.ULTRA_HEAVY],
  ["pesadissimo", WeightClass.ULTRA_HEAVY],
  ["absoluto", WeightClass.ABSOLUTE],
]);

const guessValue = <T>(raw: unknown, map: Map<string, T>, fallback: T): T => {
  const value = String(raw ?? "").trim().toLowerCase();
  return map.get(normalizeKey(value)) || map.get(value) || fallback;
};

const parseRank = (raw: unknown) => {
  const value = Number(String(raw ?? "").replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(value) ? value : 0;
};

const parseBoolean = (raw: unknown) => {
  const value = String(raw ?? "").trim().toLowerCase();
  return truthy.has(value);
};

const findValue = (row: Record<string, unknown>, aliases: string[]) => {
  for (const key of Object.keys(row)) {
    const normalized = normalizeKey(key);
    if (aliases.some((alias) => normalized.includes(normalizeKey(alias)))) {
      return row[key];
    }
  }
  return undefined;
};

const splitRow = (line: string) => line.split(/\s{2,}|[\t,;|]/).map((item) => item.trim()).filter(Boolean);

const findPdfHeader = (lines: string[]) => {
  const headerAliases = [
    ['nome', 'atleta', 'competidor', 'athlete'],
    ['equipe', 'team', 'academia', 'gym', 'clube'],
    ['faixa', 'belt'],
    ['idade', 'categoria', 'age division', 'age'],
    ['peso', 'weight class', 'weight'],
    ['gênero', 'genero', 'gender', 'sexo'],
  ];

  return lines.find((line) =>
    headerAliases.every((aliases) => aliases.some((alias) => normalizeKey(line).includes(normalizeKey(alias))))
  );
};

const parsePdfTextLines = async (file: File) => {
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map<number, Array<{ x: number; text: string }>>();

    content.items.forEach((item: any) => {
      const transform = item.transform as number[];
      const y = Math.round((transform[5] ?? 0) * 100);
      const x = transform[4] ?? 0;
      const row = rows.get(y) || [];
      row.push({ x, text: String(item.str).trim() });
      rows.set(y, row);
    });

    Array.from(rows.keys())
      .sort((a, b) => b - a)
      .forEach((y) => {
        const row = rows.get(y)!;
        const line = row.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ').replace(/\s{2,}/g, ' ').trim();
        if (line) lines.push(line);
      });
  }

  return lines;
};

export const parseAthleteFile = async (file: File): Promise<ParsedAthleteRow[]> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const rows: Record<string, unknown>[] = [];

  if (extension === 'pdf') {
    const lines = await parsePdfTextLines(file);
    const headerLine = findPdfHeader(lines);
    if (!headerLine) {
      throw new Error('Não foi possível detectar o cabeçalho do PDF. Use um arquivo com colunas claras.');
    }

    const headerTokens = splitRow(headerLine).map((token) => token.toLowerCase());
    const columns = headerTokens.map((token) => ({
      name: token,
      key: token,
    }));

    const aliasMap: Record<string, string> = {
      nome: 'name', atleta: 'name', competidor: 'name', athlete: 'name',
      equipe: 'teamName', team: 'teamName', academia: 'teamName', gym: 'teamName', clube: 'teamName',
      faixa: 'belt', belt: 'belt',
      idade: 'ageDivision', categoria: 'ageDivision', 'age division': 'ageDivision', age: 'ageDivision',
      peso: 'weightClass', 'weight class': 'weightClass', weight: 'weightClass',
      gênero: 'gender', genero: 'gender', gender: 'gender', sexo: 'gender',
      ranking: 'rankingPoints', points: 'rankingPoints', seed: 'rankingPoints', pontuacao: 'rankingPoints', pontuação: 'rankingPoints',
      'peso ok': 'weightOk', weightok: 'weightOk', checkinpeso: 'weightOk',
      'gi ok': 'giOk', kimono: 'giOk', 'kimono ok': 'giOk', giok: 'giOk', gi_ok: 'giOk',
    };

    const indexMap: Record<number, string> = {};
    headerTokens.forEach((token, index) => {
      const normalized = normalizeKey(token);
      const match = Object.entries(aliasMap).find(([alias]) => normalizeKey(alias) === normalized || normalized.includes(normalizeKey(alias)));
      if (match) indexMap[index] = match[1];
    });

    const startIndex = lines.indexOf(headerLine) + 1;
    for (let i = startIndex; i < lines.length; i += 1) {
      const line = lines[i];
      const cells = splitRow(line);
      if (cells.length < 2) continue;
      const row: Record<string, unknown> = {};
      cells.forEach((cell, idx) => {
        const key = indexMap[idx];
        if (key) row[key] = cell;
      });
      if (String(row.name || '').trim()) rows.push(row);
    }
  } else if (['csv', 'txt', 'tsv'].includes(extension)) {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    const allLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (allLines.length === 0) {
      throw new Error('Arquivo de texto vazio.');
    }

    // Detect delimiter heuristic
    const sample = allLines.slice(0, 5).join('\n');
    let delim = ',';
    if (sample.includes('\t')) delim = '\t';
    else if (sample.includes(';')) delim = ';';
    else if (sample.includes('|')) delim = '|';

    const papa = await import('papaparse');
    const parse = (papa && (papa.parse || (papa as any).default.parse)) as any;
    const result = parse(text, { header: true, skipEmptyLines: true, delimiter: delim });
    if (result && Array.isArray(result.data)) {
      // result.data is array of objects mapping header -> value
      rows.push(...result.data as Record<string, unknown>[]);
    }
  } else {
    const { read, utils } = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    rows.push(...utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' }));
  }

  return rows
    .map((row) => {
      const name = String(findValue(row, ['nome', 'atleta', 'competidor', 'athlete']) ?? '').trim();
      if (!name) return null;
      const teamName = String(findValue(row, ['team', 'equipe', 'academia', 'gym', 'clube']) ?? 'Sem filiação').trim() || 'Sem filiação';
      const belt = guessValue(findValue(row, ['faixa', 'belt']), beltMap, Belt.WHITE);
      const ageDivision = guessValue(findValue(row, ['idade', 'categoria', 'age division', 'age']), ageMap, AgeDivision.ADULT);
      const weightClass = guessValue(findValue(row, ['peso', 'weight class', 'weight']), weightMap, WeightClass.MIDDLE);
      const gender = guessValue(findValue(row, ['gênero', 'genero', 'gender', 'sexo']), genderMap, Gender.MALE);
      const rankingPoints = parseRank(findValue(row, ['ranking', 'points', 'seed', 'rankingPoints', 'pontuação', 'pontuacao']));
      const weightOk = parseBoolean(findValue(row, ['pesook', 'weightok', 'checkinpeso', 'weightok', 'weightok']));
      const giOk = parseBoolean(findValue(row, ['giok', 'kimono', 'kimono ok', 'giok', 'gi_ok']));

      return {
        name,
        teamName,
        belt,
        ageDivision,
        weightClass,
        gender,
        rankingPoints,
        weightOk,
        giOk,
      };
    })
    .filter((row): row is ParsedAthleteRow => row !== null);
};

export type PreviewResult = { headers: string[]; sampleRows: Record<string, unknown>[]; type: 'sheet' | 'text' | 'pdf' };

export const previewFile = async (file: File): Promise<PreviewResult> => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (extension === 'pdf') {
    const lines = await parsePdfTextLines(file);
    const headerLine = findPdfHeader(lines) || lines[0] || '';
    const headers = splitRow(headerLine).map((h) => h.trim());
    const sampleRows: Record<string, unknown>[] = [];
    const startIndex = Math.max(lines.indexOf(headerLine), 0) + 1;
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 5); i += 1) {
      const cells = splitRow(lines[i]);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ''; });
      sampleRows.push(obj);
    }
    return { headers, sampleRows, type: 'pdf' };
  }

  if (['csv', 'txt', 'tsv'].includes(extension)) {
    const buffer = await file.arrayBuffer();
    let text = '';
    try {
      text = new TextDecoder('utf-8').decode(buffer);
    } catch {
      try {
        text = new TextDecoder('windows-1252').decode(buffer);
      } catch {
        text = new TextDecoder().decode(buffer);
      }
    }
    const papa = await import('papaparse');
    const parse = (papa && (papa.parse || (papa as any).default.parse)) as any;
    const result = parse(text, { header: true, preview: 5, skipEmptyLines: true, delimiter: '' });
    const headers = result.meta?.fields || [];
    const sampleRows = Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : [];
    return { headers, sampleRows, type: 'text' };
  }

  // xlsx
  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' }) as Record<string, unknown>[];
  const headers = Object.keys(rows[0] || {});
  return { headers, sampleRows: rows.slice(0, 5), type: 'sheet' };
};

export const parseFileWithMapping = async (file: File, mapping: Record<string, string>) => {
  // mapping: header -> targetKey (name, teamName, belt, ageDivision, weightClass, gender, rankingPoints, weightOk, giOk)
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const rows: Record<string, unknown>[] = [];
  const sourceRows: Record<string, unknown>[] = [];

  if (extension === 'pdf') {
    const lines = await parsePdfTextLines(file);
    const headerLine = findPdfHeader(lines) || lines[0] || '';
    const headers = splitRow(headerLine).map((h) => h.trim());
    const startIndex = Math.max(lines.indexOf(headerLine), 0) + 1;
    for (let i = startIndex; i < lines.length; i += 1) {
      const cells = splitRow(lines[i]);
      if (cells.length === 0) continue;
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        const target = mapping[h];
        if (target) row[target] = cells[idx] ?? '';
      });
      if (String(row.name || '').trim()) rows.push(row);
      sourceRows.push(headers.reduce((acc, h, idx) => ({ ...acc, [h]: cells[idx] ?? '' }), {} as Record<string, unknown>));
    }
  } else if (['csv', 'txt', 'tsv'].includes(extension)) {
    const buffer = await file.arrayBuffer();
    let text = '';
    try { text = new TextDecoder('utf-8').decode(buffer); } catch { text = new TextDecoder('windows-1252').decode(buffer); }
    const papa = await import('papaparse');
    const parse = (papa && (papa.parse || (papa as any).default.parse)) as any;
    const result = parse(text, { header: true, skipEmptyLines: true, delimiter: '' });
    const data = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
    for (const raw of data) {
      const out: Record<string, unknown> = {};
      for (const [hdr, target] of Object.entries(mapping)) {
        if (target && raw[hdr] !== undefined) out[target] = raw[hdr];
      }
      if (String(out.name || '').trim()) {
        rows.push(out);
        sourceRows.push(raw);
      }
    }
  } else {
    const { read, utils } = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' }) as Record<string, unknown>[];
    for (const raw of rawRows) {
      const out: Record<string, unknown> = {};
      for (const [hdr, target] of Object.entries(mapping)) {
        if (target && raw[hdr] !== undefined) out[target] = raw[hdr];
      }
      if (String(out.name || '').trim()) {
        rows.push(out);
        sourceRows.push(raw);
      }
    }
  }

  // Normalize using same mapping logic as parseAthleteFile bottom
  const parsed: ParsedAthleteRow[] = rows.map((row) => {
    const name = String(row.name || '').trim();
    const teamName = String(row.teamName || row.team || 'Sem filiação').trim() || 'Sem filiação';
    const belt = guessValue(findValue(row, ['faixa', 'belt', 'Belt', 'FAIXA']), beltMap, Belt.WHITE);
    const ageDivision = guessValue(findValue(row, ['idade', 'categoria', 'age division', 'age']), ageMap, AgeDivision.ADULT);
    const weightClass = guessValue(findValue(row, ['peso', 'weight class', 'weight']), weightMap, WeightClass.MIDDLE);
    const gender = guessValue(findValue(row, ['gênero', 'genero', 'gender', 'sexo']), genderMap, Gender.MALE);
    const rankingPoints = parseRank(findValue(row, ['ranking', 'points', 'seed', 'rankingPoints', 'pontuação', 'pontuacao']));
    const weightOk = parseBoolean(findValue(row, ['pesook', 'weightok', 'checkinpeso', 'weightok']));
    const giOk = parseBoolean(findValue(row, ['giok', 'kimono', 'kimono ok', 'giok', 'gi_ok']));

    return {
      name,
      teamName,
      belt,
      ageDivision,
      weightClass,
      gender,
      rankingPoints,
      weightOk,
      giOk,
    };
  }).filter((r) => String(r.name).length > 0);

  // basic validation: collect errors per row
  const errors: Array<{ index: number; message: string }> = [];
  const seen = new Map<string, number>();

  parsed.forEach((p, idx) => {
    if (!p.name) errors.push({ index: idx, message: 'Nome ausente' });
    const original = sourceRows[idx] || {};

    // peso numérico (se houver campo peso/raw)
    const rawWeight = findValue(original, ['peso', 'weight']);
    if (rawWeight !== undefined && String(rawWeight).trim() !== '') {
      const num = Number(String(rawWeight).replace(',', '.').replace(/[^0-9.-]+/g, ''));
      if (!Number.isFinite(num)) {
        errors.push({ index: idx, message: 'Peso inválido (não numérico)' });
      }
    }

    // faixa conhecida
    const rawBelt = findValue(original, ['faixa', 'belt']);
    if (rawBelt !== undefined && String(rawBelt).trim() !== '') {
      const normalized = normalizeKey(String(rawBelt));
      const known = Array.from(beltMap.keys()).map(k => normalizeKey(String(k)));
      if (!known.includes(normalized) && !Array.from(beltMap.values()).some(v => String(v).toLowerCase() === String(p.belt).toLowerCase())) {
        errors.push({ index: idx, message: 'Faixa desconhecida' });
      }
    }

    // data de nascimento (se aparecer em dados brutos)
    const rawDob = findValue(original, ['nascimento', 'data nascimento', 'data_de_nasc', 'birth', 'dob']);
    if (rawDob !== undefined && String(rawDob).trim() !== '') {
      const parseDob = (s: string): Date | null => {
        const cleaned = s.trim();
        // try DD/MM/YYYY
        const dmy = /^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{4})$/.exec(cleaned);
        if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        // try YYYY-MM-DD
        const ymd = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/.exec(cleaned);
        if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
        // try textual month (en/pt)
        const parsed = Date.parse(cleaned);
        if (!Number.isNaN(parsed)) return new Date(parsed);
        return null;
      };
      const d = parseDob(String(rawDob));
      if (!d) {
        errors.push({ index: idx, message: 'Data de nascimento inválida' });
      } else {
        const now = new Date();
        if (d > now) errors.push({ index: idx, message: 'Data de nascimento no futuro' });
      }
    }

    // duplicates by name + dob (if present) or name only
    const dobKey = (rawDob && String(rawDob).trim()) ? normalizeKey(String(rawDob)) : '';
    const key = `${normalizeKey(p.name)}|${dobKey}`;
    if (seen.has(key)) {
      errors.push({ index: idx, message: `Duplicado (linha ${seen.get(key)! + 1})` });
    } else {
      seen.set(key, idx);
    }
  });

  return { parsed, errors };
};
