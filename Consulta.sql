/* ===========================================================
   SISTEMA DE TURNOS HOSPITALARIOS - CONSULTA INICIAL
   Universidad Mariano Gálvez de Guatemala - Desarrollo Web 2025
   Autor: Werner Cárcamo  |  Carné: 76909-20-10779
   Cumple con: SQL Server (BD), JWT (en aplicación), Sockets (en aplicación)

   Este script crea:
   - Base de datos: SistemaTurnos (si no existe)
   - Tablas: Usuarios, Pacientes, Clinicas, Turnos
   - Constraints, índices, defaults, checks
   - Datos semilla (usuarios, clínicas)
   - (Opcional) Login/Usuario de aplicación con permisos mínimos

   NOTA: si ya existe la base y objetos, el script valida y crea sólo lo faltante.
   =========================================================== */

SET NOCOUNT ON;

/* ========================
   0) Parámetros opcionales
   ======================== */
DECLARE @DBName       sysname        = N'SistemaTurnos';
DECLARE @AppLogin     sysname        = N'app_user';       -- opcional: login de SQL Server
DECLARE @AppPassword  nvarchar(128)  = N'Umg2025++';      -- opcional: contraseña del login

/* ==============================
   1) Crear base de datos si falta
   ============================== */
IF DB_ID(@DBName) IS NULL
BEGIN
    PRINT N'Creando base de datos ' + @DBName + N' ...';
    DECLARE @sqlCreateDB nvarchar(max) =
    N'CREATE DATABASE [' + @DBName + N']
      COLLATE SQL_Latin1_General_CP1_CI_AS;';
    EXEC(@sqlCreateDB);
END
ELSE
BEGIN
    PRINT N'Base de datos ' + @DBName + N' ya existe. Continuando...';
END
GO

/* Usar la base de datos */
DECLARE @DBName sysname = N'SistemaTurnos';
EXEC('USE [' + @DBName + ']');
GO

/* ======================================
   2) Opciones recomendadas (si aplica)
   ====================================== */
-- Habilitar snapshot isolation (opcional, útil en concurrencia)
IF (SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = DB_NAME()) = 0
BEGIN
    ALTER DATABASE CURRENT SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
END
GO

/* ==========================
   3) Crear esquema por defecto
   ========================== */
-- (Usamos dbo por simplicidad)

/* ==========================
   4) Tablas principales
   ========================== */

-- 4.1) Usuarios
IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Usuarios (
        id          INT           IDENTITY(1,1) PRIMARY KEY,
        nombre      VARCHAR(100)  NOT NULL,
        correo      VARCHAR(120)  NOT NULL,
        [password]  VARCHAR(120)  NOT NULL,  -- almacena hash bcrypt
        rol         VARCHAR(20)   NOT NULL,  -- admin | recepcion | medico | tv
        activo      BIT           NOT NULL CONSTRAINT DF_Usuarios_activo DEFAULT(1),
        creadoEn    DATETIME2(0)  NOT NULL CONSTRAINT DF_Usuarios_creadoEn DEFAULT(SYSDATETIME())
    );

    -- correo único
    CREATE UNIQUE INDEX UX_Usuarios_correo ON dbo.Usuarios(correo);

    -- roles válidos
    ALTER TABLE dbo.Usuarios ADD CONSTRAINT CK_Usuarios_rol
      CHECK (rol IN ('admin','recepcion','medico','tv'));
END
ELSE
BEGIN
    PRINT 'Tabla dbo.Usuarios ya existe.';
END

-- 4.2) Pacientes
IF OBJECT_ID('dbo.Pacientes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pacientes (
        id         INT           IDENTITY(1,1) PRIMARY KEY,
        dpi        VARCHAR(25)   NULL,
        nombre     VARCHAR(150)  NOT NULL,
        edad       INT           NULL,
        telefono   VARCHAR(30)   NULL,
        creadoEn   DATETIME2(0)  NOT NULL CONSTRAINT DF_Pacientes_creadoEn DEFAULT(SYSDATETIME())
    );

    -- Índice único filtrado para DPI (cuando no es NULL)
    CREATE UNIQUE INDEX UX_Pacientes_dpi
      ON dbo.Pacientes(dpi)
      WHERE dpi IS NOT NULL;

    -- Unique filtrado sobre (nombre, telefono) cuando DPI es NULL y teléfono no es NULL
    CREATE UNIQUE INDEX UX_Pacientes_nombre_telefono_sinDPI
      ON dbo.Pacientes(nombre, telefono)
      WHERE dpi IS NULL AND telefono IS NOT NULL;

    -- Validación de edad
    ALTER TABLE dbo.Pacientes ADD CONSTRAINT CK_Pacientes_edad
      CHECK (edad IS NULL OR edad >= 0);
