require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./config/db");

const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Allowed frontend URLs
const allowedOrigins =
  process.env.CLIENT_URLS?.split(",") || ["http://localhost:5173"];

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Database check
db.query("SELECT 1", (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  console.log("✅ Database connected successfully");
});

// CORS Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Make socket available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/listings", require("./routes/projectListingRoutes"));
app.use("/api/profiles", require("./routes/profileRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/proposals", require("./routes/proposalRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/conversations", require("./routes/conversationRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Socket connection
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("join_room", (roomName) => {
    socket.join(roomName);
  });

  socket.on("join_notification_room", (userId) => {
    const room = `user-${userId}`;
    socket.join(room);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "API running",
    time: new Date(),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});