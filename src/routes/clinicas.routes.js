// src/routes/clinicas.routes.js
import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { listarClinicas, crearClinica, actualizarClinica, eliminarClinica } from '../controllers/clinicas.controller.js';

const router = Router();

// GET para admin/recepcion/triaje/medico (necesario para cargar combos)
router.get('/', requireAuth, requireRole('admin','recepcion','triaje','medico'), listarClinicas);

// CRUD solo admin
router.post('/',  requireAuth, requireRole('admin'), body('nombre').isString().trim().notEmpty(), crearClinica);
router.patch('/:id', requireAuth, requireRole('admin'), actualizarClinica);
router.delete('/:id', requireAuth, requireRole('admin'), eliminarClinica);

export default router;
