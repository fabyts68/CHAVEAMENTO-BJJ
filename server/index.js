import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import os from 'os';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import { parse as papaParse } from 'papaparse';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/parse-file', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'file required' });
    const originalName = file.originalname || 'file';
    const ext = originalName.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      const data = await pdfParse(file.buffer);
      const text = data.text || '';
      return res.json({ type: 'pdf', text });
    }

    if (['csv', 'txt', 'tsv'].includes(ext)) {
      const txt = file.buffer.toString('utf8');
      const parsed = papaParse(txt, { header: true, skipEmptyLines: true });
      return res.json({ type: 'text', data: parsed.data, fields: parsed.meta.fields });
    }

    if (['xlsx', 'xls'].includes(ext)) {
      const { read, utils } = await import('xlsx');
      const workbook = read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = utils.sheet_to_json(worksheet, { defval: '' });
      return res.json({ type: 'sheet', data: rows });
    }

    return res.status(400).json({ error: 'unsupported file type' });
  } catch (err) {
    console.error('parse-file', err);
    res.status(500).json({ error: 'parse-failed' });
  }
});

const PORT = process.env.PORT || 4000;
const nowIso = () => new Date().toISOString();

function getStore() {
  return db.readData();
}

function saveStore(store) {
  db.writeData(store);
}


