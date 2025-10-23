// src/controllers/turnos.controller.js
import { getPool, sql } from '../config/db.js';
import { validationResult } from 'express-validator';
import { io } from '../socket.js';

/* ========== Crear turno ========== */
export const crearTurno = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { pacienteId, clinicaId, prioridad = 0 } = req.body;

  try {
    const pool = await getPool();

    // validar existencia
    const [pac, cli] = await Promise.all([
      pool.request().input('id', sql.Int, pacienteId)
        .query('SELECT 1 FROM dbo.Pacientes WHERE id=@id'),
      pool.request().input('id', sql.Int, clinicaId)
        .query('SELECT 1 FROM dbo.Clinicas WHERE id=@id AND activa=1')
    ]);
    if (!pac.recordset.length) return res.status(400).json({ msg: 'Paciente no existe' });
    if (!cli.recordset.length) return res.status(400).json({ msg: 'Clínica no existe o inactiva' });

    // evitar duplicado HOY
    const check = await pool.request()
      .input('pacienteId', sql.Int, pacienteId)
      .query(`
        SELECT TOP 1 id
        FROM dbo.Turnos
        WHERE pacienteId=@pacienteId
          AND estado IN ('pendiente','llamando','en_consulta')
          AND CAST(creadoEn AS date) = CAST(GETDATE() AS date)
      `);
    if (check.recordset.length)
      return res.status(409).json({ msg: 'Paciente ya tiene un turno activo hoy' });

    // insertar con estado y timestamp explícitos
    const rs = await pool.request()
      .input('pacienteId', sql.Int, pacienteId)
      .input('clinicaId', sql.Int, clinicaId)
      .input('prioridad', sql.Int, prioridad)
      .query(`
        INSERT INTO dbo.Turnos(pacienteId,clinicaId,prioridad,estado,creadoEn)
        OUTPUT INSERTED.*
        VALUES(@pacienteId,@clinicaId,@prioridad,'pendiente',GETDATE())
      `);

    const creado = rs.recordset[0];
    io().emit('turno:nuevo', { turno: creado });
    return res.status(201).json(creado);
  } catch (e) {
    console.error('crearTurno error:', e);
    return res.status(500).json({ msg: 'Error interno' });
  }
};

/* ========== Llamar siguiente ========== */
export const siguienteTurno = async (req, res) => {
  const { clinicaId } = req.body;
  if (!clinicaId) return res.status(400).json({ msg: 'clinicaId requerido' });

  try {
    const pool = await getPool();
    const next = await pool.request()
      .input('clinicaId', sql.Int, clinicaId)
      .query(`
        SELECT TOP 1 * FROM dbo.Turnos
        WHERE clinicaId=@clinicaId AND estado='pendiente'
        ORDER BY prioridad DESC, creadoEn ASC
      `);

    if (!next.recordset.length) return res.status(404).json({ msg: 'Sin turnos pendientes' });

    const turno = next.recordset[0];
    await pool.request().input('id', sql.Int, turno.id)
      .query(`UPDATE dbo.Turnos SET estado='llamando', llamadoEn=GETDATE() WHERE id=@id`);

    io().emit('turno:llamando', { turnoId: turno.id, clinicaId });
    return res.json({ msg: 'Turno llamado', turnoId: turno.id });
  } catch (e) {
    console.error('siguienteTurno error:', e);
    return res.status(500).json({ msg: 'Error interno' });
  }
};

/* ========== Cambiar estado ========== */
export const cambiarEstadoTurno = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!['en_consulta','finalizado','ausente'].includes(estado))
    return res.status(400).json({ msg: 'Estado inválido' });

  try {
    const pool = await getPool();
    const campo =
      estado === 'en_consulta' ? ',atendidoEn=GETDATE()' :
      estado === 'finalizado' ? ',cerradoEn=GETDATE()' : '';

    await pool.request().input('id', sql.Int, id)
      .query(`UPDATE dbo.Turnos SET estado='${estado}'${campo} WHERE id=@id`);

    io().emit('turno:estado', { turnoId: Number(id), estado });
    return res.json({ msg: 'Turno actualizado' });
  } catch (e) {
    console.error('cambiarEstadoTurno error:', e);
    return res.status(500).json({ msg: 'Error interno' });
  }
};

/* ========== Colas públicas ========== */
export const colaPublica = async (req, res) => {
  const { clinicaId } = req.query;
  if (!clinicaId) return res.status(400).json({ msg: 'clinicaId requerido' });

  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('clinicaId', sql.Int, clinicaId)
      .query(`
        SELECT TOP 10
          t.id, p.nombre AS paciente, t.estado, t.creadoEn, c.nombre AS clinica
        FROM dbo.Turnos t
        JOIN dbo.Pacientes p ON p.id = t.pacienteId
        JOIN dbo.Clinicas c ON c.id = t.clinicaId
        WHERE t.clinicaId=@clinicaId
          AND t.estado IN ('pendiente','llamando','en_consulta')
        ORDER BY CASE t.estado WHEN 'llamando' THEN 0 WHEN 'en_consulta' THEN 1 ELSE 2 END, t.creadoEn ASC
      `);
    res.json(rs.recordset);
  } catch (e) {
    console.error('colaPublica error:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

export const colaPublicaTodas = async (_req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().query(`
      SELECT TOP 100
        t.id, p.nombre AS paciente, t.estado, t.creadoEn,
        c.id AS clinicaId, c.nombre AS clinica
      FROM dbo.Turnos t
      JOIN dbo.Pacientes p ON p.id = t.pacienteId
      JOIN dbo.Clinicas c ON c.id = t.clinicaId
      WHERE t.estado IN ('pendiente','llamando','en_consulta')
      ORDER BY CASE t.estado WHEN 'llamando' THEN 0 WHEN 'en_consulta' THEN 1 ELSE 2 END, t.creadoEn ASC
    `);
    res.json(rs.recordset);
  } catch (e) {
    console.error('colaPublicaTodas error:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};

/* ========== Utilidad: ¿paciente con turno activo hoy? ========== */
export const tieneTurnoActivo = async (req, res) => {
  const { pacienteId } = req.params;
  if (!pacienteId) return res.status(400).json({ msg: 'pacienteId requerido' });

  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('pacienteId', sql.Int, pacienteId)
      .query(`
        SELECT COUNT(1) AS activos
        FROM dbo.Turnos
        WHERE pacienteId=@pacienteId
          AND estado IN ('pendiente','llamando','en_consulta')
          AND CAST(creadoEn AS date)=CAST(GETDATE() AS date)
      `);
    res.json({ activo: rs.recordset[0].activos > 0 });
  } catch (e) {
    console.error('tieneTurnoActivo error:', e);
    res.status(500).json({ msg: 'Error interno' });
  }
};
