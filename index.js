const express = require("express"); // 1. Import Express library
const mongoose = require("mongoose");
const redisClient = require("./config/redis")
const Flight = require("./models/Flight");
const bookingRoutes = require("./routes/bookings");
const authRoutes = require("./routes/auth");

const { auth } = require("./middleware/auth");
const { cache, invalidateCache } = require("./middleware/cache");
const asyncHandler = require("./middleware/asyncHandler");
const errorHandler = require("./middleware/errorHandler");

const app = express(); // 2. Create an Express app instance

//2. app is now the server. It can listen for HTTP requests.
app.use(express.json()); //  3. Middleware: parse JSON in request bodies; allows us to read JSON request bodies
// 3. This lets us read req.body when someone sends JSON in a POST request. Without this, req.body would be undefined.

app.use("/api/auth", authRoutes);

app.use("/api/bookings", bookingRoutes) //REST convention — resource names in URLs are plural. so bookings


// connect to local MongoDB

mongoose.connect("mongodb://localhost:27017/flight-booking")
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.log("MongoDB connection error:", err));

// GET all flights
// app.get("/api/flights", async (req, res) => {
//   try {
//     const flights = await Flight.find();
//     res.json({status: true, data: flights});
//   } catch(err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// GET all flights with filtering and sorting
// app.get("/api/flights", async (req, res) => {
//   try {
//     // 1. build filter obj from query params
//     const filter = {};
//     if (req.query.origin) filter.origin = req.query.origin;
//     if (req.query.destination) filter.destination = req.query.destination;
//     if (req.query.status) filter.status = req.query.status;

//     // 2. Build sort object
//     let sort = {};
//     if (req.query.sort) {
//       // sort=price  → ascending
//       // sort=-price → descending (minus sign)
//       const field = req.query.sort.replace("-", "");
//       const order = req.query.sort.startsWith("-") ? -1 : 1; // MongoDB's .sort() uses 1 for ascending and -1 for descending.
//       sort[field] = order;
//     }

//     const flights = await Flight.find(filter).sort(sort);
//     res.json({status: true, count: flights.length, data: flights});
//   }catch(err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// })

// GET all flights with filtering and sorting and pagination
// public route..no login or auth needed
// for cache keys two ways, here we are using inline with no middleware
// app.get("/api/flights",  asyncHandler( async (req, res) => {
//     const cacheKey = `flights:${JSON.stringify(req.query)}`;

//     const cached = await redisClient.get(cacheKey);
//     console.log('cackekey ', cacheKey)
//     if (cached) {
//         return res.json({ success: true, source: "cache", ...JSON.parse(cached) });
//     }

//     // 1. build filter obj from query params
//     const filter = {};
//     if (req.query.origin) filter.origin = req.query.origin;
//     if (req.query.destination) filter.destination = req.query.destination;
//     if (req.query.status) filter.status = req.query.status;

//     // 2. Build sort object
//     let sort = {};
//     if (req.query.sort) {
//       // sort=price  → ascending
//       // sort=-price → descending (minus sign)
//       const field = req.query.sort.replace("-", "");
//       const order = req.query.sort.startsWith("-") ? -1 : 1; // MongoDB's .sort() uses 1 for ascending and -1 for descending.
//       sort[field] = order;
//     }

//     // 3. Pagination
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const flights = await Flight.find(filter).sort(sort).skip(skip).limit(limit);
//     const total = await Flight.countDocuments(filter);

//     // After getting flights, cache the result before responding
//     await redisClient.set(cacheKey, JSON.stringify(flights), { EX: 60 });

//     res.json({
//       success: true,
//       source: "db",
//       count: flights.length,
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//       data: flights
//     });
// }));

