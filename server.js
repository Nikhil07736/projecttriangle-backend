require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./config/db"); // MySQL DB connection

// --- ✨ NEW IMPORTS ---
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// --- ✨ NEW: Create HTTP server and Socket.io instance ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URLS?.split(",") || ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✅ Database connection check at startup
db.query("SELECT 1", (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1); // stop server if DB is down
  }
  console.log("✅ Database connected successfully");
});

// 🔧 CORS Middleware
const allowedOrigins =
  process.env.CLIENT_URLS?.split(",") || ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow Postman/mobile apps
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn("❌ Blocked CORS request from:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 🔧 General Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- ✨ NEW: Make `io` available to all routes ---
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 📂 Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🛂 API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projectRoutes"));       // For freelancer hub
app.use("/api/listings", require("./routes/projectListingRoutes")); // For marketplace listings
app.use("/api/profiles", require("./routes/profileRoutes"));       // For user profiles
app.use("/api/dashboard", require("./routes/dashboardRoutes"));     // For the user dashboard
app.use("/api/ai", require("./routes/ai"));                         // For AI generation
app.use("/api/payment", require("./routes/paymentRoutes"));// ✨ This is your teammate's route, now correctly added
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/proposals", require("./routes/proposalRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/conversations", require("./routes/conversationRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// --- ✨ NEW: Socket.io connection logic ---
io.on('connection', (socket) => {
  console.log('✅ A user connected with socket ID:', socket.id);

  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('join_notification_room', (userId) => {
        const roomName = `user-${userId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined notification room: ${roomName}`);
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected with socket ID:', socket.id);
    });
});

// 🧪 Health check routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: "✅ API is running",
    env: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});