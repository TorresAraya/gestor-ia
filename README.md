# Gestor IA

App de gestión de tareas con inteligencia artificial integrada. La IA analiza cada tarea al crearla, asigna prioridad automáticamente, sugiere fechas límite y detecta duplicados. El usuario puede ajustar todo manualmente y conversar con la IA sobre su lista de tareas.

## Características

- **Priorización automática** — al crear una tarea, la IA le asigna prioridad (alta/media/baja), categoría y fecha límite sugerida según el contenido
- **Detección de duplicados** — combinación de similitud léxica y análisis semántico con IA para avisar antes de guardar una tarea repetida
- **Chat con IA** — panel de chat que conoce tu lista de tareas en tiempo real; puedes preguntarle qué hacer primero, qué tienes pendiente esta semana, etc.
- **Reordenación con IA** — botón que pide a la IA el orden óptimo de ejecución y reorganiza la lista automáticamente
- **Drag & drop** — reordenación manual con persistencia en base de datos
- **Edición completa** — modal para editar título, descripción, prioridad, categoría y fecha límite
- **Alertas de vencimiento** — tareas con fecha pasada se marcan en rojo automáticamente

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, dnd-kit |
| Backend | Node.js, Express, Helmet |
| IA | Ollama — llama3.2 (local) |
| Base de datos | SQLite + Prisma ORM |

## Requisitos previos

- Node.js v18+
- Ollama instalado con el modelo `llama3.2`

## Instalación y uso local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TorresAraya/gestor-ia.git
cd gestor-ia

# 2. Instalar dependencias del backend
npm install

# 3. Instalar dependencias del frontend
cd client && npm install && cd ..

# 4. Configurar variables de entorno
cp .env.example .env

# 5. Crear la base de datos
npx prisma migrate dev

# 6. Iniciar el backend
node src/index.js

# 7. En otra terminal, iniciar el frontend
cd client && npm run dev
```

Accede a `http://localhost:5174`

## Variables de entorno

```env
PORT=4002
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

## Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tasks` | Obtener todas las tareas |
| POST | `/api/tasks` | Crear tarea (con análisis IA y detección de duplicados) |
| PATCH | `/api/tasks/:id` | Editar tarea |
| DELETE | `/api/tasks/:id` | Eliminar tarea |
| PATCH | `/api/tasks/reorder` | Guardar nuevo orden tras drag & drop |
| POST | `/api/tasks/reprioritize` | Reordenar con IA |
| POST | `/api/tasks/chat` | Chat con IA sobre las tareas |

## Autor

**Carlos Torres** — [GitHub](https://github.com/TorresAraya)
