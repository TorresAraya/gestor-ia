const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

const taskRoutes = require('./routes/task.routes')
app.use('/api/tasks', taskRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 4001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gestor IA corriendo en http://localhost:${PORT}`)
})

module.exports = app
