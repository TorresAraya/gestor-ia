const axios = require('axios')

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const MODEL = process.env.OLLAMA_MODEL || 'llama3.2'

const analyzeTask = async (title, description = '') => {
  const prompt = `Eres un asistente de gestión de tareas. Analiza la siguiente tarea y responde ÚNICAMENTE con un JSON válido, sin texto adicional.

Tarea: "${title}"
Descripción: "${description || 'Sin descripción'}"

Responde con este JSON exacto:
{
  "priority": "alta" | "media" | "baja",
  "category": una palabra en español que describa la categoría (trabajo, personal, salud, finanzas, hogar, estudio, urgente, etc.),
  "dueDate": fecha sugerida en formato ISO 8601 si detectas urgencia, o null si no aplica,
  "aiNotes": una frase corta explicando tu razonamiento
}

Reglas:
- "alta" si es urgente, tiene deadline implícito, o impacto importante
- "media" si es importante pero no urgente
- "baja" si puede esperar
- La fecha de hoy es ${new Date().toISOString().split('T')[0]}`

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt,
    stream: false
  }, { timeout: 60000 })

  const text = response.data.response.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('La IA no devolvió JSON válido')
  return JSON.parse(jsonMatch[0])
}

const similarityScore = (a, b) => {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  const intersection = [...wordsA].filter(w => wordsB.has(w))
  const union = new Set([...wordsA, ...wordsB])
  return union.size === 0 ? 0 : intersection.length / union.size
}

const checkDuplicate = async (title, existingTasks) => {
  if (existingTasks.length === 0) return null

  // Verificación rápida por similitud de palabras
  for (const task of existingTasks) {
    if (similarityScore(title, task.title) >= 0.4) {
      return { isDuplicate: true, duplicateId: task.id, reason: `"${task.title}" parece muy similar a la nueva tarea.` }
    }
  }

  // Verificación semántica con IA
  const list = existingTasks.map(t => `[ID:${t.id}] "${t.title}"`).join('\n')

  const prompt = `Tarea nueva: "${title}"

Tareas existentes:
${list}

¿Alguna tarea existente tiene el mismo significado o propósito que la tarea nueva, aunque use palabras distintas?

Responde SOLO con este JSON, sin texto adicional:
{"isDuplicate": true o false, "duplicateId": el ID numérico de la tarea similar o null, "reason": "explicación de una frase" o null}`

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt,
    stream: false
  }, { timeout: 60000 })

  const text = response.data.response.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  return JSON.parse(jsonMatch[0])
}

const reprioritize = async (tasks) => {
  const taskList = tasks.map((t, i) =>
    `${i + 1}. [${t.priority}] ${t.title} (categoría: ${t.category})`
  ).join('\n')

  const prompt = `Eres un asistente de gestión de tareas. Tienes esta lista de tareas pendientes:

${taskList}

Responde ÚNICAMENTE con un JSON válido, sin texto adicional:
{
  "reordered": [array de IDs en el orden óptimo de realización],
  "suggestion": "una frase corta con tu recomendación general"
}

Los IDs son: ${tasks.map(t => t.id).join(', ')}`

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt,
    stream: false
  }, { timeout: 60000 })

  const text = response.data.response.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('La IA no devolvió JSON válido')
  return JSON.parse(jsonMatch[0])
}

const chatWithTasks = async (question, tasks) => {
  const pending = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  const taskList = pending.map(t =>
    `- [${t.priority.toUpperCase()}] ${t.title} | categoría: ${t.category}${t.dueDate ? ` | fecha límite: ${new Date(t.dueDate).toLocaleDateString('es-ES')}` : ''}`
  ).join('\n')

  const prompt = `Eres un asistente personal de productividad. El usuario tiene las siguientes tareas pendientes:

${taskList || 'No hay tareas pendientes.'}

Tareas completadas: ${completed.length}
Fecha actual: ${new Date().toLocaleDateString('es-ES')}

Pregunta del usuario: "${question}"

Responde de forma concisa y útil en español, basándote en la lista real de tareas del usuario.`

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt,
    stream: false
  }, { timeout: 60000 })

  return response.data.response.trim()
}

module.exports = { analyzeTask, checkDuplicate, reprioritize, chatWithTasks }
