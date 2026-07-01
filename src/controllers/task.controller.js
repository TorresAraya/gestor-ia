const prisma = require('../lib/prisma')
const { analyzeTask, checkDuplicate, reprioritize, chatWithTasks } = require('../services/ollama.service')

const getTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ completed: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }]
    })
    res.json(tasks)
  } catch (error) {
    console.error('Error en getTasks:', error)
    res.status(500).json({ error: 'Error al obtener las tareas' })
  }
}

const createTask = async (req, res) => {
  try {
    const { title, description, priority, category, dueDate } = req.body
    if (!title) return res.status(400).json({ error: 'El título es obligatorio' })

    const existingTasks = await prisma.task.findMany({ where: { completed: false } })
    try {
      const dupResult = await checkDuplicate(title, existingTasks)
      if (dupResult?.isDuplicate) {
        return res.status(409).json({ duplicate: true, duplicateId: dupResult.duplicateId, reason: dupResult.reason })
      }
    } catch (e) {
      console.error('Error IA al verificar duplicado:', e.message)
    }

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
  } catch (error) {
    console.error('Error en createTask:', error)
    res.status(500).json({ error: 'Error al crear la tarea' })
  }
}

const updateTask = async (req, res) => {
  try {
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
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Tarea no encontrada' })
    console.error('Error en updateTask:', error)
    res.status(500).json({ error: 'Error al actualizar la tarea' })
  }
}

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params
    await prisma.task.delete({ where: { id: Number(id) } })
    res.json({ message: 'Tarea eliminada' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Tarea no encontrada' })
    console.error('Error en deleteTask:', error)
    res.status(500).json({ error: 'Error al eliminar la tarea' })
  }
}

const reorderTasks = async (req, res) => {
  try {
    const { orderedIds } = req.body
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds debe ser un array' })

    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.task.update({ where: { id: Number(id) }, data: { position: index } })
      )
    )

    res.json({ message: 'Orden guardado' })
  } catch (error) {
    console.error('Error en reorderTasks:', error)
    res.status(500).json({ error: 'Error al guardar el orden' })
  }
}

const reprioritizeTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({ where: { completed: false }, orderBy: { position: 'asc' } })
    if (tasks.length === 0) return res.json({ suggestion: 'No hay tareas pendientes.' })

    const result = await reprioritize(tasks)
    if (Array.isArray(result.reordered)) {
      await Promise.all(
        result.reordered.map((id, index) =>
          prisma.task.update({ where: { id: Number(id) }, data: { position: index } })
        )
      )
    }
    res.json(result)
  } catch (error) {
    console.error('Error en reprioritizeTasks:', error)
    res.status(500).json({ error: 'Error al reprioritizar: ' + error.message })
  }
}

const chat = async (req, res) => {
  try {
    const { question } = req.body
    if (!question) return res.status(400).json({ error: 'La pregunta es obligatoria' })

    const tasks = await prisma.task.findMany({ orderBy: { position: 'asc' } })
    const answer = await chatWithTasks(question, tasks)
    res.json({ answer })
  } catch (error) {
    console.error('Error en chat:', error)
    res.status(500).json({ error: 'Error al procesar la pregunta' })
  }
}

module.exports = { getTasks, createTask, updateTask, deleteTask, reorderTasks, reprioritizeTasks, chat }
