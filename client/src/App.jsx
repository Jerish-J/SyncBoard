import { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import { Plus, Layout, Calendar, CheckCircle2, Clock, ListTodo, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

// ⚠️ REPLACE THIS WITH YOUR ACTUAL RENDER URL (NO TRAILING SLASH)
const API_URL = "https://syncboard-api.onrender.com";
const socket = io(API_URL, {
  transports: ['websocket'],
});

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Defined inside to avoid hosting errors
    const fetchTasks = () => {
      axios.get(`${API_URL}/tasks`)
        .then(res => {
          setTasks(res.data);
          setLoading(false);
        })
        .catch(err => console.error(err));
    };

    fetchTasks();
    
    socket.on('taskAdded', (newTask) => setTasks((prev) => [newTask, ...prev]));
    socket.on('taskUpdated', (updatedTask) => {
      setTasks((prev) => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    });
    socket.on('taskDeleted', (taskId) => {
      setTasks((prev) => prev.filter(t => t._id !== taskId));
    });

    return () => {
      socket.off('taskAdded');
      socket.off('taskUpdated');
      socket.off('taskDeleted');
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;
    axios.post(`${API_URL}/tasks`, { title, status: "TODO" })
      .then(() => setTitle(""))
      .catch(err => console.error(err));
  };

  const handleDelete = (id) => {
    axios.delete(`${API_URL}/tasks/${id}`)
      .catch(err => console.error(err));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const updatedTasks = tasks.map(t => {
      if (t._id === draggableId) {
        return { ...t, status: destination.droppableId };
      }
      return t;
    });
    setTasks(updatedTasks);

    axios.put(`${API_URL}/tasks/${draggableId}`, {
      status: destination.droppableId
    });
  };

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
      </div>

      <nav className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              SyncBoard
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-400">Real-Time</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Manage Projects with Speed</h2>
          <p className="text-slate-400 text-lg">
            A real-time synchronization engine powered by Socket.io. Drag cards to see updates instantly.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-16 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <form onSubmit={handleSubmit} className="relative flex gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-2xl">
            <div className="pl-4 flex items-center pointer-events-none">
              <Plus className="w-5 h-5 text-slate-500" />
            </div>
            <input 
              className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:outline-none focus:ring-0 p-3"
              type="text" 
              placeholder="Add a new task..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/20">
              Create
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 animate-pulse">Loading board data...</div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Column 
                title="To Do" 
                status="TODO" 
                tasks={getTasksByStatus("TODO")} 
                icon={<ListTodo className="w-5 h-5 text-slate-400" />}
                accentColor="bg-slate-500"
                handleDelete={handleDelete}
              />
              <Column 
                title="In Progress" 
                status="IN_PROGRESS" 
                tasks={getTasksByStatus("IN_PROGRESS")} 
                icon={<Clock className="w-5 h-5 text-amber-400" />}
                accentColor="bg-amber-500"
                handleDelete={handleDelete}
              />
              <Column 
                title="Done" 
                status="DONE" 
                tasks={getTasksByStatus("DONE")} 
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                accentColor="bg-emerald-500"
                handleDelete={handleDelete}
              />
            </div>
          </DragDropContext>
        )}
      </main>
    </div>
  );
}

const Column = ({ title, status, tasks, icon, accentColor, handleDelete }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700">
            {icon}
          </div>
          <h3 className="font-bold text-slate-200">{title}</h3>
          <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-0.5 rounded-full font-medium border border-slate-700">
            {tasks.length}
          </span>
        </div>
      </div>
      
      <div className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 backdrop-blur-sm">
        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <div 
              ref={provided.innerRef} 
              {...provided.droppableProps}
              className={`min-h-[200px] transition-colors rounded-xl ${
                snapshot.isDraggingOver ? 'bg-slate-800/50 ring-2 ring-indigo-500/20' : ''
              }`}
            >
              {tasks.map((task, index) => (
                <Draggable key={task._id} draggableId={task._id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`
                        group relative bg-slate-800 p-4 mb-3 rounded-xl border border-slate-700/50 shadow-sm 
                        hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200
                        ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl ring-2 ring-indigo-500 z-50' : ''}
                      `}
                    >
                      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${accentColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-200 pr-4 leading-tight">{task.title}</h4>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // PREVENT DRAG START ON DELETE
                            handleDelete(task._id);
                          }}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {/* SAFETY CHECK FOR DATE */}
                            {task.createdAt ? format(new Date(task.createdAt), 'MMM d') : 'Today'}
                          </span>
                        </div>
                        <div className="bg-slate-950/50 px-2 py-1 rounded text-[10px] font-mono tracking-wider opacity-60">
                          {task._id.slice(-4).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};

export default App;