# 🎮 INSTRUCCIONES: JUEGOS EDUCATIVOS DEMO

## ✅ ¿Qué se ha implementado?

### 📂 Backend
- ✅ **Seeder de Juegos**: `backend/src/database/seeds/games-simple.seed.ts`
  - Crea 1 juego de trivia de matemáticas con 10 preguntas
  - Incluye diferentes tipos de preguntas: múltiple opción y verdadero/falso
  - Niveles de dificultad: principiante, intermedio y avanzado
  - Puntos: 100-200 por pregunta (total 1000 puntos)

### 🎨 Frontend
- ✅ **Botón "Juegos Demo"** en `StudentDashboard.tsx`
  - Ubicación: Panel "¿Qué quieres hacer hoy?"
  - Diseño: Gradiente rosa-púrpura-indigo con efecto hover
  - Ícono: 🎮 Gamepad2
  
- ✅ **Lista de Juegos** en `components/Games/GamesList.tsx`
  - Cards atractivas con imágenes
  - Filtros por materia y dificultad
  - Información: tipo de juego, tiempo, puntos, tags
  - Botón "¡Jugar Ahora!" por cada juego
  - Estadísticas totales: juegos disponibles, puntos posibles, minutos

- ✅ **Componente TriviaGame** ya existente y funcional
  - 1141 líneas de código
  - Sistema completo de preguntas y respuestas
  - Feedback, puntuación, progreso

- ✅ **Rutas de navegación** en `App.tsx`
  - `'games'` → Lista de juegos disponibles
  - `'trivia-game'` → Juego de trivia específico

---

## 🚀 PASO 1: Iniciar el Backend

### Opción A: Terminal PowerShell

```powershell
# 1. Navegar al directorio del backend
cd backend

# 2. Iniciar el servidor en modo desarrollo
npm run start:dev
```

**Salida esperada:**
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
...
🚀 AcaLud Backend running on: http://localhost:3001
```

### Opción B: Mantenerlo en background

```powershell
# Iniciar y dejar corriendo
cd backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run start:dev"
```

### ⚠️ Solución de Problemas

Si el backend falla al iniciar:

1. **Puerto 3001 ocupado:**
   ```powershell
   # Ver qué proceso usa el puerto 3001
   netstat -ano | findstr :3001
   
   # Matar el proceso (reemplaza <PID> con el número que aparece)
   taskkill /PID <PID> /F
   ```

2. **Módulos no instalados:**
   ```powershell
   cd backend
   npm install
   npm run start:dev
   ```

3. **Base de datos no conecta:**
   - Verificar que PostgreSQL esté corriendo
   - Revisar credenciales en `backend/.env`

---

## 📊 PASO 2: Ejecutar el Seeder (Crear Juegos Demo)

### Comando

```powershell
# Desde la carpeta backend
npm run seed
```

**Salida esperada:**
```
🌱 Starting database seeding...
✅ Database connection established
🌱 Seeding demo users...
  ✅ Demo user created: teacher@demo.com
  ✅ Demo user created: student@demo.com
  ...
🌱 Seeding demo game...
✅ Trivia de Matemáticas creada con 10 preguntas
🎮 ¡Juego demo creado exitosamente!
✅ Database seeding completed successfully!
```

### ℹ️ Importante

- **Ejecutar solo UNA vez**: El seeder verifica si ya existen datos y los omite
- **Si ya ejecutaste el seeder antes**: No es necesario volverlo a ejecutar
- **Para resetear datos**: Borra manualmente las entradas de la base de datos o usa:
  ```powershell
  # CUIDADO: Esto borra TODA la base de datos
  npm run typeorm schema:drop
  npm run seed
  ```

### Verificar que funcionó

```powershell
# Consultar la API de juegos
curl http://localhost:3001/games

