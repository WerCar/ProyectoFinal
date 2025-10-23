
# Sistema de Turnos Hospitalarios  
Universidad Mariano Gálvez de Guatemala  
Carrera: Ingeniería en Sistemas  
Curso: Desarrollo Web – Proyecto Final 2025  
Estudiante: Werner Cárcamo  
Carné: 76909-20-10779  
Docente: Ing. Carlos Illescas  
Correo del docente: cillescasd1@miumg.edu.gt  
Fecha de entrega: 15 de noviembre de 2025  

## 1. Descripción General
El proyecto Sistema de Turnos Hospitalarios fue desarrollado como trabajo final del curso Desarrollo Web, cumpliendo con todos los requerimientos solicitados, incluyendo el uso obligatorio de SQL Server, JWT y un entorno web moderno con Node.js y Socket.IO.  

Su propósito principal es automatizar y mejorar la gestión de turnos médicos dentro de clínicas y hospitales, permitiendo al personal administrativo y médico controlar el flujo de pacientes de forma eficiente, reduciendo tiempos de espera y errores humanos.

El sistema implementa módulos independientes para cada rol (Administrador, Recepción, Médico y Display TV), conectados entre sí en tiempo real.

## 2. Objetivos del Proyecto
**Objetivo general:**  
Diseñar e implementar un sistema web completo para la gestión de turnos hospitalarios, integrando tecnologías modernas y seguras en un entorno productivo.

**Objetivos específicos:**
- Registrar pacientes con validación de duplicados (por DPI o combinación de nombre y teléfono).  
- Asignar y gestionar turnos médicos en tiempo real mediante Socket.IO.  
- Implementar autenticación JWT para proteger las rutas y los roles de usuario.  
- Desarrollar una interfaz moderna, responsiva y funcional, basada en colorimetría profesional (glassmorphism).  
- Cumplir con la estructura y requerimientos académicos del curso.  

## 3. Arquitectura del Sistema
El sistema fue diseñado bajo el patrón MVC (Modelo – Vista – Controlador), garantizando una estructura clara, mantenible y escalable.  
El backend se construyó en Node.js con Express, mientras que el frontend se implementó con HTML, CSS y JavaScript nativo.  
La base de datos se gestiona en SQL Server, cumpliendo con el requerimiento académico y ofreciendo integridad transaccional.

**Diagrama general de componentes:**
```
Usuario → Navegador Web → Servidor Node.js (Express)
                               │
                               ├── JWT → Autenticación y roles
                               ├── Socket.IO → Comunicación en tiempo real
                               └── SQL Server → Persistencia de datos
```

## 4. Estructura del Proyecto
| Carpeta / Archivo | Contenido | Descripción |
|--------------------|------------|-------------|
| /src/config/db.js | Configuración base de datos | Conexión a SQL Server mediante mssql. |
| /src/controllers/ | Controladores del sistema | Lógica para usuarios, turnos, clínicas y pacientes. |
| /src/routes/ | Definición de rutas API REST | Define endpoints del backend. |
| /src/middlewares/ | Validación y roles | Manejo de JWT y permisos de usuario. |
| /public/ | Interfaz web | HTML, CSS y JS para las vistas del sistema. |
| /sql/Consulta inicial.sql | Script SQL | Creación de tablas y datos iniciales. |
| .env | Variables de entorno | Configuración local (no se sube al repositorio). |

## 5. Tecnologías Utilizadas
| Tecnología | Uso | Justificación |
|-------------|-----|----------------|
| Node.js + Express | Backend y API REST | Plataforma eficiente, modular y compatible con ASP.NET hosting. |
| SQL Server | Base de datos relacional | Requerimiento del curso y estándar empresarial. |
| JWT (JSON Web Token) | Autenticación y seguridad | Protege rutas y garantiza sesiones seguras. |
| Socket.IO | Comunicación en tiempo real | Sincroniza todos los paneles y la pantalla de TV. |
| HTML, CSS, JS (Vanilla) | Frontend web | Interfaz moderna, ligera y adaptable. |
| ASP.NET Hosting | Despliegue en la nube | Entorno profesional compatible con Node.js y SQL Server. |

## 6. Roles del Sistema
| Rol | Descripción | Vista HTML |
|------|--------------|------------|
| Administrador | Gestiona usuarios, clínicas y configuración general. | admin.html |
| Recepción | Registra pacientes y crea turnos. | panel-recepcion.html |
| Médico | Llama a pacientes y actualiza estados (en consulta, finalizado, ausente). | panel-medico.html |
| Display (TV) | Muestra los turnos activos con sonido y voz. | display.html |

## 7. Base de Datos
El script de creación se encuentra en la carpeta /sql/Consulta inicial.sql.

**Tablas principales:**
- Usuarios – Almacena credenciales y roles del sistema.  
- Pacientes – Registra información personal y de contacto.  
- Clinicas – Define las áreas o consultorios médicos.  
- Turnos – Registra la asignación de pacientes a clínicas y sus estados.  

**Estados de turno:**  
- pendiente – Aún no atendido.  
- llamando – Paciente llamado por médico.  
- en_consulta – Paciente actualmente en consulta.  
- finalizado – Consulta concluida.  
- ausente – Paciente no se presentó.  

(Rebuild Azure - test)