app.get('/api/teams', (req, res) => {
  const store = getStore();
  res.json(store.teams.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
});

app.post('/api/teams', (req, res) => {
  const { id = `team-${Date.now()}`, name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const store = getStore();
  const team = { id, name };
  store.teams.push(team);
  store.logs.unshift({ id: `log-${Date.now()}`, timestamp: nowIso(), user: 'Sistema', action: 'CADASTRAR_EQUIPE', details: `Equipe criada: ${name}` });
  saveStore(store);
  io.emit('teams-updated');
  io.emit('audit-updated');
  res.status(201).json(team);
});

app.put('/api/teams/:id', (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  const store = getStore();
  const team = store.teams.find((item) => item.id === id);
  if (!team) return res.status(404).json({ error: 'not found' });
  team.name = name || team.name;
  store.logs.unshift({ id: `log-${Date.now()}`, timestamp: nowIso(), user: 'Sistema', action: 'ATUALIZAR_EQUIPE', details: `Equipe atualizada: ${team.name}` });
  saveStore(store);
  io.emit('teams-updated');
  io.emit('audit-updated');
  res.json(team);
});

app.delete('/api/teams/:id', (req, res) => {
  const id = req.params.id;
  const store = getStore();
  const athletesLinked = store.athletes.filter((a) => a.team?.id === id);
  if (athletesLinked.length > 0) return res.status(409).json({ error: 'team-has-athletes' });
  store.teams = store.teams.filter((item) => item.id !== id);
  store.logs.unshift({ id: `log-${Date.now()}`, timestamp: nowIso(), user: 'Sistema', action: 'EXCLUIR_EQUIPE', details: `Equipe removida: ${id}` });
  saveStore(store);
  io.emit('teams-updated');
  io.emit('audit-updated');
  res.json({ ok: true });
});

app.get('/api/athletes', (req, res) => {
  const store = getStore();
  res.json(store.athletes.map((ath) => ({
    ...ath,
    rankingPoints: ath.rankingPoints ?? 0,
    checkIn: {
      weightOk: !!ath.checkIn?.weightOk,
      giOk: !!ath.checkIn?.giOk,
    },
  })));
});

app.post('/api/athletes', (req, res) => {
  const body = req.body;
  const id = body.id || `ath-${Date.now()}`;
  const store = getStore();
  const athlete = {
    id,
    name: body.name,
    team: body.team || { id: 'none', name: 'Sem filiação' },
    rankingPoints: body.rankingPoints || 0,
    gender: body.gender,
    belt: body.belt,
    ageDivision: body.ageDivision,
    weightClass: body.weightClass,
    checkIn: {
      weightOk: body.checkIn?.weightOk ?? true,
      giOk: body.checkIn?.giOk ?? true,
    },
  };

  store.athletes.push(athlete);
  store.logs.unshift({ id: `log-${Date.now()}`, timestamp: nowIso(), user: 'Sistema', action: 'CADASTRAR_ATLETA', details: `Atleta criado: ${body.name}` });
  saveStore(store);
  io.emit('athletes-updated');
  io.emit('audit-updated');
  res.status(201).json({ ok: true, id });
});

app.post('/api/import-athletes', (req, res) => {
  const body = req.body;
  if (!Array.isArray(body.athletes)) {
    return res.status(400).json({ error: 'athletes must be an array' });
  }

  const store = getStore();
  const teamMap = new Map(store.teams.map((team) => [team.name.toLowerCase(), team]));
  const addedTeams = [];
  let addedCount = 0;

  body.teams?.forEach((team) => {
    if (!team || !team.name) return;
    const key = team.name.toLowerCase();
    if (!teamMap.has(key)) {
      const newTeam = { id: team.id || `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: team.name };
      store.teams.push(newTeam);
      teamMap.set(key, newTeam);
      addedTeams.push(newTeam);
    }
  });

  body.athletes.forEach((row) => {
    if (!row.name) return;
    const teamName = row.team?.name || row.teamName || 'Sem filiação';
    const teamKey = String(teamName).toLowerCase();
    let team = teamMap.get(teamKey);
    if (!team) {
      team = { id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: String(teamName) };
      store.teams.push(team);
      teamMap.set(teamKey, team);
      addedTeams.push(team);
    }

    const athlete = {
      id: row.id || `ath-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: row.name,
      team,
      rankingPoints: row.rankingPoints || 0,
      gender: row.gender,
      belt: row.belt,
      ageDivision: row.ageDivision,
      weightClass: row.weightClass,
      checkIn: {
        weightOk: row.checkIn?.weightOk ?? true,
        giOk: row.checkIn?.giOk ?? true,
      },
    };

    store.athletes.push(athlete);
    addedCount += 1;
  });

  if (addedCount > 0) {
    store.logs.unshift({ id: `log-${Date.now()}`, timestamp: nowIso(), user: 'Sistema', action: 'IMPORTAR_ATLETAS', details: `Importados ${addedCount} atletas via planilha.` });
  }

  saveStore(store);
  io.emit('teams-updated');
  io.emit('athletes-updated');
  io.emit('audit-updated');
  res.json({ ok: true, addedAthletes: addedCount, addedTeams: addedTeams.length });
});

app.put('/api/athletes/:id', (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const store = getStore();
  const athlete = store.athletes.find((item) => item.id === id);
  if (!athlete) return res.status(404).json({ error: 'not found' });
  athlete.name = body.name ?? athlete.name;
  athlete.team = body.team ?? athlete.team;
  athlete.rankingPoints = body.rankingPoints !== undefined ? body.rankingPoints : athlete.rankingPoints;
  athlete.gender = body.gender ?? athlete.gender;
  athlete.belt = body.belt ?? athlete.belt;
  athlete.ageDivision = body.ageDivision ?? athlete.ageDivision;
  athlete.weightClass = body.weightClass ?? athlete.weightClass;
  athlete.checkIn = {
    weightOk: body.checkIn?.weightOk ?? athlete.checkIn.weightOk,
    giOk: body.checkIn?.giOk ?? athlete.checkIn.giOk,
  };
  store.logs.unshift({ id: `log-${Date.now()}`, timestamp: nowIso(), user: 'Sistema', action: 'ATUALIZAR_ATLETA', details: `Atleta atualizado: ${athlete.name}` });
  saveStore(store);
  io.emit('athletes-updated');
  io.emit('audit-updated');
  res.json({ ok: true });
});

app.delete('/api/athletes/:id', (req, res) => {
  const id = req.params.id;
  const store = getStore();
  store.athletes = store.athletes.filter((item) => item.id !== id);
  store.logs.unshift({ id: `log-${Date.now()}`, timestamp: nowIso(), user: 'Sistema', action: 'EXCLUIR_ATLETA', details: `Atleta removido: ${id}` });
  saveStore(store);
  io.emit('athletes-updated');
  io.emit('audit-updated');
  res.json({ ok: true });
});

app.get('/api/logs', (req, res) => {
  const store = getStore();
  res.json(store.logs.slice(0, 200));
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: nowIso() });
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const nets = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // skip internal (i.e. 127.0.0.1)
        if (net.internal) continue;
        addresses.push({ iface: name, address: net.address, family: net.family });
      }
    }
    if (addresses.length > 0) {
      console.log('Listening on network interfaces:');
      addresses.forEach(a => console.log(` - http://${a.address}:${PORT} (iface: ${a.iface})`));
    } else {
      console.log(`Listening on localhost only: http://localhost:${PORT}`);
    }
  } catch (e) {
    console.log(`Server running on http://localhost:${PORT}`);
  }
  console.log('API: /api/teams /api/athletes /api/logs');
});
