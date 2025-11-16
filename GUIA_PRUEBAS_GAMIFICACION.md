# 🎮 GUÍA DE PRUEBAS: SISTEMA DE GAMIFICACIÓN COMPLETO

## 📋 Resumen de lo Implementado

### ✅ Backend Completado
1. **Sistema de Recompensas** (`activities.service.ts`)
   - Al completar actividades se otorgan **monedas** y **experiencia**
   - Fórmulas de recompensa:
     - Monedas: `10 + (score * 0.5)`
     - Experiencia: `20 + score`
     - Bonus de velocidad: +20% si se completa en menos del 80% del tiempo estimado
   - Sistema inteligente de recompletaciones:
     - Primera vez: 100% de recompensas
     - Mejorando score: 30% de recompensas
     - Sin mejora: 0% de recompensas
   - Cálculo automático de nivel: `Level = floor(sqrt(experience / 100)) + 1`
   - Logs detallados en consola del backend

2. **Sistema de Tienda** (ya existía, listo para usar)
   - Endpoint: `GET /api/v1/store/items` - Listar items
   - Endpoint: `POST /api/v1/store/purchase` - Comprar item
   - Endpoint: `GET /api/v1/store/inventory` - Ver inventario
   - Endpoint: `PATCH /api/v1/store/inventory/:id/equip` - Equipar item

3. **Seed de Items de Tienda** (30+ items creados)
   - 🎭 5 Avatares (Gato, Zorro, Búho, Dragón, Robot)
   - 🎨 5 Temas visuales (Noche, Sakura, Océano, Otoño, Galaxia)
   - 🏆 3 Insignias (Honor, Excelencia, Real)
   - 🎩 4 Accesorios (Birrete, Lentes, Sombrero Mago, Capa)
   - 🖼️ 3 Marcos decorativos (Dorado, Diamante, Fuego)
   - ⚡ 3 Power-ups (Puntos Dobles, Tiempo Extra, Pista)
   - 🎉 3 Celebraciones (Confeti, Estrellas, Trofeo)

### ✅ Frontend Completado
1. **ActivityService** (`services/implementations/ActivityService.ts`)
   - Método `completeActivity()` que llama al backend
   - Envía score, tiempo y respuestas detalladas
   - Retorna recompensas otorgadas

2. **ActivityPlayer** (`components/Activity/ActivityPlayer.tsx`)
   - Integrado con backend para enviar completaciones
   - Muestra resultados al usuario
   - Logging de recompensas en consola

3. **Componente Store** (`components/Gamification/Store.tsx`)
   - ⚠️ **PENDIENTE**: Conectar con backend real (actualmente usa datos mock)

---

## 🚀 PASOS PARA PROBAR EL SISTEMA

### Paso 1: Ejecutar el Seed de Items de Tienda

**Abrir terminal en `backend/`:**

```powershell
cd c:\Users\santi\Downloads\acalud\backend
```

**Opción A - Crear script de seed manual:**

Crear archivo `backend/run-seed.ts`:

```typescript
import { DataSource } from 'typeorm';
import { seedStoreItems } from './src/database/seeds/store-items.seed';
import * as dotenv from 'dotenv';

dotenv.config();

async function runSeed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'acalud',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('📦 Conexión a BD establecida');

  const count = await seedStoreItems(dataSource);
  console.log(`✅ Seed completado: ${count} items creados`);

  await dataSource.destroy();
  console.log('👋 Conexión cerrada');
}

runSeed().catch(error => {
  console.error('❌ Error ejecutando seed:', error);
  process.exit(1);
});
```

Luego ejecutar:

```powershell
npx ts-node run-seed.ts
```

**Opción B - Usando psql directamente:**

Si tienes acceso a la base de datos PostgreSQL, puedes insertar items manualmente:

```powershell
# Conectar a la base de datos
psql -U postgres -d acalud

# Ver si existen items
SELECT COUNT(*) FROM store_items;

# Si no hay items, el seed se ejecutará automáticamente al iniciar el backend
```

