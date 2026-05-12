// defines what data GraphQL can return and how to fetch it.
const { buildSchema } = require("graphql");  // Imports the function that converts a schema string into a GraphQL schema object. Think of it like a compiler for your type definitions.
const Flight = require("../models/Flight");
const Booking = require("../models/Booking");
const jwt = require("jsonwebtoken")

/**
 * Helper to verify the token
 * @param {*} context
 * @returns
 */
const authenticate = (context) => {
  const token = context.headers.authorization?.replace("Bearer ", "");
  if (!token) throw new Error("No token, access denied");
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("Invalid token");
  }
};


/**
 * This is the menu. It tells GraphQL "here's what exists and what clients can ask for."
 * type Flight — Describes what a Flight looks like. Same fields as our Mongoose Flight model. Each field has a type:
 *  ID — unique identifier
 *  String — text
 *  Float — decimal number (price)
 *  Int — whole number (seats)
 * type Booking — Same idea for bookings. Notice flight: Flight — a booking contains a full Flight object, not just an ID. This is GraphQL's power — nested data in one request.
 * type Query — (for reading data like a GET) The questions clients can ask:
 *  - flights: [Flight] — "give me all flights" (returns an array)
 *  - flight(id: ID!): Flight — "give me one flight by ID" (the ! means ID is required)
 *  - bookings: [Booking] — "give me all bookings"
 * type Mutation - changing data (POST, PUT, DELETE)
 *  - createFlight takes all required fields (the ! means required) and saves to MongoDB
 *  - deleteFlight takes an ID and removes it
 */
// GraphQL type — tells GraphQL what a response looks like:
const schema = buildSchema(`
  type Flight {
    _id: ID
    number: String
    origin: String
    destination: String
    departure: String
    status: String
    price: Float
    totalSeats: Int
  }

  type Booking {
    _id: ID
    flight: Flight
    user: ID
    seats: Int
    totalPrice: Float
    status: String
  }

  type Query {
    flights: [Flight]
    flight(id: ID!): Flight
    bookings: [Booking]
  }

  type Mutation {
    createFlight(number: String!, origin: String!, destination: String!, departure: String!, price: Float, totalSeats: Int): Flight
    updateFlight(id: ID!, number: String, origin: String, destination: String, departure: String, status: String, price: Float, totalSeats: Int): Flight
    deleteFlight(id: ID!): String
  }
`);

// The resolvers. These are the actual functions that run when someone asks a question.
// Each one matches a query from above:
// flights → runs Flight.find() — same as your REST GET /flights
// flight → runs Flight.findById(id) — same as your REST GET /flights/:id
// bookings → runs Booking.find().populate("flight") — fetches bookings with full flight details

const root = {
  flights: async () => {
    return await Flight.find();
  },
  flight: async ({ id }) => {
    return await Flight.findById(id);
  },
  bookings: async () => {
    return await Booking.find().populate("flight");
  },
   createFlight: async ({ number, origin, destination, departure, price, totalSeats }, context) => {
    authenticate(context);
    const flight = new Flight({ number, origin, destination, departure, price, totalSeats });
    return await flight.save();
  },
  updateFlight: async ({ id, ...updates }, context) => {
    authenticate(context);
    return await Flight.findByIdAndUpdate(id, updates, { new: true }); //{ new: true } returns the updated document instead of the old one. ...updates collects only the fields that were passed — so if you only send price, only price gets updated.
  },
  deleteFlight: async ({ id }, context) => {
    authenticate(context);
    await Flight.findByIdAndDelete(id);
    return "Flight deleted";
  },
};

module.exports = { schema, root };
