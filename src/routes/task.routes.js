const express = require('express')
const router = express.Router()
const { getTasks, createTask, updateTask, deleteTask, reorderTasks, reprioritizeTasks, chat } = require('../controllers/task.controller')

router.get('/', getTasks)
router.post('/', createTask)
router.patch('/reorder', reorderTasks)
router.post('/reprioritize', reprioritizeTasks)
router.post('/chat', chat)
router.patch('/:id', updateTask)
router.delete('/:id', deleteTask)

module.exports = router