---

### Paso 2: Verificar que Backend y Frontend Están Corriendo

**Terminal 1 - Backend:**
```powershell
cd c:\Users\santi\Downloads\acalud\backend
npm start
```

Verificar que aparezca:
```
🚀 AcaLud Backend running on: http://localhost:3001
📚 API Documentation: http://localhost:3001/api/docs
```

**Terminal 2 - Frontend:**
```powershell
cd c:\Users\santi\Downloads\acalud
npm run dev
```

Verificar que aparezca:
```
  ➜  Local:   http://localhost:5173/
```

---

### Paso 3: Probar el Sistema de Recompensas

#### 3.1. Iniciar Sesión como Estudiante

1. Abrir: `http://localhost:5173`
2. Iniciar sesión con un usuario estudiante
3. Ver tu balance actual de monedas (debería estar en el dashboard)

#### 3.2. Completar una Actividad

1. Ir a "Mis Aulas" en el dashboard
2. Seleccionar un aula
3. Hacer clic en una actividad
4. Completar las preguntas
5. Enviar la actividad

#### 3.3. Verificar Recompensas

**En el frontend (consola del navegador):**
Presiona F12 y busca en la consola mensajes como:

```
📊 Enviando completación al backend: {
  activityId: "...",
  score: 85,
  timeSpent: 120
}
✅ Actividad completada exitosamente: {...}
💰 Recompensas otorgadas - Recarga para ver tu nuevo saldo
```

**En el backend (terminal):**
Busca mensajes como:

```
🎉 Primera completación: Recompensas completas otorgadas
💰 Recompensas otorgadas a Juan Pérez:
   • Monedas: +52 (Total: 327)
   • Experiencia: +102 (Total: 1523)
   • Nivel: 4
```

#### 3.4. Recargar y Verificar Balance

1. Recargar la página (F5)
2. Ver que tu balance de monedas aumentó
3. Si subes de nivel, deberías ver tu nuevo nivel

---

### Paso 4: Probar el Sistema de Tienda (PENDIENTE DE CONEXIÓN)

⚠️ **NOTA:** El componente Store existe pero aún usa datos mock. Los siguientes pasos son para cuando se conecte al backend real.

#### 4.1. Acceder a la Tienda

**Opción temporal (hasta que se agregue navegación):**

Modificar temporalmente `App.tsx` para agregar la ruta:

Buscar el switch de vistas y agregar:

```typescript
case 'store':
  return <Store onBack={() => setCurrentView('dashboard')} />;
```

Y en el Header, agregar botón temporal:

```typescript
<button
  onClick={() => onNavigate('store')}
  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
  🛒 Tienda
</button>
```

#### 4.2. Explorar el Catálogo

1. Ir a la tienda
2. Ver items organizados por categorías:
   - Avatares
   - Temas
   - Insignias
   - Accesorios
   - Marcos
   - Power-ups
   - Celebraciones
3. Filtrar por categoría usando los botones superiores
4. Ver precios, rarezas y descripciones

#### 4.3. Comprar un Item

1. Seleccionar un item que puedas pagar
2. Hacer clic en "Agregar al Carrito"
3. Ver el carrito a la derecha
4. Hacer clic en "Comprar Ahora"
5. Confirmar la compra
6. Verificar que tus monedas disminuyeron
7. Verificar que el item ahora aparece como "Poseído"

#### 4.4. Ver Inventario

1. Acceder al inventario (endpoint: `GET /api/v1/store/inventory`)
2. Ver todos los items que has comprado
3. Items equipables deberían poder ser equipados

---

## 🔍 PUNTOS DE VERIFICACIÓN

### ✅ Sistema de Recompensas Funcionando:
- [ ] Al completar actividad, se ven logs en backend
- [ ] Monedas aumentan correctamente
- [ ] Experiencia aumenta correctamente
- [ ] Nivel se calcula automáticamente
- [ ] Recompletaciones con mejora otorgan 30%
- [ ] Recompletaciones sin mejora no otorgan nada
- [ ] Bonus de velocidad funciona (< 80% tiempo)

