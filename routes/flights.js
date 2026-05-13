const express = require("express");
const router = express.Router();
const Flight = require("../models/Flight");
const redisClient = require("../config/redis");
const { auth } = require("../middleware/auth");
const { cache } = require("../middleware/cache");
const asyncHandler = require("../middleware/asyncHandler");
const { broadcast } = require("../websocket");

// GET all flights with filtering, sorting, pagination
router.get("/", cache((req) => `flights:${JSON.stringify(req.query)}`), asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.origin) filter.origin = new RegExp(req.query.origin, "i");
    if (req.query.destination) filter.destination = new RegExp(req.query.destination, "i");
    if (req.query.status) filter.status = new RegExp(req.query.status, "i");

    let sort = {};
    if (req.query.sort) {
        const field = req.query.sort.replace("-", "");
        const order = req.query.sort.startsWith("-") ? -1 : 1;
        sort[field] = order;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const flights = await Flight.find(filter).sort(sort).skip(skip).limit(limit);
    const total = await Flight.countDocuments(filter);

    await redisClient.set(req.cacheKey, JSON.stringify(flights), { EX: 60 });

    res.json({
        success: true,
        source: "db",
        count: flights.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: flights
    });
}));

// GET single flight by id
router.get("/:id", asyncHandler(async (req, res) => {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ success: false, error: `Flight with id ${req.params.id} not found` });
    res.json({ success: true, data: flight });
}));

// POST create a new flight
router.post("/", auth, asyncHandler(async (req, res) => {
    const { number, origin, destination, departure, price } = req.body;
    if (!number || !origin || !destination) {
        return res.status(400).json({ success: false, error: "number, origin, destination are required" });
    }
    const flight = await Flight.create({ number, origin, destination, departure, price });
    broadcast({ type: "FLIGHT_CREATED", flight });

    const keys = await redisClient.keys("flights:*");
    if (keys.length) await redisClient.del(keys);

    res.status(201).json({ success: true, data: flight });
}));

// PUT update a flight
router.put("/:id", auth, asyncHandler(async (req, res) => {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!flight) return res.status(404).json({ success: false, error: "Flight not found" });
    broadcast({ type: "FLIGHT_UPDATED", flight });

    const keys = await redisClient.keys("flights:*");
    if (keys.length) await redisClient.del(keys);

    res.json({ success: true, data: flight });
}));

// DELETE a flight
router.delete("/:id", auth, asyncHandler(async (req, res) => {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) return res.status(404).json({ success: false, error: "Flight not found" });
    broadcast({ type: "FLIGHT_DELETED", id: req.params.id });

    const keys = await redisClient.keys("flights:*");
    if (keys.length) await redisClient.del(keys);

    res.status(200).json({ success: true, message: "Flight deleted" });
}));

module.exports = router;