# O abrir en el navegador:
# http://localhost:3001/games
```

Deberías ver JSON con el juego de trivia de matemáticas.

---

## 🎯 PASO 3: Probar en el Frontend

### 1. Iniciar la aplicación frontend (si no está corriendo)

```powershell
# Desde la raíz del proyecto
npm run dev
```

**Salida esperada:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### 2. Abrir la aplicación

Navegar a: http://localhost:5173/

### 3. Hacer login

**Credenciales de prueba:**
- **Email**: `student@demo.com`
- **Password**: `Password123!`

### 4. Navegar a Juegos Demo

1. En el Dashboard, buscar el panel "¿Qué quieres hacer hoy?"
2. Clic en el botón **"🎮 Juegos Demo"** (el que tiene gradiente rosa-púrpura)
3. Deberías ver la lista de juegos disponibles

### 5. Jugar la Trivia

1. En la lista de juegos, encontrar **"🧮 Trivia de Matemáticas: Números y Operaciones"**
2. Clic en **"¡Jugar Ahora!"**
3. Responder las 10 preguntas
4. Ver puntuación final

---

## 🔍 PASO 4: Verificación Completa

### Checklist de Funcionalidades

- [ ] Backend corriendo en http://localhost:3001
- [ ] Endpoint `/games` devuelve al menos 1 juego
- [ ] Login exitoso con `student@demo.com`
- [ ] Dashboard muestra botón "🎮 Juegos Demo" destacado
- [ ] Clic en botón lleva a lista de juegos
- [ ] Lista muestra card de "Trivia de Matemáticas"
- [ ] Card muestra imagen, descripción, tiempo (10 min), puntos (1000)
- [ ] Filtros funcionan (Materia: Matemáticas, Dificultad: Intermedio)
- [ ] Clic en "¡Jugar Ahora!" abre el juego de trivia
- [ ] Juego muestra 10 preguntas interactivas
- [ ] Se puede responder cada pregunta
- [ ] Muestra feedback correcto/incorrecto
- [ ] Al terminar, muestra puntuación final

---

## 🎨 Apariencia Visual Esperada

### Dashboard - Botón Juegos Demo

```
┌─────────────────────────────────────────────────┐
│ ¿Qué quieres hacer hoy?                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  ╔═══════════════════╗  ┌──────────┐  ┌──────┐ │
│  ║  🎮 Juegos Demo  ║  │ Estudiar │  │ Logros││
│  ║  ¡Prueba ya!     ║  └──────────┘  └──────┘ │
│  ╚═══════════════════╝                         │
│   (Gradiente rosa-púrpura-indigo)              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Lista de Juegos

```
┌─────────────────────────────────────────────────┐
│ 🎮 Juegos Educativos                            │
│ Aprende jugando con trivias, crucigramas...    │
├─────────────────────────────────────────────────┤
│                                                 │
│ Filtros:  [Matemáticas ▼]  [Intermedio ▼]     │
│                                                 │
│ ┌─────────────────┐                            │
│ │   [Imagen]      │  🧮 Trivia de Matemáticas │
│ │   ❓ Trivia ⭐⭐  │  Números y Operaciones    │
│ ├─────────────────┤                            │
│ │ 📚 Matemáticas  │  Pon a prueba tus         │
│ │ ⏰ 10 minutos   │  conocimientos...          │
│ │ 📈 1000 puntos  │                            │
│ │ #suma #lógica   │  [¡Jugar Ahora!]          │
│ └─────────────────┘                            │
│                                                 │
│ 📊 1 Juego • 1000 Puntos • 10 Minutos          │
└─────────────────────────────────────────────────┘
```

### Juego de Trivia (ejemplo pregunta)

```
┌─────────────────────────────────────────────────┐
│ 🧮 Trivia de Matemáticas                        │
│ Pregunta 3 de 10                    ⏱️ 0:28    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ❓ ¿Cuánto es 15 + 28?                        │
│                                                 │
│  ⭕ A) 41                                       │
│  ⭕ B) 43                                       │
│  ⭕ C) 42                                       │
│  ⭕ D) 44                                       │
│                                                 │
│  [Enviar Respuesta]                            │
│                                                 │
│  Progreso: ▓▓▓░░░░░░░ 30%                     │
│  Puntos: 200                                    │
└─────────────────────────────────────────────────┘
```

---

## 🐛 Problemas Comunes y Soluciones

### 1. No aparece el botón "Juegos Demo"

**Causa**: Caché del navegador  
**Solución**:
```
Ctrl + F5 (recargar ignorando caché)
o
Abrir DevTools (F12) → Network → Disable cache
```

### 2. Lista de juegos vacía

**Causa**: Seeder no ejecutado o backend no conectado  
**Solución**:
```powershell
# Verificar que backend esté corriendo
curl http://localhost:3001/games

# Si no hay juegos, ejecutar seeder
cd backend
npm run seed
```

### 3. Error "Cannot GET /games"

**Causa**: Backend no está corriendo  
**Solución**:
```powershell
cd backend
npm run start:dev
```

### 4. Al hacer clic en "Jugar Ahora" no pasa nada

**Causa**: Error de navegación  
**Solución**:
1. Abrir DevTools (F12) → Console
2. Buscar errores en rojo
3. Verificar que la ruta `trivia-game` esté en App.tsx
4. Revisar que gameId se pase correctamente

