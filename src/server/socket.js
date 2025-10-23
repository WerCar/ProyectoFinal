import { Server } from 'socket.io';

let ioInstance = null;

export function attachSocket(httpServer) {
  if (ioInstance) return ioInstance;

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] },
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    socket.on('turno:llamando', (payload) => {
      console.log('🩺 [bridge] turno:llamando -> broadcast', payload);
      io.emit('turno:llamando', payload);
    });
    socket.on('turno:nuevo', (payload) => {
      console.log('📥 [bridge] turno:nuevo -> broadcast', payload);
      io.emit('turno:nuevo', payload);
    });
    socket.on('turno:estado', (payload) => {
      console.log('🔄 [bridge] turno:estado -> broadcast', payload);
      io.emit('turno:estado', payload);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Cliente desconectado:', socket.id, 'motivo:', reason);
    });
  });

  ioInstance = io;
  return ioInstance;
}

export function io() {
  if (!ioInstance) throw new Error('Socket.IO no inicializado: attachSocket(httpServer) primero.');
  return ioInstance;
}
