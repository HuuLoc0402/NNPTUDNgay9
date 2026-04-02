let messageController = require('../controllers/messages');
let jwt = require('jsonwebtoken');

// Store online users (userId -> socketId mapping)
let onlineUsers = {};

// Authenticate socket connection
const authenticateSocket = (socket, next) => {
  try {
    let token;
    if (socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    } else if (socket.handshake.headers.authorization) {
      token = socket.handshake.headers.authorization;
      if (token.startsWith('Bearer ')) {
        token = token.split(" ")[1];
      }
    }

    if (!token) {
      return next(new Error('No token provided'));
    }

    let result = jwt.verify(token, 'secret');
    if (result.exp * 1000 < Date.now()) {
      return next(new Error('Token expired'));
    }

    socket.userId = result.id;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = function (io) {
  // Socket middleware for authentication
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers[userId] = socket.id;

    console.log(`User ${userId} connected with socket ${socket.id}`);
    io.emit('userOnline', { userId, status: 'online' });

    // Get conversation messages
    socket.on('getConversation', async (data, callback) => {
      try {
        const { otherUserId } = data;
        const messages = await messageController.getConversation(
          userId,
          otherUserId
        );
        callback({ success: true, messages });
      } catch (error) {
        callback({ success: false, message: error.message });
      }
    });

    // Get last messages from each conversation
    socket.on('getLastMessages', async (data, callback) => {
      try {
        const conversations = await messageController.getLastMessages(userId);
        callback({ success: true, conversations });
      } catch (error) {
        callback({ success: false, message: error.message });
      }
    });

    // Send message
    socket.on('sendMessage', async (data, callback) => {
      try {
        const { to, messageContent } = data;

        if (!to || !messageContent) {
          return callback({
            success: false,
            message: 'to and messageContent are required'
          });
        }

        // Create message in database
        const message = await messageController.createMessage(
          userId,
          to,
          messageContent
        );

        // If recipient is online, notify them in real-time
        if (onlineUsers[to]) {
          io.to(onlineUsers[to]).emit('newMessage', message);
        }

        // Emit to sender's room
        socket.emit('messageSent', message);

        callback({ success: true, message });
      } catch (error) {
        callback({ success: false, message: error.message });
      }
    });

    // User typing
    socket.on('typing', (data) => {
      const { to } = data;
      if (onlineUsers[to]) {
        io.to(onlineUsers[to]).emit('userTyping', {
          userId,
          status: true
        });
      }
    });

    // User stopped typing
    socket.on('stopTyping', (data) => {
      const { to } = data;
      if (onlineUsers[to]) {
        io.to(onlineUsers[to]).emit('userTyping', {
          userId,
          status: false
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      delete onlineUsers[userId];
      console.log(`User ${userId} disconnected`);
      io.emit('userOffline', { userId, status: 'offline' });
    });
  });
};
