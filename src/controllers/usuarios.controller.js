import bcrypt from 'bcryptjs';
import { getPool, sql } from '../config/db.js';

// Lista todos los usuarios (solo admin)
export const listarUsuarios = async (_req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().query(`
      SELECT id, nombre, correo, rol, activo
      FROM dbo.Usuarios
      ORDER BY id ASC
    `);
    res.json(rs.recordset);
  } catch (e) {
    console.error('listarUsuarios:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

// Actualiza campos del usuario (nombre, correo, rol, activo opcional)
export const actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  let { nombre, correo, rol, activo } = req.body || {};
  try {
    const pool = await getPool();

    const found = await pool.request().input('id', sql.Int, Number(id))
      .query('SELECT TOP 1 * FROM dbo.Usuarios WHERE id=@id');
    if (!found.recordset.length) return res.status(404).json({ msg: 'Usuario no existe' });

    const u = found.recordset[0];

    // Si cambia correo, validar único
    if (correo && correo !== u.correo) {
      const dup = await pool.request().input('correo', sql.VarChar, correo)
        .query('SELECT 1 FROM dbo.Usuarios WHERE correo=@correo');
      if (dup.recordset.length) return res.status(409).json({ msg: 'Correo ya en uso' });
    }

    await pool.request()
      .input('id', sql.Int, Number(id))
      .input('nombre', sql.VarChar, nombre ?? u.nombre)
      .input('correo', sql.VarChar, correo ?? u.correo)
      .input('rol', sql.VarChar, rol ?? u.rol)
      .input('activo', sql.Bit, (typeof activo === 'boolean') ? (activo ? 1 : 0) : u.activo)
      .query(`
        UPDATE dbo.Usuarios
        SET nombre=@nombre, correo=@correo, rol=@rol, activo=@activo
        WHERE id=@id
      `);

    res.json({ msg: 'Usuario actualizado' });
  } catch (e) {
    console.error('actualizarUsuario:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

// Toggle activo (activar/desactivar)
export const toggleActivoUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.Int, Number(id))
      .query('SELECT TOP 1 activo FROM dbo.Usuarios WHERE id=@id');
    if (!rs.recordset.length) return res.status(404).json({ msg: 'Usuario no existe' });
    const nuevo = rs.recordset[0].activo ? 0 : 1;
    await pool.request().input('id', sql.Int, Number(id)).input('a', sql.Bit, nuevo)
      .query('UPDATE dbo.Usuarios SET activo=@a WHERE id=@id');
    res.json({ msg: nuevo ? 'Activado' : 'Desactivado' });
  } catch (e) {
    console.error('toggleActivoUsuario:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

// Eliminar usuario
// Por defecto: baja lógica (activo=0)
// Hard delete con ?hard=1 (no recomendado si hay FKs, logs, etc.)
export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  const hard = String(req.query.hard || '0') === '1';
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.Int, Number(id))
      .query('SELECT TOP 1 * FROM dbo.Usuarios WHERE id=@id');
    if (!rs.recordset.length) return res.status(404).json({ msg: 'Usuario no existe' });
    const u = rs.recordset[0];

    // No permitir borrarte a ti mismo si quieres: (opcional)
    // if (req.user?.id === u.id) return res.status(400).json({ msg: 'No puedes eliminar tu propio usuario.' });

    if (!hard) {
      await pool.request().input('id', sql.Int, Number(id))
        .query('UPDATE dbo.Usuarios SET activo=0 WHERE id=@id');
      return res.json({ msg: 'Usuario desactivado' });
    }

    await pool.request().input('id', sql.Int, Number(id))
      .query('DELETE FROM dbo.Usuarios WHERE id=@id');
    res.json({ msg: 'Usuario eliminado' });
  } catch (e) {
    console.error('eliminarUsuario:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};
