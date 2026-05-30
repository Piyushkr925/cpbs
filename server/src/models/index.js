const sequelize = require('../config/database');
const User = require('./User');
const Pitch = require('./Pitch');
const Slot = require('./Slot');
const Booking = require('./Booking');
const Reservation = require('./Reservation');

Pitch.hasMany(Slot, { foreignKey: 'pitch_id', as: 'slots' });
Slot.belongsTo(Pitch, { foreignKey: 'pitch_id', as: 'pitch' });

User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Pitch.hasMany(Booking, { foreignKey: 'pitch_id', as: 'bookings' });
Booking.belongsTo(Pitch, { foreignKey: 'pitch_id', as: 'pitch' });

Slot.hasMany(Booking, { foreignKey: 'slot_id', as: 'bookings' });
Booking.belongsTo(Slot, { foreignKey: 'slot_id', as: 'slot' });

User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Pitch.hasMany(Reservation, { foreignKey: 'pitch_id', as: 'reservations' });
Reservation.belongsTo(Pitch, { foreignKey: 'pitch_id', as: 'pitch' });

Slot.hasMany(Reservation, { foreignKey: 'slot_id', as: 'reservations' });
Reservation.belongsTo(Slot, { foreignKey: 'slot_id', as: 'slot' });

module.exports = {
  sequelize,
  User,
  Pitch,
  Slot,
  Booking,
  Reservation,
};
