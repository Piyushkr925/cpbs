const express = require('express');
const authRoutes = require('./authRoutes');
const pitchRoutes = require('./pitchRoutes');
const slotRoutes = require('./slotRoutes');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/pitches', authMiddleware, pitchRoutes);
router.use('/slots', authMiddleware, slotRoutes);

router.post('/reserve-slot', authMiddleware, bookingController.reserveSlot.bind(bookingController));
router.post('/confirm-booking', authMiddleware, bookingController.confirmBooking.bind(bookingController));
router.get('/active-reservation', authMiddleware, bookingController.getActiveReservation.bind(bookingController));
router.get('/my-bookings', authMiddleware, bookingController.getMyBookings.bind(bookingController));

module.exports = router;
