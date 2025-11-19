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
> Este proyecto sigue el patrón de clean arquitecture y está construido con Express, TypeScript y Turso.

## 📋 Descripción
API para una pastelería, desarrollada con buenas prácticas, arquitectura repository, validaciones, autenticación JWT, documentación Swagger y GraphQL.

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
  base/             # Clases base reutilizables (BaseRepository)
  config/           # Configuración general (DB, Swagger, GraphQL)
  constants/        # Constantes globales
  controllers/      # Controladores de rutas
  errors/           # Manejo de errores personalizado
  factories/        # Service Factory (Dependency Injection)
  graphql/          # Esquemas y resolvers GraphQL
  interfaces/       # Interfaces TypeScript y contratos de repositories
  middlewares/      # Middlewares de Express (auth, rate limit)
  repositories/     # Acceso a datos con cachéo
  routes/           # Definición de rutas REST
  schemas/          # Validaciones Zod
  services/         # Lógica de negocio
  strategies/       # Estrategias de cachéo (NodeCache)
  utils/            # Utilidades generales (logger, errors)
```

## 🛠️ Scripts útiles
- `pnpm dev` — Inicia el servidor en modo desarrollo
- `pnpm start` — Inicia el servidor en modo producción
- `pnpm lint` — Ejecuta ESLint
- `pnpm build` — Compila el proyecto TypeScript

## 🔐 Autenticación y Seguridad
> La API implementa autenticación JWT, rate limiting y validación de datos para proteger los endpoints.

> [!IMPORTANT]
> La API implementa autenticación JWT, rate limiting y validación de datos para proteger los endpoints.

### 🔑 Uso de JWT y Bearer Token

Para acceder a los endpoints protegidos, debes autenticarte y obtener un token JWT. Este token debe ser enviado en la cabecera `Authorization` de tus peticiones como un Bearer Token:

```http
Authorization: Bearer <tu_token_jwt>
```

> [!NOTE]
> Asegúrate de incluir el prefijo `Bearer` seguido de un espacio y luego el token JWT.


## 📖 Documentación y Endpoints

La API expone endpoints RESTful y un endpoint GraphQL, todos documentados y accesibles fácilmente:

- **Swagger UI**: Documentación interactiva en `/api-docs`.
- **Referencia Scalar**: Documentación de referencia en `/reference`.
- **Playground GraphQL**: Esquema y pruebas en `/graphql`.
- **Guía de inicio rápido y documentación complementaria**: [DeepWiki - Getting Started](https://deepwiki.com/ronalmoctz/API-Pasteleria/1.1-getting-started)

### Endpoints principales

| Tipo      | Endpoint                        | Descripción                                 |
|-----------|----------------------------------|---------------------------------------------|
| REST      | `/api/v1/categories`            | Gestión de categorías                       |
| REST      | `/api/v1/ingredients`           | Gestión de ingredientes                     |
| REST      | `/api/v1/products`              | Gestión de productos                        |
| REST      | `/api/v1/order-statuses`        | Estados de órdenes                          |
| REST      | `/api/v1/orders`                | Gestión de órdenes con items                |
| REST      | `/api/v1/orders/:id/complete`   | Marcar orden como completada (admin)        |
| REST      | `/api/v1/order-items`           | Gestión de items individuales de órdenes    |
| REST      | `/api/`                         | Autenticación y usuarios                    |
| GraphQL   | `/graphql`                      | Consultas y mutaciones flexibles            |

### Ruta de salud

Puedes verificar el estado del sistema y la base de datos con:

```http
GET /health
```
Respuesta:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-07-24T00:00:00.000Z",
  "uptime": 123.45,
  "database": "connected",
  "memory": { "used": "XX MB", "total": "YY MB" },
  "node_version": "vXX.XX.XX",
  "environment": "development"
}
```

### Acceso rápido a la documentación

- [Guía de inicio rápido](https://deepwiki.com/ronalmoctz/API-Pasteleria/1.1-getting-started)
- [Swagger UI](http://localhost:3000/api-docs)
- [Referencia Scalar](http://localhost:3000/reference)
- [Playground GraphQL](http://localhost:3000/graphql)

> Puedes consultar `/docs-info` para obtener enlaces actualizados y ejemplos de uso desde la propia API.

## 🧑‍💻 Autor
- Desarrollador: Ronaldo Moctezuma

## 📄 Licencia

Este proyecto está bajo la licencia ISC. Consulta el archivo [LICENSE](./LICENSE) para más detalles.
