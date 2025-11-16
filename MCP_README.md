# 🔧 AcaLud MCP Server

## ¿Qué es esto?

Un servidor **Model Context Protocol (MCP)** que permite a agentes de IA (como Claude, ChatGPT, etc.) interactuar directamente con tu plataforma AcaLud:

- 📊 **Leer datos**: Usuarios, actividades, tienda, estadísticas
- 🛠️ **Ejecutar acciones**: Otorgar monedas, crear items, generar reportes
- 🔍 **Queries personalizadas**: Ejecutar SELECT directo a la base de datos
- 🌐 **Funciona en local y producción**: Docker-ready

## 🚀 Uso en Local

### 1. Compilar el servidor MCP

```bash
cd backend
npm run build
```

### 2. Configurar Claude Desktop (o tu cliente MCP)

Edita tu archivo de configuración:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Añade:

```json
{
  "mcpServers": {
    "acalud": {
      "command": "node",
      "args": [
        "C:/Users/santi/Downloads/acalud/backend/dist/mcp/acalud-mcp-server.js"
      ],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_USERNAME": "postgres",
        "DB_PASSWORD": "santy331",
        "DB_NAME": "acalud_db"
      }
    }
  }
}
```

### 3. Reinicia Claude Desktop

Ahora Claude puede:

```
"¿Cuántos usuarios tengo registrados?"
→ Lee acalud://users

"Otorga 500 monedas a demo_estudiante"
→ Ejecuta grant-coins tool

"Muéstrame las actividades más recientes"
→ Lee acalud://activities
```

## 🌐 Uso en Producción (Docker)

### 1. Actualizar docker-compose.yml

Añade el servicio MCP:

```yaml
services:
  # ... (backend, frontend, postgres existentes)
  
  mcp-server:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: node dist/mcp/acalud-mcp-server.js
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: ${POSTGRES_DB}
    depends_on:
      - postgres
    networks:
      - acalud-network
    stdin_open: true
    tty: true
```

### 2. Configurar cliente MCP remoto

Para conectarte desde tu máquina local al servidor MCP en producción:

```json
{
  "mcpServers": {
    "acalud-production": {
      "command": "ssh",
      "args": [
        "user@your-server.com",
        "docker exec -i acalud-mcp-server node dist/mcp/acalud-mcp-server.js"
      ]
    }
  }
}
```

### 3. Acceso via API Gateway (recomendado para producción)

Exponer el servidor MCP via HTTPS con autenticación:

```typescript
// backend/src/modules/mcp/mcp-gateway.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/mcp')
@UseGuards(JwtAuthGuard)
export class McpGatewayController {
  @Post('execute')
  async executeTool(@Body() body: { tool: string; args: any }) {
    // Proxy al servidor MCP
    // Solo permitir a usuarios con rol 'admin'
  }
}
```

## 📚 Recursos Disponibles

| URI | Descripción |
|-----|-------------|
| `acalud://users` | Lista de usuarios registrados |
| `acalud://store/items` | Catálogo de la tienda |
| `acalud://activities` | Actividades educativas |
| `acalud://classrooms` | Aulas creadas |
| `acalud://stats/coins` | Distribución de monedas |

## 🛠️ Herramientas Disponibles

### grant-coins
Otorgar monedas a usuarios:
```json
{
  "username": "demo_estudiante",
  "amount": 500,
  "reason": "Recompensa por buen desempeño"
}
```

### execute-query
Ejecutar SELECT personalizado:
```json
{
  "query": "SELECT username, coins FROM user_inventory ui JOIN users u ON ui.userId = u.id ORDER BY coins DESC LIMIT 10"
}
```

### get-user-details
Información completa de un usuario:
```json
{
  "username": "demo_estudiante"
}
```

### create-store-item
Crear nuevo item en tienda:
```json
{
  "name": "Avatar Premium",
  "description": "Avatar exclusivo dorado",
  "type": "avatar",
  "rarity": "epic",
  "price": 1000
}
```

### analytics-report
Generar reporte de estadísticas:
```json
{
  "period": "week"
}
```

## 🔐 Seguridad

**⚠️ IMPORTANTE para producción:**

1. **Autenticación**: El servidor MCP debe estar protegido
2. **Solo admin**: Limitar herramientas destructivas a role='admin'
3. **Rate limiting**: Evitar abuso de queries
4. **Audit log**: Registrar todas las acciones ejecutadas

### Ejemplo de autenticación:

```typescript
// En el servidor MCP, validar JWT antes de ejecutar herramientas:
const validateToken = async (token: string) => {
  // Verificar JWT
  // Comprobar que user.role === 'admin'
  // Si no es válido, rechazar la operación
};
```

## 🧪 Pruebas

### Probar localmente sin cliente MCP:

```bash
# Iniciar servidor
cd backend
npm run build
node dist/mcp/acalud-mcp-server.js

# En otra terminal, enviar comandos vía stdio:
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node dist/mcp/acalud-mcp-server.js
```

### Probar con MCP Inspector (herramienta oficial):

```bash
npx @modelcontextprotocol/inspector node dist/mcp/acalud-mcp-server.js
```

Abrirá una interfaz web en http://localhost:5173 para probar todas las herramientas.

## 📦 Ejemplos de Uso

### Con Claude Desktop:

```
Tú: "¿Cuántas monedas tiene el usuario demo_estudiante?"

Claude: 
- Ejecuta: get-user-details("demo_estudiante")
- Responde: "El usuario tiene 150 monedas, nivel 3, 2 items comprados"

Tú: "Otórgale 500 monedas más por completar el curso"

Claude:
- Ejecuta: grant-coins("demo_estudiante", 500, "Completó curso avanzado")
- Responde: "✅ 500 monedas otorgadas a demo_estudiante"
```

### Con API (si implementas el gateway):

```bash
curl -X POST https://tu-dominio.com/api/v1/mcp/execute \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "grant-coins",
    "args": {
      "username": "demo_estudiante",
      "amount": 500
    }
  }'
```

## 🎯 Beneficios

1. **Administración con IA**: "Otorga 100 monedas a todos los usuarios activos esta semana"
2. **Debugging inteligente**: "¿Por qué el usuario X no puede comprar items?"
3. **Analytics conversacional**: "Muéstrame las 5 actividades más populares"
4. **Operaciones batch**: "Crea 10 items de tienda con estos datos..."
5. **Reportes automáticos**: "Genera reporte semanal de engagement"

## 📖 Recursos

- [Documentación oficial MCP](https://modelcontextprotocol.io/)
- [SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [Ejemplos de servidores](https://github.com/modelcontextprotocol/servers)

---

**Próximos pasos**:
1. ✅ Servidor MCP básico implementado
2. ⏳ Probar con Claude Desktop
3. ⏳ Añadir autenticación para producción
4. ⏳ Implementar audit log
5. ⏳ Crear más herramientas personalizadas
