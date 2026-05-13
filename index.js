// wire or connect all pieces together.

const http = require("http");
const express = require("express");
const { init: initWebSocket } = require("./websocket");
const { createHandler } = require("graphql-http/lib/use/express");
const { schema, root } = require("./graphql/schema");
const authRoutes = require("./routes/auth");
const flightRoutes = require("./routes/flights");
const bookingRoutes = require("./routes/bookings");
const errorHandler = require("./middleware/errorHandler");
const rateLimiter = require("./middleware/rateLimiter");
const connectDB = require("./config/db");

/** create Express app and enable JSON parsing */
const app = express(); // 2. Create an Express app instance.  app is now the server. It can listen for HTTP requests.

// Middleware: parse JSON in request bodies; allows us to read JSON request bodies
// This lets us read req.body when someone sends JSON in a POST request. Without this, req.body would be undefined.
app.use(express.json());

/**  Apply rate limiting  - must be before routes, so all requests are rate-limited*/
// Rate limit: 100 requests per 15 minutes per IP
//app.use() applies it globally to every route. So all endpoints (flights, bookings, auth) are protected.
app.use(rateLimiter(100, 15 * 60 * 1000)); //100 requests per 15 minutes per IP address. So if one IP sends 100 requests within 15 minutes, request 101 gets blocked with a 429 error. After 15 minutes the window resets and they get 100 more.

/** Connect to MongoDB - order doesnt matter since it's async and runs independently but nice to before rereqs come in*/
connectDB();

/** Register all routes - routes must be after middleware, before error handler*/
app.use("/api/auth", authRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/bookings", bookingRoutes) //REST convention — resource names in URLs are plural. so bookings

/** Error handler middleware - must be after routes, it catches errors form routes  */
app.use(errorHandler)

/** GRaphQL endpoint */
app.all("/graphql", createHandler({
  schema: schema,
  rootValue: root,
  context: (req) => ({ headers: req.headers }), //pass the request as context so resolvers can access headers for authentication
}));

/**  Create HTTP server, attach WebSocket, start listening on port 3000 */
const server = http.createServer(app);
initWebSocket(server);

server.listen(3000, () => {
    console.log("Flight API running on http://localhost:3000");
})
