import { useState, useEffect } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const PRIORITY_STYLES = {
  alta:  { badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  media: { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  baja:  { badge: 'bg-green-500/10 text-green-400 border-green-500/20' }
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ task, onSave, onClose }) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority)
  const [category, setCategory] = useState(task.category)
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(task.id, { title, description, priority, category, dueDate: dueDate || null })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
        <h2 className="text-white font-semibold">Editar tarea</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Título</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Descripción</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Prioridad</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Categoría</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Fecha límite</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2 transition-colors">
            Cancelar
          </button>
          <button type="submit" className="text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 transition-colors">
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Task Card (sortable) ────────────────────────────────────────────────────
function SortableTaskCard({ task, onUpdate, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const styles = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.media

  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date()

  return (
    <div ref={setNodeRef} style={style} className={`bg-gray-900 border border-gray-800 rounded-xl p-4 transition-opacity ${task.completed ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes} {...listeners}
          className="mt-1 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          tabIndex={-1}
        >
          ⠿
        </button>

        {/* Checkbox */}
        <button
          onClick={() => onUpdate(task.id, { completed: !task.completed })}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
            task.completed ? 'bg-blue-600 border-blue-600' : 'border-gray-600 hover:border-blue-500'
          }`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
              {task.title}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${styles.badge}`}>{task.priority}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{task.category}</span>
          </div>
          {task.description && <p className="text-xs text-gray-400 mt-1">{task.description}</p>}
          {task.aiNotes && <p className="text-xs text-blue-400 mt-1 italic">✦ {task.aiNotes}</p>}
          {task.dueDate && (
            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
              📅 {new Date(task.dueDate).toLocaleDateString('es-ES')}{isOverdue ? ' — vencida' : ''}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(task)} className="text-gray-600 hover:text-blue-400 transition-colors text-sm px-1">✎</button>
          <button onClick={() => onDelete(task.id)} className="text-gray-600 hover:text-red-400 transition-colors text-sm px-1">✕</button>
        </div>
      </div>
    </div>
  )
}

// ─── New Task Form ────────────────────────────────────────────────────────────
function NewTaskForm({ onAdd, loading }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const result = await onAdd({ title: title.trim(), description: description.trim() })
    if (result !== 'duplicate') {
      setTitle('')
      setDescription('')
      setOpen(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full text-left text-gray-500 hover:text-gray-300 text-sm transition-colors">
          + Añadir tarea...
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Título de la tarea"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-500"
          />
          <textarea
            placeholder="Descripción (opcional) — ayuda a la IA a priorizar mejor"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-500 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !title.trim()} className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg px-4 py-1.5 transition-colors">
              {loading ? 'Analizando...' : 'Crear tarea'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Puedo ayudarte con tus tareas. Pregúntame qué deberías hacer primero, qué tienes pendiente, o cualquier cosa sobre tu lista.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    const question = input.trim()
    if (!question || loading) return
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/tasks/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error al conectar con la IA.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-xl flex flex-col overflow-hidden z-40" style={{ height: '420px' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-sm">✦</span>
          <span className="text-sm font-medium text-white">Chat con IA</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400">Pensando...</div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Pregunta sobre tus tareas..."
          className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600 placeholder-gray-500"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg px-3 py-2 text-xs transition-colors"
        >
          →
        </button>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [filter, setFilter] = useState('pendientes')
  const [editingTask, setEditingTask] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(data)
  }

  const addTask = async (data) => {
    setLoading(true)
    setDuplicateWarning(null)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.status === 409) {
        const dup = await res.json()
        setDuplicateWarning(dup)
        return 'duplicate'
      }
      const task = await res.json()
      setTasks(prev => [task, ...prev])
    } finally {
      setLoading(false)
    }
  }

  const updateTask = async (id, data) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
  }

  const deleteTask = async (id) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const pending = tasks.filter(t => !t.completed)
    const oldIndex = pending.findIndex(t => t.id === active.id)
    const newIndex = pending.findIndex(t => t.id === over.id)
    const reordered = arrayMove(pending, oldIndex, newIndex)
    const completed = tasks.filter(t => t.completed)
    setTasks([...reordered, ...completed])

    await fetch('/api/tasks/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map(t => t.id) })
    })
  }

  const handleReprioritize = async () => {
    setLoading(true)
    setSuggestion(null)
    try {
      const res = await fetch('/api/tasks/reprioritize', { method: 'POST' })
      const data = await res.json()
      if (data.suggestion) setSuggestion(data.suggestion)
      await fetchTasks()
    } finally {
      setLoading(false)
    }
  }

  const pending = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)
  const countByPriority = (p) => pending.filter(t => t.priority === p).length

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Gestor IA</h1>
          <p className="text-xs text-gray-500 mt-0.5">La IA prioriza tus tareas automáticamente</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChatOpen(o => !o)}
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 transition-colors"
          >
            ✦ Chat IA
          </button>
          <button
            onClick={handleReprioritize}
            disabled={loading || pending.length === 0}
            className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 transition-colors"
          >
            ⇅ Reordenar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Alta', key: 'alta', color: 'text-red-400' },
          { label: 'Media', key: 'media', color: 'text-yellow-400' },
          { label: 'Baja', key: 'baja', color: 'text-green-400' }
        ].map(({ label, key, color }) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${color}`}>{countByPriority(key)}</div>
            <div className="text-xs text-gray-500 mt-1">{label} prioridad</div>
          </div>
        ))}
      </div>

      {/* Sugerencia IA */}
      {suggestion && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 flex items-start gap-2">
          <span className="text-blue-400 text-sm">✦</span>
          <p className="text-blue-300 text-sm">{suggestion}</p>
          <button onClick={() => setSuggestion(null)} className="ml-auto text-blue-500 hover:text-blue-300 text-xs">✕</button>
        </div>
      )}

      {/* Aviso duplicado */}
      {duplicateWarning && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4 flex items-start gap-2">
          <span className="text-yellow-400 text-sm">⚠</span>
          <div className="flex-1">
            <p className="text-yellow-300 text-sm font-medium">Posible tarea duplicada</p>
            <p className="text-yellow-400/70 text-xs mt-0.5">{duplicateWarning.reason}</p>
          </div>
          <button onClick={() => setDuplicateWarning(null)} className="text-yellow-500 hover:text-yellow-300 text-xs">✕</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {['pendientes', 'completadas'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors capitalize ${
              filter === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {f} {f === 'pendientes' ? `(${pending.length})` : `(${completed.length})`}
          </button>
        ))}
      </div>

      {/* Nueva tarea */}
      {filter === 'pendientes' && (
        <div className="mb-3">
          <NewTaskForm onAdd={addTask} loading={loading} />
        </div>
      )}

      {/* Lista con drag & drop */}
      {filter === 'pendientes' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pending.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {pending.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-8">No hay tareas pendientes</p>
              ) : (
                pending.map(task => (
                  <SortableTaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} onEdit={setEditingTask} />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-2">
          {completed.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">No hay tareas completadas</p>
          ) : (
            completed.map(task => (
              <SortableTaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} onEdit={setEditingTask} />
            ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <EditModal task={editingTask} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}

      {/* Chat Panel */}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  )
}
