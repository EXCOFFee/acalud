# 📘 AcaLud – Plataforma Académica Lúdica

│   ├── services/          # Servicios API```bash

AcaLud es una plataforma educativa que combina gestión de aulas, actividades interactivas y gamificación para ofrecer experiencias de aprendizaje motivadoras. Este repositorio reúne el frontend (React + Vite), el backend (NestJS + PostgreSQL) y la infraestructura necesaria para ejecutar el proyecto en entornos locales y productivos.

## 🧭 Guía rápida de instalación

> Si solo necesitas poner el proyecto en marcha en tu equipo, sigue esta sección. El resto del README conserva contenido histórico y detalles avanzados.

### Requisitos previos
- Node.js **>= 20** y pnpm **>= 9** (instalar: `corepack enable && corepack prepare pnpm@latest --activate`)
- Docker y Docker Compose (opcional pero recomendado)
- PostgreSQL 14+ (solo para ejecución manual del backend)
- Git

### Variables de entorno mínimas
1. Copia los archivos de ejemplo:
	```bash
	cp .env.example .env
	cp backend/.env.example backend/.env
	```
2. Edita `backend/.env` con las credenciales de tu base de datos PostgreSQL y claves JWT.
3. (Opcional) Ajusta `src/config` si deseas apuntar a un backend remoto.

### Opción A – Desarrollo con Docker Compose
1. Asegúrate de tener Docker funcionando.
2. Levanta toda la pila:
	```bash
	docker-compose up -d
	```
3. Accede al frontend en `http://localhost:5173` y a la API en `http://localhost:3001/api/v1`.
4. Detén los servicios cuando termines:
	```bash
	docker-compose down
	```

### Opción B – Desarrollo manual (sin Docker)
1. **Backend**
	```bash
	cd backend
	pnpm install
	pnpm run start:dev
	```
	El backend escucha por defecto en `http://localhost:3001`.

2. **Frontend**
	```bash
	cd ../
	pnpm install
	pnpm run dev
	```
	El cliente Vite queda disponible en `http://localhost:5173`.

### Validación rápida
- Frontend: `pnpm test`
- Backend: `pnpm --filter acalud-backend test`
- E2E backend: `pnpm --filter acalud-backend run test:e2e`

Consulta `docs/INSTRUCCIONES_GITHUB.md` para lineamientos de contribución y `docs/DEPLOY.md` para despliegues productivos.

│   ├── contexts/          # Context API# Backend

## 📑 Tabla de Contenidos

│   └── types/             # Tipos TypeScriptcp backend/.env.example backend/.env

1. [Arquitectura General](#arquitectura-general)

2. [Requisitos Previos](#requisitos-previos)├── nginx/                 # Configuración Nginx# Editar backend/.env con tus configuraciones

3. [Inicio Rápido](#inicio-rápido)

4. [Scripts Útiles](#scripts-útiles)├── docker-compose.yml     # Orquestación Docker

5. [Testing Automatizado](#testing-automatizado)

6. [Integración Continua](#integración-continua)└── scripts/              # Scripts de utilidad# Frontend (opcional)

7. [Estructura del Repositorio](#estructura-del-repositorio)

8. [Documentación Relacionada](#documentación-relacionada)```cp .env.example .env

9. [Guía de Contribución](#guía-de-contribución)

10. [Licencia y Soporte](#licencia-y-soporte)# Editar .env si necesitas configuraciones específicas



## 🧱 Arquitectura General## 🎮 Funcionalidades Principales```



- **Frontend**: React 18, TypeScript, Vite y Tailwind CSS.

- **Backend**: NestJS + TypeScript con TypeORM sobre PostgreSQL.

- **Autenticación**: JWT y Passport.### Para Profesores#### 4. Desarrollo con Docker (Recomendado)

- **Cache**: Redis para almacenamiento temporal y rate limiting.

- **Almacenamiento de archivos**: Sistema local configurable mediante variables de entorno.- ✅ Crear y gestionar aulas virtuales```bash

- **Infraestructura sugerida**: Docker Compose para orquestar servicios (frontend, backend, base de datos, nginx).

- ✅ Diseñar actividades interactivas# Levantar todos los servicios

## ✅ Requisitos Previos

- ✅ Configurar juegos educativos (Crucigrama, Simulación)

```bash
docker-compose up -d
docker-compose down
```

### Frontend

```bash
pnpm test
pnpm run test:coverage
```

# Limpiar imágenes

```bash
docker system prune -f
```

## 📊 Monitoreo

### Health Checks
- **Frontend**: http://localhost:3000/health
- **Backend**: http://localhost:3001/api/v1/health
- **Database**: Incluido en Docker health checks

## 📄 Licencia

### Logs

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.```bash

# Ver logs de todos los servicios

## 👥 Equipodocker-compose logs -f



Desarrollado con ❤️ para la educación digital.# Ver logs de un servicio específico

docker-compose logs -f backend

---```



## 🆘 ¿Necesitas Ayuda?## 🔒 Seguridad



Si tienes problemas:### Medidas Implementadas

1. Revisa la sección de **Solución de Problemas** arriba- ✅ Autenticación JWT

2. Verifica que Docker esté corriendo- ✅ Validación de entrada con class-validator

3. Asegúrate de que los puertos no estén ocupados- ✅ Rate limiting

4. Revisa los logs: `docker-compose logs -f`- ✅ CORS configurado

- ✅ Headers de seguridad

**¡Listo para empezar tu experiencia educativa con AcaLud!** 🎓- ✅ Sanitización de datos
- ✅ Encriptación de contraseñas

### Para Producción
- [ ] Certificados SSL/TLS
- [ ] WAF (Web Application Firewall)
- [ ] Backup automático de base de datos
- [ ] Monitoreo de seguridad
- [ ] Logs de auditoría

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Estándares de Código
- ESLint para linting
- Prettier para formateo
- Conventional Commits
- Tests requeridos para nuevas funcionalidades

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo

- **Desarrollador Principal**: Tu Nombre
- **UI/UX Designer**: Diseñador
- **Product Manager**: Manager

## 📞 Soporte

- **Email**: soporte@acalud.com
- **Documentación**: https://docs.acalud.com
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/acalud/issues)

## 🔮 Roadmap

### v1.1 (Próximo)
- [ ] Modo offline para actividades
- [ ] Notificaciones push
- [ ] Chat en tiempo real
- [ ] Integración con LMS existentes

### v1.2 (Futuro)
- [ ] Aplicación móvil nativa
- [ ] Analíticas avanzadas
- [ ] IA para recomendaciones
- [ ] Modo colaborativo en tiempo real

---

⭐ **¡Si te gusta este proyecto, dale una estrella!** ⭐
