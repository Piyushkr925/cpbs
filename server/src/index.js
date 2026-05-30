require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDatabase, syncTables } = require('./config/syncDatabase');
const { initSocket } = require('./sockets/socketHandler');
const { startExpiryJob } = require('./jobs/expiryJob');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();
    await syncTables({ alter: true, force: false });

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
      },
    });

    const socketApi = initSocket(io);
    app.set('io', socketApi);

    startExpiryJob(socketApi);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
