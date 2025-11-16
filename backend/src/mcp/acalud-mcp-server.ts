#!/usr/bin/env node

/**
 * 🔧 AcaLud MCP Server
 * 
 * Servidor Model Context Protocol para gestión administrativa de AcaLud.
 * Permite a agentes de IA (como Claude) interactuar directamente con:
 * - Base de datos (queries, actualizaciones)
 * - Operaciones administrativas (otorgar monedas, gestionar usuarios)
 * - Analytics y reportes
 * 
 * Funciona tanto en local como en producción (Docker).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DataSource } from 'typeorm';

// Configuración de base de datos
const createDataSource = () => {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'santy331',
    database: process.env.DB_NAME || 'acalud_db',
    synchronize: false,
    logging: false,
  });
};

let dataSource: DataSource;

// Crear servidor MCP
const server = new Server(
  {
    name: 'acalud-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// 📚 RECURSOS: Datos que se pueden leer
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'acalud://users',
        name: 'Lista de usuarios',
        description: 'Todos los usuarios registrados en la plataforma',
        mimeType: 'application/json',
      },
      {
        uri: 'acalud://store/items',
        name: 'Items de la tienda',
        description: 'Catálogo completo de items virtuales',
        mimeType: 'application/json',
      },
      {
        uri: 'acalud://activities',
        name: 'Actividades',
        description: 'Lista de todas las actividades educativas',
        mimeType: 'application/json',
      },
      {
        uri: 'acalud://classrooms',
        name: 'Aulas',
        description: 'Todas las aulas/clases creadas',
        mimeType: 'application/json',
      },
      {
        uri: 'acalud://stats/coins',
        name: 'Estadísticas de monedas',
        description: 'Distribución de monedas virtuales por usuario',
        mimeType: 'application/json',
      },
    ],
  };
});

// 🔍 Leer recursos específicos
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    switch (uri) {
      case 'acalud://users': {
        const users = await dataSource.query(`
          SELECT id, username, email, role, "createdAt", "isActive"
          FROM users
          ORDER BY "createdAt" DESC
          LIMIT 100
        `);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(users, null, 2),
            },
          ],
        };
      }

      case 'acalud://store/items': {
        const items = await dataSource.query(`
          SELECT id, name, description, type, rarity, price, "isActive", "soldCount"
          FROM store_items
          WHERE "isActive" = true
          ORDER BY "displayOrder" ASC
        `);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(items, null, 2),
            },
          ],
        };
      }

      case 'acalud://activities': {
        const activities = await dataSource.query(`
          SELECT id, title, description, type, "maxScore", "createdAt"
          FROM activities
          ORDER BY "createdAt" DESC
          LIMIT 50
        `);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(activities, null, 2),
            },
          ],
        };
      }

      case 'acalud://classrooms': {
        const classrooms = await dataSource.query(`
          SELECT c.id, c.name, c.code, c."createdAt",
                 u.username as teacher_name,
                 COUNT(DISTINCT cm.id) as student_count
          FROM classrooms c
          LEFT JOIN users u ON c."teacherId" = u.id
          LEFT JOIN classroom_members cm ON c.id = cm."classroomId"
          GROUP BY c.id, u.username
          ORDER BY c."createdAt" DESC
        `);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(classrooms, null, 2),
            },
          ],
        };
      }

      case 'acalud://stats/coins': {
        const stats = await dataSource.query(`
          SELECT 
            u.username,
            ui.coins,
            ui.gems,
            ui."experiencePoints" as xp,
            ui.level,
            COUNT(DISTINCT up.id) as items_purchased
          FROM user_inventory ui
          JOIN users u ON ui."userId" = u.id
          LEFT JOIN user_purchases up ON u.id = up."userId"
          GROUP BY u.id, u.username, ui.coins, ui.gems, ui."experiencePoints", ui.level
          ORDER BY ui.coins DESC
          LIMIT 50
        `);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Recurso no encontrado: ${uri}`);
    }
  } catch (error) {
    throw new Error(`Error al leer recurso: ${error.message}`);
  }
});

// 🛠️ HERRAMIENTAS: Acciones que se pueden ejecutar
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'grant-coins',
        description: 'Otorgar monedas virtuales a uno o varios usuarios',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Nombre de usuario (o "all" para todos)',
            },
            amount: {
              type: 'number',
              description: 'Cantidad de monedas a otorgar',
            },
            reason: {
              type: 'string',
              description: 'Motivo del otorgamiento (opcional)',
            },
          },
          required: ['username', 'amount'],
        },
      },
      {
        name: 'execute-query',
        description: 'Ejecutar una query SQL de solo lectura (SELECT)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Query SQL (solo SELECT permitido)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get-user-details',
        description: 'Obtener información detallada de un usuario',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Nombre de usuario o email',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'create-store-item',
        description: 'Crear un nuevo item en la tienda virtual',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nombre del item',
            },
            description: {
              type: 'string',
              description: 'Descripción del item',
            },
            type: {
              type: 'string',
              enum: ['avatar', 'theme', 'emote', 'background', 'frame', 'badge'],
              description: 'Tipo de item',
            },
            rarity: {
              type: 'string',
              enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
              description: 'Rareza del item',
            },
            price: {
              type: 'number',
              description: 'Precio en monedas',
            },
          },
          required: ['name', 'type', 'price'],
        },
      },
      {
        name: 'analytics-report',
        description: 'Generar reporte de analytics del sistema',
        inputSchema: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['today', 'week', 'month', 'all'],
              description: 'Período del reporte',
            },
          },
          required: ['period'],
        },
      },
    ],
  };
});

// 🎯 Ejecutar herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const { name, arguments: args } = request.params;

    switch (name) {
      case 'grant-coins': {
        const { username, amount, reason } = args as {
          username: string;
          amount: number;
          reason?: string;
        };

        if (username === 'all') {
          // Otorgar a todos los usuarios
          const result = await dataSource.query(`
            UPDATE user_inventory
            SET coins = coins + $1
            RETURNING "userId"
          `, [amount]);

          return {
            content: [
              {
                type: 'text',
                text: `✅ ${amount} monedas otorgadas a ${result.length} usuarios${
                  reason ? ` (Motivo: ${reason})` : ''
                }`,
              },
            ],
          };
        } else {
          // Otorgar a un usuario específico
          const user = await dataSource.query(
            `SELECT id FROM users WHERE username = $1 OR email = $1`,
            [username]
          );

          if (!user.length) {
            throw new Error(`Usuario no encontrado: ${username}`);
          }

          await dataSource.query(
            `UPDATE user_inventory SET coins = coins + $1 WHERE "userId" = $2`,
            [amount, user[0].id]
          );

          return {
            content: [
              {
                type: 'text',
                text: `✅ ${amount} monedas otorgadas a ${username}${
                  reason ? ` (Motivo: ${reason})` : ''
                }`,
              },
            ],
          };
        }
      }

      case 'execute-query': {
        const { query } = args as { query: string };

        // Validar que solo sea SELECT
        if (!query.trim().toLowerCase().startsWith('select')) {
          throw new Error('Solo se permiten queries SELECT');
        }

        const result = await dataSource.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get-user-details': {
        const { username } = args as { username: string };

        const details = await dataSource.query(`
          SELECT 
            u.id, u.username, u.email, u.role, u."createdAt", u."isActive",
            ui.coins, ui.gems, ui."experiencePoints" as xp, ui.level,
            COUNT(DISTINCT up.id) as items_owned,
            COUNT(DISTINCT cm.id) as classrooms_joined,
            COUNT(DISTINCT ar.id) as activities_completed
          FROM users u
          LEFT JOIN user_inventory ui ON u.id = ui."userId"
          LEFT JOIN user_purchases up ON u.id = up."userId"
          LEFT JOIN classroom_members cm ON u.id = cm."userId"
          LEFT JOIN activity_responses ar ON u.id = ar."studentId"
          WHERE u.username = $1 OR u.email = $1
          GROUP BY u.id, ui.coins, ui.gems, ui."experiencePoints", ui.level
        `, [username]);

        if (!details.length) {
          throw new Error(`Usuario no encontrado: ${username}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details[0], null, 2),
            },
          ],
        };
      }

      case 'create-store-item': {
        const { name, description, type, rarity, price } = args as {
          name: string;
          description?: string;
          type: string;
          rarity?: string;
          price: number;
        };

        const result = await dataSource.query(`
          INSERT INTO store_items (name, description, type, rarity, price, "isActive")
          VALUES ($1, $2, $3, $4, $5, true)
          RETURNING id, name, price
        `, [name, description || '', type, rarity || 'common', price]);

        return {
          content: [
            {
              type: 'text',
              text: `✅ Item creado: ${result[0].name} (${result[0].price} monedas) - ID: ${result[0].id}`,
            },
          ],
        };
      }

      case 'analytics-report': {
        const { period } = args as { period: string };

        const dateFilter =
          period === 'today'
            ? `AND "createdAt" >= CURRENT_DATE`
            : period === 'week'
            ? `AND "createdAt" >= CURRENT_DATE - INTERVAL '7 days'`
            : period === 'month'
            ? `AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days'`
            : '';

        const stats = await dataSource.query(`
          SELECT 
            (SELECT COUNT(*) FROM users WHERE role = 'student' ${dateFilter}) as total_students,
            (SELECT COUNT(*) FROM users WHERE role = 'teacher' ${dateFilter}) as total_teachers,
            (SELECT COUNT(*) FROM classrooms ${dateFilter}) as total_classrooms,
            (SELECT COUNT(*) FROM activities ${dateFilter}) as total_activities,
            (SELECT COUNT(*) FROM user_purchases ${dateFilter}) as total_purchases,
            (SELECT COALESCE(SUM(coins), 0) FROM user_inventory) as total_coins_distributed,
            (SELECT COALESCE(SUM("pricePaid"), 0) FROM user_purchases ${dateFilter}) as total_coins_spent
        `);

        return {
          content: [
            {
              type: 'text',
              text: `📊 Reporte de Analytics (${period}):\n\n${JSON.stringify(
                stats[0],
                null,
                2
              )}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Iniciar servidor
async function main() {
  dataSource = createDataSource();
  
  console.error('🚀 AcaLud MCP Server iniciado');
  console.error('📍 Conectando a base de datos...');
  
  await dataSource.initialize();
  console.error('✅ Conectado a PostgreSQL');

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ Servidor MCP listo para recibir conexiones');
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
