# 🎂 API-Pastelería

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Turso](https://img.shields.io/badge/Turso-00B4B6?style=for-the-badge)
![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3.25.67-8A2BE2?style=for-the-badge)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![Pino](https://img.shields.io/badge/Pino-9.7.0-339933?style=for-the-badge)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)

> [!IMPORTANT]
> Este proyecto sigue el patrón DDD (Domain Driven Design) y está construido con Express, TypeScript y Turso.

## 📋 Descripción
API para una pastelería, desarrollada con buenas prácticas, arquitectura DDD, validaciones, autenticación JWT, documentación Swagger y GraphQL.

> [!NOTE]
> El objetivo es proveer una API robusta, segura y fácil de mantener para la gestión de productos, órdenes, usuarios y más.

## 🚀 Tecnologías y librerías principales
- ⚡ **Express 5**: Framework web para Node.js
- 🟦 **TypeScript**: Tipado estático para JavaScript
- 🗄️ **Turso (libSQL)**: Base de datos SQL ligera
- 🧬 **GraphQL**: API flexible y eficiente
- 🛡️ **Zod**: Validación de esquemas
- 📝 **Swagger**: Documentación interactiva de la API
- 🔒 **JWT**: Autenticación segura
- 🔑 **bcrypt**: Hash de contraseñas
- 🚦 **ESLint**: Linter para mantener la calidad del código
- 📦 **pnpm**: Gestor de paquetes rápido y eficiente
- 🪵 **Pino**: Logger de alto rendimiento

## 📁 Estructura del proyecto
```
src/
  config/           # Configuración general
  constants/        # Constantes globales
  controllers/      # Controladores de rutas
  graphql/          # Esquemas y resolvers GraphQL
  interfaces/       # Interfaces TypeScript
  middlewares/      # Middlewares de Express
  repositories/     # Acceso a datos
  routes/           # Definición de rutas
  schemas/          # Validaciones y esquemas
  services/         # Lógica de negocio
  utils/            # Utilidades generales
```

## 🛠️ Scripts útiles
- `pnpm dev` — Inicia el servidor en modo desarrollo
- `pnpm start` — Inicia el servidor en modo producción
- `pnpm lint` — Ejecuta ESLint
- `pnpm build` — Compila el proyecto TypeScript

## 🔐 Autenticación y Seguridad
> [!IMPORTANT]
> La API implementa autenticación JWT, rate limiting y validación de datos para proteger los endpoints.

## 📖 Documentación
- Swagger UI disponible en `/api-docs`
- Referencia de la API con Scalar en `/reference`
- Esquema GraphQL en `/graphql`

## 🧑‍💻 Autor
- Desarrollador: [Tu Nombre Aquí]

## 📄 Licencia
Este proyecto está bajo la licencia ISC.
