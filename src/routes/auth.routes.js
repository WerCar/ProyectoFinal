import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { register, login } from '../controllers/auth.controller.js';

const router = Router();

// Login (público)
router.post('/login', body('correo').isString().notEmpty(), body('password').isString().notEmpty(), login);

// Register (solo admin)
router.post('/register', requireAuth, requireRole(['admin']),
  body('nombre').isString().notEmpty(),
  body('correo').isString().notEmpty(),
  body('password').isString().notEmpty(),
  body('rol').isString().notEmpty(),
  register
);

export default router;
