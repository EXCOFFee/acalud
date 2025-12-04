# ============================================================================
# DOCKERFILE PARA BACKEND - ACALUD
# ============================================================================
# Imagen optimizada para producción con Node.js y PostgreSQL usando pnpm

# Etapa de construcción
FROM node:18-alpine AS builder

# Instalar pnpm y dependencias del sistema
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* .npmrc* ./
COPY tsconfig*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para build)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY src/ ./src/

# Construir la aplicación
RUN pnpm run build

# Instalar solo dependencias de producción para la imagen final
RUN pnpm install --prod --frozen-lockfile

# Etapa de producción
FROM node:18-alpine AS production

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Instalar dumb-init para manejo correcto de señales
RUN apk add --no-cache dumb-init

# Crear directorio de trabajo
WORKDIR /app

# Copiar dependencias de producción
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Crear directorio para uploads
RUN mkdir -p uploads && chown -R nestjs:nodejs uploads

# Cambiar al usuario no-root
USER nestjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicio con dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node dist/health-check.js || exit 1
