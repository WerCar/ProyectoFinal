// src/middlewares/auth.js
import jwt from 'jsonwebtoken';

/** Valida JWT y adjunta req.user */
export function requireAuth(req, res, next) {
  try {
    const hdr = req.headers['authorization'] || '';
    const [scheme, token] = hdr.split(' ');
    if (!token || String(scheme).toLowerCase() !== 'bearer') {
      return res.status(401).json({ msg: 'No autorizado: token faltante' });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ msg: 'Config JWT ausente' });

    const payload = jwt.verify(token, secret);
    req.user = {
      id: payload.id,
      rol: String(payload.rol || '').toLowerCase(),
      correo: payload.correo || ''
    };
    next();
  } catch (e) {
    return res.status(401).json({ msg: 'No autorizado: token inválido o expirado' });
  }
}

/** Autoriza por rol: requireRole('admin','medico') o requireRole(['admin','medico']) */
export function requireRole(...rolesInput) {
  return (req, res, next) => {
    let roles = rolesInput;
    if (roles.length === 1 && Array.isArray(roles[0])) roles = roles[0];
    roles = roles.map(r => String(r).toLowerCase());

    if (!req.user || !req.user.rol) return res.status(401).json({ msg: 'No autorizado' });
    if (roles.length && !roles.includes(req.user.rol)) return res.status(403).json({ msg: 'Prohibido: rol sin permiso' });
    next();
  };
}
