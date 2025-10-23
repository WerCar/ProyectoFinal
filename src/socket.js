// src/socket.js
import { Server } from 'socket.io';

let ioInstance = null;

export function initIo(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: { origin: '*' }
  });
  ioInstance.on('connection', (socket) => {
    // listeners de eco (opcionales)
    socket.on('turno:llamando', (payload) => ioInstance.emit('turno:llamando', payload));
    socket.on('turno:estado',   (payload) => ioInstance.emit('turno:estado', payload));
    socket.on('turno:nuevo',    (payload) => ioInstance.emit('turno:nuevo', payload));
  });
  return ioInstance;
}

export function io() {
  if (!ioInstance) throw new Error('Socket.IO no inicializado');
  return ioInstance;
}
