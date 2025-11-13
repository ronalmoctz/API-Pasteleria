-- Base de datos para la aplicación de pedidos de pastelería
-- ========= TABLA DE USUARIOS Y ROLES =========
-- Almacena tanto clientes como administradores.
-- El rol se gestiona con una restricción CHECK para asegurar la integridad.
CREATE TABLE
    users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone_number TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('customer', 'admin')) DEFAULT 'customer',
        is_active BOOLEAN NOT NULL DEFAULT 1,
        last_seen TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%d %H:%M:%S', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%d %H:%M:%S', 'now'))
    );

-- ========= TABLAS RELACIONADAS A LOS PRODUCTOS =========
-- 1. Categorías de los productos (e.g., Pasteles, Galletas, Bebidas, Postres fríos)
CREATE TABLE
    categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
    );

-- 2. Ingredientes disponibles en el inventario
CREATE TABLE
    ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        stock_quantity REAL NOT NULL DEFAULT 0.0, -- Cantidad en inventario
        unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'unit')) -- Gramos, Kilos, Mililitros, Litros, Unidades
    );

-- 3. Tabla principal de productos
CREATE TABLE
    products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT UNIQUE,
        price REAL NOT NULL,
        image_url TEXT,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        cost_price REAL NOT NULL DEFAULT 0.0,
        category_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%d %H:%M:%S', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%d %H:%M:%S', 'now')),
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
    );

-- 4. Tabla de enlace (Muchos a Muchos) entre Productos e Ingredientes
-- Permite saber qué ingredientes y en qué cantidad se necesitan para cada producto.
CREATE TABLE
    product_ingredients (
        product_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        quantity_required REAL NOT NULL, -- Cantidad del ingrediente para este producto
        PRIMARY KEY (product_id, ingredient_id),
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE RESTRICT
    );

-- ========= TABLAS RELACIONADAS A LAS ÓRDENES =========
-- 1. Estados de una orden (e.g., Pendiente, En preparación, Lista para recoger, Completada, Cancelada)
CREATE TABLE
    order_statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status_name TEXT NOT NULL UNIQUE
    );

-- 2. Tabla principal de órdenes
CREATE TABLE
    orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status_id INTEGER NOT NULL,
        order_date TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%d %H:%M:%S', 'now')),
        total_amount REAL NOT NULL,
        special_instructions TEXT,
        completed_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (status_id) REFERENCES order_statuses (id) ON DELETE RESTRICT
    );

-- 3. Tabla de enlace (Muchos a Muchos) entre Órdenes y Productos
-- Detalla qué productos y en qué cantidad se incluyen en cada orden.
CREATE TABLE
    order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price_per_unit REAL NOT NULL, -- Guarda el precio al momento de la compra, por si el precio del producto cambia después
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
    );

-- ========= TRIGGERS PARA AUTOMATIZACIÓN =========
-- Trigger para actualizar el campo 'updated_at' en la tabla 'users'
CREATE TRIGGER trigger_users_updated_at AFTER
UPDATE ON users FOR EACH ROW BEGIN
UPDATE users
SET
    updated_at = strftime ('%Y-%m-%d %H:%M:%S', 'now')
WHERE
    id = OLD.id;

END;

-- Trigger para actualizar el campo 'updated_at' en la tabla 'products'
CREATE TRIGGER trigger_products_updated_at AFTER
UPDATE ON products FOR EACH ROW BEGIN
UPDATE products
SET
    updated_at = strftime ('%Y-%m-%d %H:%M:%S', 'now')
WHERE
    id = OLD.id;

END;

-- ========= ÍNDICES PARA MEJORAR EL RENDIMIENTO =========
-- Índices en llaves foráneas y campos de búsqueda común
CREATE INDEX idx_products_category_id ON products (category_id);

CREATE INDEX idx_orders_user_id ON orders (user_id);

CREATE INDEX idx_orders_status_id ON orders (status_id);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE INDEX idx_order_items_product_id ON order_items (product_id);

CREATE INDEX idx_users_email ON users (email);