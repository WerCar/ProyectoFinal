// src/routes/pacientes.routes.js
import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { crearPaciente, listarPacientes } from '../controllers/pacientes.controller.js';

const router = Router();

// Listar para admin/recepcion/triaje/medico
router.get('/', requireAuth, requireRole('admin','recepcion','triaje','medico'), listarPacientes);

// Crear para admin/recepcion/triaje
router.post('/', requireAuth, requireRole('admin','recepcion','triaje'), body('nombre').isString().trim().notEmpty(), crearPaciente);

export default router;
