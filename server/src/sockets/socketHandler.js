function initSocket(io) {
  const emitSlotUpdate = (payload) => {
    const room = `pitch-${payload.pitchId}-${payload.date}`;
    io.to(room).emit('slot-update', payload);
  };

  io.on('connection', (socket) => {
    socket.on('join-pitch', ({ pitchId, date }) => {
      if (pitchId && date) {
        socket.join(`pitch-${pitchId}-${date}`);
      }
    });

    socket.on('leave-pitch', ({ pitchId, date }) => {
      if (pitchId && date) {
        socket.leave(`pitch-${pitchId}-${date}`);
      }
    });

    socket.on('disconnect', () => {});
  });

  return { emitSlotUpdate };
}

module.exports = { initSocket };