END
ELSE
BEGIN
    PRINT 'Tabla dbo.Pacientes ya existe.';
END

-- 4.3) Clinicas
IF OBJECT_ID('dbo.Clinicas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Clinicas (
        id        INT           IDENTITY(1,1) PRIMARY KEY,
        nombre    VARCHAR(120)  NOT NULL,
        activa    BIT           NOT NULL CONSTRAINT DF_Clinicas_activa DEFAULT(1),
        creadoEn  DATETIME2(0)  NOT NULL CONSTRAINT DF_Clinicas_creadoEn DEFAULT(SYSDATETIME())
    );

    -- nombre único
    CREATE UNIQUE INDEX UX_Clinicas_nombre ON dbo.Clinicas(nombre);
END
ELSE
BEGIN
    PRINT 'Tabla dbo.Clinicas ya existe.';
END

-- 4.4) Turnos
IF OBJECT_ID('dbo.Turnos', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Turnos (
        id          INT           IDENTITY(1,1) PRIMARY KEY,
        pacienteId  INT           NOT NULL,
        clinicaId   INT           NOT NULL,
        estado      VARCHAR(20)   NOT NULL CONSTRAINT DF_Turnos_estado DEFAULT('pendiente'),
        prioridad   INT           NOT NULL CONSTRAINT DF_Turnos_prioridad DEFAULT(0),
        creadoEn    DATETIME2(0)  NOT NULL CONSTRAINT DF_Turnos_creadoEn DEFAULT(SYSDATETIME()),
        llamadoEn   DATETIME2(0)  NULL,
        atendidoEn  DATETIME2(0)  NULL,
        cerradoEn   DATETIME2(0)  NULL
    );

    -- FKs
    ALTER TABLE dbo.Turnos
      ADD CONSTRAINT FK_Turnos_Pacientes
      FOREIGN KEY (pacienteId) REFERENCES dbo.Pacientes(id);

    ALTER TABLE dbo.Turnos
      ADD CONSTRAINT FK_Turnos_Clinicas
      FOREIGN KEY (clinicaId) REFERENCES dbo.Clinicas(id);

    -- Estados válidos
    ALTER TABLE dbo.Turnos ADD CONSTRAINT CK_Turnos_estado
      CHECK (estado IN ('pendiente','llamando','en_consulta','finalizado','ausente'));

    -- Índice para selección por clínica/estado con prioridad
    CREATE INDEX IX_Turnos_Clinica_Estado_Prioridad_Creado
      ON dbo.Turnos(clinicaId, estado, prioridad DESC, creadoEn ASC);

    -- Índice para verificar turnos activos por paciente
    CREATE INDEX IX_Turnos_Paciente_Activos
      ON dbo.Turnos(pacienteId, estado);
END
ELSE
BEGIN
    PRINT 'Tabla dbo.Turnos ya existe.';
END
GO

/* =======================================
   5) Datos semilla (idempotentes)
   ======================================= */

-- 5.1) Clínicas base (si no existen)
IF NOT EXISTS (SELECT 1 FROM dbo.Clinicas WITH (NOLOCK))
BEGIN
    INSERT INTO dbo.Clinicas(nombre, activa)
    VALUES (N'Medicina General', 1),
           (N'Pediatría', 1),
           (N'Ginecología', 1),
           (N'Traumatología', 1);
END

