import { getPool, sql } from '../config/db.js';
import { validationResult } from 'express-validator';

export const listarClinicas = async (_req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().query('SELECT id, nombre, activa FROM dbo.Clinicas ORDER BY id ASC');
    res.json(rs.recordset);
  } catch (e) {
    console.error('listarClinicas:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

export const crearClinica = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, activa = true } = req.body;
  try {
    const pool = await getPool();

    const exists = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .query('SELECT 1 FROM dbo.Clinicas WHERE nombre=@nombre');
    if (exists.recordset.length) return res.status(409).json({ msg: 'Nombre de clínica ya existe' });

    const rs = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('activa', sql.Bit, !!activa)
      .query('INSERT INTO dbo.Clinicas(nombre,activa) OUTPUT INSERTED.* VALUES(@nombre,@activa)');

    res.status(201).json(rs.recordset[0]);
  } catch (e) {
    console.error('crearClinica:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

export const actualizarClinica = async (req, res) => {
  const { id } = req.params;
  const { nombre, activa } = req.body;

  try {
    const pool = await getPool();

    const found = await pool.request().input('id', sql.Int, Number(id))
      .query('SELECT * FROM dbo.Clinicas WHERE id=@id');
    if (!found.recordset.length) return res.status(404).json({ msg: 'Clínica no existe' });
    const c = found.recordset[0];

    if (nombre && nombre !== c.nombre) {
      const exists = await pool.request().input('nombre', sql.VarChar, nombre)
        .query('SELECT 1 FROM dbo.Clinicas WHERE nombre=@nombre');
      if (exists.recordset.length) return res.status(409).json({ msg: 'Nombre ya existe' });
    }

    await pool.request()
      .input('id', sql.Int, Number(id))
      .input('nombre', sql.VarChar, nombre ?? c.nombre)
      .input('activa', sql.Bit, (typeof activa === 'boolean') ? (activa ? 1 : 0) : c.activa)
      .query('UPDATE dbo.Clinicas SET nombre=@nombre, activa=@activa WHERE id=@id');

    res.json({ msg: 'Clínica actualizada' });
  } catch (e) {
    console.error('actualizarClinica:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

// DELETE: baja lógica por defecto; hard=1 intenta eliminación definitiva
export const eliminarClinica = async (req, res) => {
  const { id } = req.params;
  const hard = String(req.query.hard || '0') === '1';
  try {
    const pool = await getPool();
    const x = await pool.request().input('id', sql.Int, Number(id))
      .query('SELECT TOP 1 * FROM dbo.Clinicas WHERE id=@id');
    if (!x.recordset.length) return res.status(404).json({ msg: 'Clínica no existe' });

    if (!hard) {
      await pool.request().input('id', sql.Int, Number(id))
        .query('UPDATE dbo.Clinicas SET activa=0 WHERE id=@id');
      return res.json({ msg: 'Clínica desactivada' });
    }

    // Verificar dependencias (turnos)
    const deps = await pool.request().input('id', sql.Int, Number(id))
      .query('SELECT TOP 1 1 FROM dbo.Turnos WHERE clinicaId=@id');
    if (deps.recordset.length) {
      return res.status(409).json({ msg: 'No se puede eliminar: posee turnos asociados. Desactívela en su lugar.' });
    }

    await pool.request().input('id', sql.Int, Number(id))
      .query('DELETE FROM dbo.Clinicas WHERE id=@id');
    res.json({ msg: 'Clínica eliminada' });
  } catch (e) {
    console.error('eliminarClinica:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};
