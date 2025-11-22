const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Socket.io Events
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔥 Client disconnected: ${socket.id}`));
});

// --- ROUTES ---
app.get('/', (req, res) => res.send('SyncBoard API is Live!'));

app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/tasks', async (req, res) => {
  try {
    const { title, description } = req.body;
    const newTask = new Task({ title, description });
    const savedTask = await newTask.save();
    io.emit('taskAdded', savedTask);
    res.json(savedTask);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/tasks/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const updatedTask = await Task.findByIdAndUpdate(id, { status }, { new: true });
    io.emit('taskUpdated', updatedTask);
    res.json(updatedTask);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🛡️  Allowed Origin: ${allowedOrigin}`);
});