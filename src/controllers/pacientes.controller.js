// src/controllers/pacientes.controller.js
import { getPool, sql } from '../config/db.js';
import { validationResult } from 'express-validator';

// Crea paciente con validaciones de duplicado
export const crearPaciente = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  let { dpi, nombre, edad, telefono } = req.body;
  nombre = (nombre || '').trim();
  telefono = (telefono || '').trim();
  dpi = (dpi || '').trim();
  if (!nombre) return res.status(400).json({ msg: 'nombre requerido' });

  try {
    const pool = await getPool();

    if (dpi) {
      const dupDpi = await pool.request().input('dpi', sql.VarChar, dpi)
        .query('SELECT TOP 1 id FROM dbo.Pacientes WHERE dpi=@dpi');
      if (dupDpi.recordset.length) return res.status(409).json({ msg: 'Ya existe un paciente con ese DPI' });
    } else if (telefono) {
      const dupNT = await pool.request()
        .input('nombre', sql.VarChar, nombre)
        .input('telefono', sql.VarChar, telefono)
        .query('SELECT TOP 1 id FROM dbo.Pacientes WHERE nombre=@nombre AND telefono=@telefono');
      if (dupNT.recordset.length) return res.status(409).json({ msg: 'Ya existe un paciente con ese nombre y teléfono' });
    }

    const rs = await pool.request()
      .input('dpi', sql.VarChar, dpi || null)
      .input('nombre', sql.VarChar, nombre)
      .input('edad', sql.Int, (edad ?? null))
      .input('telefono', sql.VarChar, telefono || null)
      .query(`
        INSERT INTO dbo.Pacientes(dpi,nombre,edad,telefono)
        OUTPUT INSERTED.*
        VALUES(@dpi,@nombre,@edad,@telefono)
      `);

    res.status(201).json(rs.recordset[0]);
  } catch (e) {
    console.error('crearPaciente error:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

// Verdadero flexible: 1,true,TRUE,yes
function isTruthy(v){
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

// Lista pacientes; si libres es “verdadero”, solo sin turno activo HOY
export const listarPacientes = async (req, res) => {
  const { q, libres } = req.query;
  const soloLibres = isTruthy(libres);

  try {
    const pool = await getPool();
    const reqst = pool.request();

    let where = '1=1';
    if (q) {
      reqst.input('q', sql.VarChar, `%${q}%`);
      where += ' AND (p.nombre LIKE @q OR p.dpi LIKE @q OR p.telefono LIKE @q)';
    }
    if (soloLibres) {
      where += `
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.Turnos t
          WHERE t.pacienteId = p.id
            AND t.estado IN ('pendiente','llamando','en_consulta')
            AND CAST(t.creadoEn AS date) = CAST(GETDATE() AS date)
        )
      `;
    }

    const rs = await reqst.query(`
      SELECT TOP 200 p.*
      FROM dbo.Pacientes p
      WHERE ${where}
      ORDER BY p.id DESC
    `);

    return res.json(rs.recordset);
  } catch (e) {
    console.error('listarPacientes error:', e);
    return res.status(500).json({ msg: 'Error interno' });
  }
};
