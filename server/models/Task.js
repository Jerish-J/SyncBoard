const mongoose = require('mongoose');

// Define the Schema
const TaskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  status: {
    type: String,
    enum: ['TODO', 'IN_PROGRESS', 'DONE'],
    default: 'TODO',
  },
}, { timestamps: true });

// Export the Model
module.exports = mongoose.model('Task', TaskSchema);