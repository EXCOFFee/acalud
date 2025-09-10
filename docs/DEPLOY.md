# 🚀 Guía de Deploy - AcaLud

Esta guía detalla cómo hacer deploy de AcaLud en diferentes plataformas de producción.

## 🐳 Deploy con Docker (Recomendado)

### Desarrollo Local
```bash
# Clonar y configurar
git clone <repository-url>
cd acalud
chmod +x setup.sh
./setup.sh

# Usar Docker
docker-compose up -d
```

### Producción
```bash
# Configurar variables de entorno
cp .env.example .env
# Editar .env con valores de producción

# Deploy
docker-compose -f docker-compose.yml up -d

# Verificar
docker-compose ps
docker-compose logs -f
```

## ☁️ Deploy en la Nube

### 1. DigitalOcean App Platform

#### Configuración del App
```yaml
name: acalud
services:
  - name: frontend
    source_dir: /
    github:
      repo: tu-usuario/acalud
      branch: main
    build_command: npm run build
    run_command: npx serve -s dist -p 8080
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: VITE_API_URL
        value: ${backend.PUBLIC_URL}/api/v1

  - name: backend
    source_dir: /backend
    github:
      repo: tu-usuario/acalud
      branch: main
    build_command: npm run build
    run_command: npm run start:prod
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "8080"
      - key: JWT_SECRET
        value: ${JWT_SECRET}
      - key: DB_HOST
        value: ${acalud-postgres.HOSTNAME}
      - key: DB_PORT
        value: ${acalud-postgres.PORT}
      - key: DB_USERNAME
        value: ${acalud-postgres.USERNAME}
      - key: DB_PASSWORD
        value: ${acalud-postgres.PASSWORD}
      - key: DB_NAME
        value: ${acalud-postgres.DATABASE}
      - key: REDIS_HOST
        value: ${acalud-redis.HOSTNAME}
      - key: REDIS_PORT
        value: ${acalud-redis.PORT}

databases:
  - name: acalud-postgres
    engine: PG
    version: "15"
    size: basic
    num_nodes: 1

  - name: acalud-redis
    engine: REDIS
    version: "7"
    size: basic
    num_nodes: 1
```

### 2. Railway

#### Frontend
1. Conectar repositorio en Railway
2. Configurar variables:
   ```
   VITE_API_URL=https://tu-backend.railway.app/api/v1
   ```
3. Build command: `npm run build`
4. Start command: `npx serve -s dist`

#### Backend
1. Conectar repositorio en Railway
2. Configurar variables:
   ```
   NODE_ENV=production
   JWT_SECRET=tu-secret-super-seguro
   DB_HOST=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
   DB_PORT=${{Postgres.RAILWAY_TCP_PROXY_PORT}}
   DB_USERNAME=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   DB_NAME=${{Postgres.PGDATABASE}}
   REDIS_HOST=${{Redis.RAILWAY_PRIVATE_DOMAIN}}
   REDIS_PORT=${{Redis.RAILWAY_TCP_PROXY_PORT}}
   ```
3. Build command: `cd backend && npm run build`
4. Start command: `cd backend && npm run start:prod`

### 3. Vercel (Frontend) + PlanetScale (DB) + Railway (Backend)

#### Frontend en Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configurar variables en dashboard
VITE_API_URL=https://tu-backend.railway.app/api/v1
```

#### Base de datos en PlanetScale
1. Crear cuenta en PlanetScale
2. Crear base de datos "acalud"
3. Obtener connection string
4. Configurar en backend

#### Backend en Railway
Similar al paso 2, pero usando PlanetScale connection string.

### 4. AWS (Completo)

#### Arquitectura
- Frontend: CloudFront + S3
- Backend: ECS Fargate
- Base de datos: RDS PostgreSQL
- Cache: ElastiCache Redis
- Load Balancer: ALB

#### Terraform Configuration
```hcl
# terraform/main.tf
provider "aws" {
  region = "us-west-2"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "acalud-vpc"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "acalud-postgres"
  engine     = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  
  db_name  = "acalud_db"
  username = "postgres"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  
  tags = {
    Name = "acalud-postgres"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "acalud-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "acalud-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Name = "acalud-redis"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "acalud-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "acalud-cluster"
  }
}
```

#### Deploy Commands
```bash
# Inicializar Terraform
cd terraform
terraform init
terraform plan
terraform apply

# Build y push imágenes
docker build -t acalud-backend ./backend
docker build -t acalud-frontend .

# Tag y push a ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

docker tag acalud-backend:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/acalud-backend:latest
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/acalud-backend:latest

# Actualizar servicio ECS
aws ecs update-service --cluster acalud-cluster --service acalud-backend --force-new-deployment
```

## 🔧 Configuración de Variables de Entorno por Entorno

### Desarrollo
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret-not-secure
FRONTEND_URL=http://localhost:5173
```

### Staging
```env
NODE_ENV=staging
DB_HOST=staging-db.example.com
DB_PORT=5432
REDIS_HOST=staging-redis.example.com
REDIS_PORT=6379
JWT_SECRET=staging-secret-secure
FRONTEND_URL=https://staging.acalud.com
```

### Producción
```env
NODE_ENV=production
DB_HOST=prod-db.example.com
DB_PORT=5432
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
JWT_SECRET=super-secure-production-secret-256-bits
FRONTEND_URL=https://acalud.com
```

## 🔍 Monitoreo y Logs

### Health Checks
```bash
# Frontend
curl https://tu-dominio.com/health

# Backend
curl https://api.tu-dominio.com/api/v1/health

# Base de datos
curl https://api.tu-dominio.com/api/v1/health/db
```

### Logs
```bash
# Docker
docker-compose logs -f backend
docker-compose logs -f frontend

# Railway
railway logs --service backend

# AWS
aws logs get-log-events --log-group-name /ecs/acalud-backend
```

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Error de conexión a base de datos
```bash
# Verificar conexión
docker-compose exec backend npm run typeorm migration:run

# Revisar logs
docker-compose logs postgres
```

#### 2. Frontend no carga
```bash
# Verificar build
npm run build

# Verificar variables de entorno
echo $VITE_API_URL
```

#### 3. Backend no responde
```bash
# Verificar puerto
lsof -i :3001

# Verificar variables de entorno
docker-compose exec backend env | grep DB_
```

### Contacto de Soporte
- Email: soporte@acalud.com
- Issues: GitHub Issues
- Documentación: README.md
