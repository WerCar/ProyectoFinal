// src/routes/turnos.routes.js
import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import {
  crearTurno,
  siguienteTurno,
  cambiarEstadoTurno,
  colaPublica,
  colaPublicaTodas,
  tieneTurnoActivo
} from '../controllers/turnos.controller.js';

const router = Router();

// Crear turno: admin/recepcion/triaje
router.post('/', requireAuth, requireRole('admin','recepcion','triaje'),
  body('pacienteId').isInt({min:1}),
  body('clinicaId').isInt({min:1}),
  crearTurno
);

// Médico/Admin: llamar y cambiar estado
router.post('/siguiente', requireAuth, requireRole('medico','admin'),
  body('clinicaId').isInt({min:1}),
  siguienteTurno
);

router.patch('/:id/estado', requireAuth, requireRole('medico','admin'), cambiarEstadoTurno);

// Colas públicas (TV/Display) sin token
router.get('/publico', colaPublica);
router.get('/publico/universal', colaPublicaTodas);

// Utilidad autenticada
router.get('/paciente/:pacienteId/activo', requireAuth, requireRole('admin','recepcion','triaje','medico'), tieneTurnoActivo);

export default router;
