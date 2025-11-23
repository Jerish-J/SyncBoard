const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.options(/.*/, cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors({
  origin: "*",
}));

app.use(express.json());

// Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Socket
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log('🔥 Client disconnected'));
});

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('SyncBoard API is Live!');
});

// 1. GET Tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. POST Task
app.post('/tasks', async (req, res) => {
  try {
    const { title } = req.body;
    const newTask = new Task({ title, status: "TODO" });
    const savedTask = await newTask.save();
    io.emit('taskAdded', savedTask);
    res.json(savedTask);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. UPDATE Task (Drag & Drop)
app.put('/tasks/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status }, 
      { new: true }
    );
    io.emit('taskUpdated', updatedTask);
    res.json(updatedTask);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. DELETE Task (The New Code)
app.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Task.findByIdAndDelete(id);
    io.emit('taskDeleted', id); // Notify clients
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});