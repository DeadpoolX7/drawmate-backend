
import express from 'express';
import http from 'http';
import { Server,Socket } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [ 'https://drawmate.netlify.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors());

const rooms = new Map<string, Set<string>>();

function generateRoomId(): string {
  const num:string =  Math.floor(100000 + Math.random() * 900000).toString();
  console.log(num);
  return num;
}

io.on('connection', (socket:Socket) => {
  console.log('A user connected');

  socket.on('createRoom', (callback) => {
    const roomId = generateRoomId();
    rooms.set(roomId, new Set([socket.id]));
    socket.join(roomId);
    callback(roomId);
  });

  socket.on('joinRoom', (roomId, callback:(success: boolean, message:string)=>void) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room && room.size < 2) {
        room.add(socket.id);
        socket.join(roomId);
         
        const roomCreator = Array.from(room)[0];
        io.to(roomCreator).emit('userJoined', { roomId });
        callback(true, 'Joined the room successfully');
        socket.to(roomId).emit('userJoined',{userId:socket.id})
      } else {
        callback(false, 'Room is full');
      }
    } else {
      callback(false, 'Room does not exist');
    }
  });

  socket.on('draw', ({ roomId, x1, y1, x2, y2 }) => {
    socket.to(roomId).emit('drawLine', { x1, y1, x2, y2 });
  });
  socket.on('sendMessage', ({ roomId, message }) => {
    console.log(message)
    io.to(roomId).emit('chatMessage', message);
  });
  socket.on('disconnect', () => {
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        if (users.size === 0) {
          rooms.delete(roomId);
          
        }
      }
    });
    console.log("user disconnected")
  });
});
const port = process.env.PORT || 8000;
server.listen(  port, () => {
  console.log(`Server is running on port ${port}`);
});