### ⚠️ Sistema de Tienda (Pendiente Conexión):
- [ ] Items se cargan desde backend (no mock)
- [ ] Balance de monedas es real (desde `user.coins`)
- [ ] Compras actualizan monedas en backend
- [ ] Inventario muestra items comprados
- [ ] Items equipados se guardan correctamente

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: "No se otorgan recompensas"

**Verificar:**
1. Que el backend esté corriendo (`netstat -ano | findstr :3001`)
2. Que no haya errores 404 en la consola del navegador
3. Que el usuario esté autenticado (token en sessionStorage)
4. Logs del backend para ver qué está pasando

**Solución:**
```powershell
# Reiniciar backend
cd backend
npm start
```

### Problema: "No aparecen items en la tienda"

**Verificar:**
1. Que el seed se ejecutó correctamente
2. Consultar directamente la base de datos:

```sql
SELECT COUNT(*) FROM store_items;
SELECT name, price, rarity FROM store_items LIMIT 10;
```

**Solución:**
```powershell
# Ejecutar seed manualmente
cd backend
npx ts-node run-seed.ts
```

### Problema: "Error de compilación en ActivityService.ts"

**Ya resuelto**, pero si aparece:

```powershell
# Ver errores
npm run build

# Si hay error, verificar que no haya marcas de markdown (```) al final del archivo
```

---

## 📊 ESTADÍSTICAS ESPERADAS

### Ejemplo de Completación Perfecta:
- **Score:** 100/100
- **Tiempo:** 2 minutos (estimado: 5 minutos) → Bonus de velocidad
- **Recompensas:**
  - Monedas base: `10 + (100 * 0.5) = 60`
  - Con bonus: `60 * 1.2 = 72 monedas`
  - XP base: `20 + 100 = 120`
  - Con bonus: `120 * 1.2 = 144 XP`

### Progresión de Niveles:
- **Nivel 1:** 0 XP
- **Nivel 2:** 100 XP
- **Nivel 3:** 400 XP
- **Nivel 4:** 900 XP
- **Nivel 5:** 1,600 XP
- **Nivel 10:** 8,100 XP
- **Nivel 20:** 38,100 XP

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **COMPLETADO:** Sistema de recompensas backend
2. ✅ **COMPLETADO:** Frontend llamando al backend
3. ✅ **COMPLETADO:** Seed de items de tienda
4. ⏳ **SIGUIENTE:** Conectar Store.tsx con backend real
5. ⏳ **SIGUIENTE:** Agregar navegación a la tienda en App.tsx
6. ⏳ **SIGUIENTE:** Testing end-to-end completo

---

## 💡 CONSEJOS DE TESTING

1. **Usar consola del navegador (F12):**
   - Ver requests al backend
   - Ver logs de recompensas
   - Detectar errores

2. **Usar logs del backend:**
   - Ver en tiempo real las completaciones
   - Verificar cálculos de recompensas
   - Detectar problemas de base de datos

3. **Probar diferentes escenarios:**
   - Primera completación (100% recompensas)
   - Recompletación mejorando (30% recompensas)
   - Recompletación sin mejorar (0% recompensas)
   - Completación rápida (bonus de velocidad)

4. **Verificar integridad:**
   - Monedas nunca deben ser negativas
   - Nivel siempre debe aumentar, nunca bajar
   - Inventario debe persistir entre sesiones

---

## 📞 SOPORTE

Si encuentras algún problema, revisa:

1. **Logs del Backend:** Terminal donde corre `npm start`
2. **Consola del Navegador:** F12 → Console
3. **Network Tab:** F12 → Network (ver requests fallidos)
4. **Base de Datos:** Conectar con psql para verificar datos

---

**¡El sistema de gamificación está casi listo! Solo falta conectar el Store con el backend y hacer testing completo.** 🎉
