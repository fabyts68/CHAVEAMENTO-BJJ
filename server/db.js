import fs from 'fs';
import path from 'path';

const DATA_PATH = path.resolve(process.cwd(), 'server', 'data.json');
const DEFAULT_STORE = {
  teams: [],
  athletes: [],
  logs: [],
};

function readData() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      fs.writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
    }
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch (error) {
    console.error('Failed to read store file', error);
    return DEFAULT_STORE;
  }
}

const TEMP_DATA_PATH = `${DATA_PATH}.tmp`;

function writeData(data) {
  const payload = JSON.stringify(data, null, 2);
  fs.writeFileSync(TEMP_DATA_PATH, payload, 'utf-8');
  fs.renameSync(TEMP_DATA_PATH, DATA_PATH);
}

export default {
  readData,
  writeData,
};
