const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io'); 
require('dotenv').config();

const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

io.on('connection', (socket) => {
  console.log('⚡ A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔥 User disconnected:', socket.id);
  });
});

app.get('/', (req, res) => res.send('SyncBoard Backend is Running!'));

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
  console.log(`🚀 Server (Socket.io) running on port ${PORT}`);
});