### 5. Juego de trivia no carga preguntas

**Causa**: gameId incorrecto o preguntas no asociadas al juego  
**Solución**:
```powershell
# Verificar estructura del juego en la API
curl http://localhost:3001/games/<GAME_ID>

# Debe incluir array "questions"
```

---

## 📝 Usuarios de Prueba Disponibles

Después de ejecutar el seeder, tienes estos usuarios:

| Email | Password | Rol | Descripción |
|-------|----------|-----|-------------|
| `teacher@demo.com` | `Password123!` | Profesor | Puede crear aulas y actividades |
| `student@demo.com` | `Password123!` | Estudiante | Puede unirse a aulas y jugar |
| `admin@demo.com` | `Password123!` | Admin | Acceso completo |
| `teacher2@demo.com` | `Password123!` | Profesor | Segundo profesor de prueba |
| `student2@demo.com` | `Password123!` | Estudiante | Segundo estudiante de prueba |

---

## 🎯 Próximos Pasos (Opcional)

Si quieres mejorar aún más los juegos:

### 1. Agregar más juegos al seeder

Editar `backend/src/database/seeds/games-simple.seed.ts` y agregar:
- Crucigrama de Historia
- Simulación de Laboratorio
- Trivia de Ciencias

### 2. Mejorar animaciones del TriviaGame

En `src/components/Games/TriviaGame.tsx`:
- Transiciones suaves entre preguntas
- Efectos de confetti al ganar
- Contador visual de tiempo con colores
- Gráfico de progreso animado

### 3. Crear más componentes de juegos

- `CrosswordGame.tsx` - Crucigrama interactivo
- `SimulationGame.tsx` - Simulaciones con diálogos
- `MatchingGame.tsx` - Juego de memoria/matching

### 4. Sistema de recompensas

- Guardar puntajes en GameResult entity
- Actualizar coins del usuario al completar
- Desbloquear logros especiales por juegos

---

## 📊 Arquitectura Técnica

### Flujo de Datos

```
Usuario → Dashboard → Clic "Juegos Demo"
  ↓
App.tsx cambia currentPage a 'games'
  ↓
GamesList.tsx se renderiza
  ↓
useEffect() llama a GET /games
  ↓
Backend devuelve lista de juegos
  ↓
GamesList muestra cards
  ↓
Usuario → Clic "Jugar Ahora"
  ↓
onNavigate('trivia-game', { gameId })
  ↓
TriviaGame.tsx se renderiza con gameId
  ↓
useEffect() llama a GET /games/{gameId}
  ↓
Backend devuelve juego con preguntas
  ↓
TriviaGame muestra preguntas interactivas
```

### Endpoints API Utilizados

```
GET  /games              → Lista todos los juegos activos
GET  /games/:id          → Detalle de un juego con preguntas
POST /games              → Crear nuevo juego (profesor)
PUT  /games/:id          → Actualizar juego (profesor)
DELETE /games/:id        → Eliminar juego (profesor)

GET  /games/:id/questions → Preguntas de un juego
POST /games/:id/results   → Guardar resultado de partida
GET  /games/:id/leaderboard → Tabla de líderes
```

---

## ✅ Checklist Final

Antes de considerar los juegos "completos", verificar:

### Backend
- [ ] Seeder ejecutado exitosamente
- [ ] Al menos 1 juego en la base de datos
- [ ] Endpoint `/games` responde correctamente
- [ ] Preguntas asociadas al juego

### Frontend
- [ ] Botón "Juegos Demo" visible en dashboard
- [ ] GamesList muestra juegos correctamente
- [ ] Filtros funcionan
- [ ] Navegación a TriviaGame funciona
- [ ] Preguntas se cargan y muestran
- [ ] Se puede responder y ver feedback
- [ ] Puntuación final se muestra

### UX/UI
- [ ] Diseño atractivo y responsivo
- [ ] Colores y gradientes correctos
- [ ] Íconos se muestran correctamente
- [ ] Animaciones suaves
- [ ] Feedback visual claro
- [ ] Fácil de usar e intuitivo

---

## 🎉 ¡Listo!

Ahora tienes un sistema completo de juegos educativos demo que los estudiantes pueden probar inmediatamente desde el login. 

**Siguiente paso recomendado**: Probar el flujo completo tú mismo siguiendo el PASO 3.

¿Algún problema? Revisa la sección "🐛 Problemas Comunes" más arriba.
