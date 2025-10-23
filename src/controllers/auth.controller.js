import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, sql } from '../config/db.js';
import { validationResult } from 'express-validator';

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, correo, password, rol } = req.body;
  try {
    const pool = await getPool();

    const exists = await pool.request()
      .input('correo', sql.VarChar, correo)
      .query('SELECT 1 FROM dbo.Usuarios WHERE correo=@correo');

    if (exists.recordset.length) return res.status(409).json({ msg: 'Correo ya registrado' });

    const hashed = await bcrypt.hash(password, 10);

    await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('correo', sql.VarChar, correo)
      .input('password', sql.VarChar, hashed)
      .input('rol', sql.VarChar, rol)
      .query('INSERT INTO dbo.Usuarios(nombre,correo,password,rol) VALUES(@nombre,@correo,@password,@rol)');

    res.status(201).json({ msg: 'Usuario creado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { correo, password } = req.body;
  try {
    const pool = await getPool();

    const rs = await pool.request()
      .input('correo', sql.VarChar, correo)
      .query('SELECT TOP 1 * FROM dbo.Usuarios WHERE correo=@correo AND activo=1');

    if (!rs.recordset.length) return res.status(404).json({ msg: 'Usuario no encontrado' });

    const user = rs.recordset[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ msg: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, rol: user.rol, correo: user.correo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '2h' }
    );

    res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Error interno' });
  }
};
