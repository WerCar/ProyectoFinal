import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import {
  listarUsuarios,
  actualizarUsuario,
  toggleActivoUsuario,
  eliminarUsuario
} from '../controllers/usuarios.controller.js';

const router = Router();

// Todas las rutas de usuarios -> admin
router.use(requireAuth, requireRole('admin'));

router.get('/', listarUsuarios);
router.patch('/:id', actualizarUsuario);
router.patch('/:id/toggle', toggleActivoUsuario);
router.delete('/:id', eliminarUsuario);

export default router;
