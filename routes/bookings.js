const express = require("express");
const Booking = require("../models/Booking");
const Flight = require("../models/Flight");
const asyncHandler = require("../middleware/asyncHandler");
const { auth } = require("../middleware/auth");

const router = express.Router();

// POST create a booking (protected)
router.post("/", auth, asyncHandler(async (req, res) => {
  const { flightId, seats } = req.body;

  if (!flightId) {
    return res.status(400).json({ success: false, error: "flightId is required" });
  }

  // Check flight exists
  const flight = await Flight.findById(flightId);
  if (!flight) {
    return res.status(404).json({ success: false, error: "Flight not found" });
  }

  // Check if user already booked this flight
  const existingBooking = await Booking.findOne({ user: req.user.id, flight: flightId });
  if (existingBooking) {
    return res.status(400).json({ success: false, error: "You already booked this flight" });
  }

  // Check seat availability
  const bookedSeats = await Booking.aggregate([
    // Step 1: Find all bookings for this flight
    { $match: { flight: flight._id } },
    // Step 2: Sum up all seats across those bookings
    { $group: { _id: null, total: { $sum: "$seats" } } }
  ]);
  // Result: [{ _id: null, total: 45 }] → 45 seats booked


  const totalBooked = bookedSeats.length > 0 ? bookedSeats[0].total : 0;
  const requestedSeats = seats || 1;

  if (totalBooked + requestedSeats > flight.totalSeats) {
    return res.status(400).json({
      success: false,
      error: `Only ${flight.totalSeats - totalBooked} seats available`
    });
  }

  const booking = await Booking.create({
    user: req.user.id,
    flight: flightId,
    seats: seats || 1
  });

  res.status(201).json({ success: true, data: booking });
}));

// GET my bookings (protected)
router.get("/", auth, asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .populate("flight", "number origin destination departure price")
    .populate("user", "name email");

  res.json({ success: true, data: bookings });
}));

// note on use of populate below

// GET single booking (protected - only owner)
router.get("/:id", auth, asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("flight", "number origin destination departure price")
    .populate("user", "name email");

  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  // Only the owner can view their booking
  if (booking.user._id.toString() !== req.user.id) {
    return res.status(403).json({ success: false, error: "Not authorized" });
  }

  res.json({ success: true, data: booking });
}));

// DELETE cancel a booking (protected - only owner)
router.delete("/:id", auth, asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  if (booking.user.toString() !== req.user.id) {
    return res.status(403).json({ success: false, error: "Not authorized" });
  }

  await booking.deleteOne();
  res.json({ success: true, message: "Booking cancelled" });
}));

module.exports = router;