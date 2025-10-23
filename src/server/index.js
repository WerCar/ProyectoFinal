// src/server/index.js
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';
import authRoutes from '../routes/auth.routes.js';
import clinicasRoutes from '../routes/clinicas.routes.js';
import pacientesRoutes from '../routes/pacientes.routes.js';
import turnosRoutes from '../routes/turnos.routes.js';
import usuariosRoutes from '../routes/usuarios.routes.js';

import { initIo } from '../socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
initIo(server);

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// static
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// api
app.use('/api/auth', authRoutes);
app.use('/api/clinicas', clinicasRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/usuarios', usuariosRoutes);

// fallback al index.html si lo necesitas (opcional)
// app.get('*', (_,res) => res.sendFile(path.join(__dirname,'..','..','public','index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
