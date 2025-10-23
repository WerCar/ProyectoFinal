// src/server/index.js
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';

// Rutas
import authRoutes from '../routes/auth.routes.js';
import clinicasRoutes from '../routes/clinicas.routes.js';
import pacientesRoutes from '../routes/pacientes.routes.js';
import turnosRoutes from '../routes/turnos.routes.js';
import usuariosRoutes from '../routes/usuarios.routes.js';

// Socket
import { initIo } from '../socket.js';

// Configuración de paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicialización del servidor
const app = express();
const server = http.createServer(app);
initIo(server);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/clinicas', clinicasRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Fallback (opcional, si tienes SPA o frontend)
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

// Puerto (Azure asigna su propio process.env.PORT)
const PORT = process.env.PORT || 3000;

// Escuchar en todas las interfaces (requerido por Azure App Service)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor escuchando en el puerto ${PORT}`);
});


