// This is like a PayloadCMS collection config — it defines what a flight document looks like in MongoDB.

const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema({
    number: { type: String, required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    departure: { type: Date, required: true },
    status: { type: String, default: "scheduled" },
    price: { type: Number, default: 0 },
    totalSeats: { type: Number, default: 150 }
})

module.exports = mongoose.model("Flight", flightSchema)