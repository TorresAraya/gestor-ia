const prisma = require('../lib/prisma')
const { analyzeTask, checkDuplicate, reprioritize, chatWithTasks } = require('../services/ollama.service')

const getTasks = async (req, res) => {
  const tasks = await prisma.task.findMany({
    orderBy: [{ completed: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }]
  })
  res.json(tasks)
}

const createTask = async (req, res) => {
  const { title, description, priority, category, dueDate } = req.body
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' })

  // Detección de duplicados
  const existingTasks = await prisma.task.findMany({ where: { completed: false } })
  let duplicateWarning = null
  try {
    const dupResult = await checkDuplicate(title, existingTasks)
    if (dupResult?.isDuplicate) {
      duplicateWarning = { duplicateId: dupResult.duplicateId, reason: dupResult.reason }
    }
  } catch (e) {
    console.error('Error IA al verificar duplicado:', e.message)
  }

  if (duplicateWarning) {
    return res.status(409).json({ duplicate: true, ...duplicateWarning })
  }

  // Análisis y priorización
  let aiData = {}
  try {
    aiData = await analyzeTask(title, description)
  } catch (e) {
    console.error('Error IA al analizar tarea:', e.message)
  }

  const maxPos = await prisma.task.aggregate({ _max: { position: true } })
  const nextPosition = (maxPos._max.position ?? -1) + 1

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      priority: priority || aiData.priority || 'media',
      category: category || aiData.category || 'general',
      dueDate: dueDate ? new Date(dueDate) : (aiData.dueDate ? new Date(aiData.dueDate) : null),
      aiNotes: aiData.aiNotes || null,
      position: nextPosition
    }
  })

  res.status(201).json(task)
}

const updateTask = async (req, res) => {
  const { id } = req.params
  const { title, description, priority, category, dueDate, completed } = req.body

  const task = await prisma.task.update({
    where: { id: Number(id) },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(priority !== undefined && { priority }),
      ...(category !== undefined && { category }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(completed !== undefined && { completed })
    }
  })

  res.json(task)
}

const deleteTask = async (req, res) => {
  const { id } = req.params
  await prisma.task.delete({ where: { id: Number(id) } })
  res.json({ message: 'Tarea eliminada' })
}

const reorderTasks = async (req, res) => {
  const { orderedIds } = req.body
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds debe ser un array' })

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.task.update({ where: { id: Number(id) }, data: { position: index } })
    )
  )

  res.json({ message: 'Orden guardado' })
}

const reprioritizeTasks = async (req, res) => {
  const tasks = await prisma.task.findMany({ where: { completed: false }, orderBy: { position: 'asc' } })
  if (tasks.length === 0) return res.json({ suggestion: 'No hay tareas pendientes.' })

  try {
    const result = await reprioritize(tasks)
    if (result.reordered) {
      await Promise.all(
        result.reordered.map((id, index) =>
          prisma.task.update({ where: { id: Number(id) }, data: { position: index } })
        )
      )
    }
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: 'Error al reprioritizar: ' + e.message })
  }
}

const chat = async (req, res) => {
  const { question } = req.body
  if (!question) return res.status(400).json({ error: 'La pregunta es obligatoria' })

  const tasks = await prisma.task.findMany({ orderBy: { position: 'asc' } })

  try {
    const answer = await chatWithTasks(question, tasks)
    res.json({ answer })
  } catch (e) {
    res.status(500).json({ error: 'Error al procesar la pregunta: ' + e.message })
  }
}

module.exports = { getTasks, createTask, updateTask, deleteTask, reorderTasks, reprioritizeTasks, chat }
