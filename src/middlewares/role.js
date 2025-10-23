// src/middlewares/role.js
export const allowRoles = (...roles) => (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ msg: 'No autenticado' });
    if (!roles.includes(user.rol)) {
      return res.status(403).json({ msg: 'No autorizado' });
    }
    next();
  } catch {
    return res.status(401).json({ msg: 'No autenticado' });
  }
};