-- 5.2) Usuarios base (hash bcrypt para "Umg2025++")
-- Hash usado (cost=10): $2b$10$0YniJnS/1HbVqvN.qS6jN.celK1J/Ehh2ET0Lx4eBOE6SulXbBoqy
DECLARE @hashUmg VARCHAR(100) = '$2b$10$0YniJnS/1HbVqvN.qS6jN.celK1J/Ehh2ET0Lx4eBOE6SulXbBoqy';

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE correo = 'admin@demo.com')
BEGIN
    INSERT INTO dbo.Usuarios(nombre, correo, [password], rol, activo)
    VALUES (N'Admin',   'admin@demo.com',   @hashUmg, 'admin',    1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE correo = 'recep@demo.com')
BEGIN
    INSERT INTO dbo.Usuarios(nombre, correo, [password], rol, activo)
    VALUES (N'Recepción', 'recep@demo.com', @hashUmg, 'recepcion', 1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE correo = 'medico@demo.com')
BEGIN
    INSERT INTO dbo.Usuarios(nombre, correo, [password], rol, activo)
    VALUES (N'Médico', 'medico@demo.com',   @hashUmg, 'medico',    1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE correo = 'tv@demo.com')
BEGIN
    INSERT INTO dbo.Usuarios(nombre, correo, [password], rol, activo)
    VALUES (N'Display TV', 'tv@demo.com',   @hashUmg, 'tv',        1);
END
GO

/* ==================================================
   6) Usuario de base de datos y permisos mínimos
      (OPCIONAL) Crear login a nivel servidor y user
   ================================================== */

BEGIN TRY
    -- Crear LOGIN a nivel servidor si no existe (requiere permisos de sysadmin o securityadmin)
    IF SUSER_ID(@AppLogin) IS NULL
    BEGIN
        DECLARE @sqlCreateLogin nvarchar(max) =
        N'CREATE LOGIN [' + @AppLogin + N'] WITH PASSWORD = N''' + @AppPassword + N''',
          CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;';
        EXEC(@sqlCreateLogin);
        PRINT N'LOGIN [' + @AppLogin + N'] creado.';
    END
    ELSE
    BEGIN
        PRINT N'LOGIN [' + @AppLogin + N'] ya existe.';
    END
END TRY
BEGIN CATCH
    PRINT N'No se pudo crear el LOGIN (posible hosting sin permisos de servidor). Detalle: ' + ERROR_MESSAGE();
END CATCH;
GO

-- Crear USUARIO en la base y rol con permisos mínimos
DECLARE @AppLogin  sysname = N'app_user';
DECLARE @DBUser    sysname = N'app_user';
DECLARE @RoleName  sysname = N'app_role';

-- Crear user si no existe
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @DBUser)
BEGIN
    BEGIN TRY
        DECLARE @sqlCreateUser nvarchar(max) =
        N'CREATE USER [' + @DBUser + N'] FOR LOGIN [' + @AppLogin + N'];';
        EXEC(@sqlCreateUser);
        PRINT N'USER [' + @DBUser + N'] creado en BD.';
    END TRY
    BEGIN CATCH
        PRINT N'No se pudo crear USER (si es Azure/hosting sin login, cree un contained user). Detalle: ' + ERROR_MESSAGE();
    END CATCH
END
ELSE
    PRINT N'USER [' + @DBUser + N'] ya existe en BD.';

-- Crear rol si no existe
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @RoleName AND type = 'R')
BEGIN
    EXEC('CREATE ROLE [' + @RoleName + '];');
END

-- Agregar user al rol
BEGIN TRY
    EXEC sp_addrolemember @RoleName, @DBUser;
END TRY
BEGIN CATCH
    -- Ignorar si ya es miembro
END CATCH

-- Conceder permisos mínimos al rol
-- (SELECT/INSERT/UPDATE para operación normal; DELETE si desea permitir borrado lógico)
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pacientes TO [app_role];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Clinicas  TO [app_role];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Turnos    TO [app_role];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Usuarios  TO [app_role];
GO

/* ===========================================
   7) Comprobaciones rápidas (diagnóstico)
   =========================================== */
PRINT '--- RESUMEN ---';
PRINT 'BD actual: ' + DB_NAME();
PRINT 'Usuarios en sistema:';
SELECT id, nombre, correo, rol, activo FROM dbo.Usuarios ORDER BY id;

PRINT 'Clínicas registradas:';
SELECT id, nombre, activa FROM dbo.Clinicas ORDER BY id;

PRINT 'Esquema listo. Puede ejecutar la aplicación.';