// dynamic cache key via middleware
app.get("/api/flights",  cache((req) => `flights:${JSON.stringify(req.query)}`), asyncHandler( async (req, res) => {
    // 1. build filter obj from query params
    const filter = {};
    // if (req.query.origin) filter.origin = req.query.origin;
    // if (req.query.destination) filter.destination = req.query.destination;
    // if (req.query.status) filter.status = req.query.status;

    /**
    MongoDB queries are case-sensitive by default. So ?origin=toronto won't match origin: "Toronto" in the database.
    You can fix this by making the filter case-insensitive using a regex:
    The "i" flag means case-insensitive.
     */
    if (req.query.origin) filter.origin = new RegExp(req.query.origin, "i");
    if (req.query.destination) filter.destination = new RegExp(req.query.destination, "i");
    if (req.query.status) filter.status = new RegExp(req.query.status, "i");

console.log('check filter ', filter)
    // 2. Build sort object
    let sort = {};
    if (req.query.sort) {
      // sort=price  → ascending
      // sort=-price → descending (minus sign)
      const field = req.query.sort.replace("-", "");
      const order = req.query.sort.startsWith("-") ? -1 : 1; // MongoDB's .sort() uses 1 for ascending and -1 for descending.
      sort[field] = order;
    }

    // 3. Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const flights = await Flight.find(filter).sort(sort).skip(skip).limit(limit);
    const total = await Flight.countDocuments(filter);

    // After getting flights, cache the result before responding
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

/**
# First page, 2 per page
curl "http://localhost:3000/api/flights?page=1&limit=2"

# Second page
curl "http://localhost:3000/api/flights?page=2&limit=2"

# Combine with filter and sort
curl "http://localhost:3000/api/flights?origin=Toronto&sort=price&page=1&limit=1"


 */

// -----------
// remaining CRUD endpoints
// -----------

// public route..no login or auth needed
// GET single flight by id
app.get("/api/flights/:id", asyncHandler( async (req, res) => {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({success: false, error: `Flight with id ${req.params.id} not found`})
    res.json({success: true, data: flight});
}));

// Protected route - must be logged in
// POST creat a new flight
app.post("/api/flights", auth, asyncHandler( async (req, res) => {
    const { number, origin, destination, departure, price } = req.body;
    if (!number || !origin || !destination )  {
      return res.status(400).json({success: false, error: "number, origin, destination are required"});
    }
    const flight = await Flight.create({ number, origin, destination, departure, price });

    // await invalidateCache("flights"); // NOTE this is used with middleware
    const keys = await redisClient.keys("flights:*");
    if (keys.length) await redisClient.del(keys);

    res.status(201).json({success: true, data: flight});
}));

// Protected route - must be logged in
// PUT update a flight
app.put("/api/flights/:id", auth, asyncHandler( async (req, res) => {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!flight) return res.status(404).json({ success: false, error: "Flight not found" });

    // await invalidateCache("flights"); // NOTE this is used with middleware
    const keys = await redisClient.keys("flights:*");
    if (keys.length) await redisClient.del(keys);

    res.json({ success: true, data: flight });
}))

// Protected route - must be logged in
// DELETE a flight
app.delete("/api/flights/:id", auth, asyncHandler(async (req, res) => {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) return res.status(404).json({ success: false, error: "Flight not found" });

    // await invalidateCache("flights"); // NOTE this is used with middleware
    const keys = await redisClient.keys("flights:*");
    if (keys.length) await redisClient.del(keys);

    res.status(200).json({ success: true, message: "Flight deleted" });
}))

/**
GET all flights:
curl http://localhost:3000/api/flights

GET single flight:
curl http://localhost:3000/api/flights/1

POST create a flight:
curl -X POST http://localhost:3000/api/flights -H "Content-Type: application/json" -d '{"number":"AC301","origin":"Toronto","destination":"Tokyo","departure":"2026-06-15T10:00:00","price":1200}'

PUT update a flight:
curl -X PUT http://localhost:3000/api/flights/1 -H "Content-Type: application/json" -d '{"status":"delayed","price":1100}'

DELETE a flight:
curl -X DELETE http://localhost:3000/api/flights/1
*/


/**
The error middleware catches any unhandled error from your async routes so you don't need to repeat try/catch in every route.

The flow is:

1. Request comes in → hits your route
2. asyncHandler wraps it — if the async function throws, it calls next(error)
3. next(error) skips all remaining routes and goes straight to app.use(errorHandler)
4. errorHandler sends the 500 response

That's why errorHandler must be after all your routes — Express calls error middleware in order, and it only triggers when next is called with an error.
 */
// add middleware for error handling
app.use(errorHandler)

// Start server
app.listen( 3000, () => {
  console.log("Flight API running on http://localhost:3000");
});

/**
> why are we using auth middleware as a param n not a wrapper in index.js?

They serve different purposes:

 a) asyncHandler — wraps the route handler function. It catches errors from your async code and passes them to the error middleware.

 b) auth — sits between the path and the handler as a middleware function. It runs first, checks the token, and either calls next() to continue to your handler, or returns 401.

The flow for a protected route:

app.post("/api/flights", auth, asyncHandler(async (req, res) => { ... }));

Request comes in
    ↓
auth runs first → checks token
    ↓ (valid)          ↓ (invalid/missing)
calls next()          returns 401, stops here
    ↓
asyncHandler runs your route logic

Express lets you chain as many middleware functions as you want between the path and the handler:

app.post("/path", middleware1, middleware2, middleware3, handler);
Each one runs in order. If any doesn't call next(), the chain stops.
 */


/**
> testing auth
Go ahead and test:

1. Register:
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Alina","email":"alina@test.com","password":"test123"}'
Copy the token from the response.

2. Create a flight WITH token (should work):


curl -X POST http://localhost:3000/api/flights -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN_HERE" -d '{"number":"AC301","origin":"Toronto","destination":"Tokyo","departure":"2026-06-15T10:00:00","price":1200}'
3. Create a flight WITHOUT token (should get 401):


curl -X POST http://localhost:3000/api/flights -H "Content-Type: application/json" -d '{"number":"AC301","origin":"Toronto","destination":"Tokyo"}'
4. GET flights (should work without token — public):
curl http://localhost:3000/api/flights

5. try login in. Should return a fresh token
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"alina@test.com","password":"test123"}'

*/