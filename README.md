# 💈 BarberOS — Sistema de Gestión para Barberías & Salones

Sistema web integral desarrollado para la gestión operativa, agendas por área, punto de pago (caja) con liquidación automática de comisiones, inventario físico y cierres contables exportables a Excel.

---

## 🚀 Características Principales

### 1. Multi-Rol con Aislamiento (Admin & Empleados)
- **Administrador:**
  - **Dashboard Global:** Métricas de facturación del día, citas completadas, top servicios más vendidos y alertas de stock bajo.
  - **Agenda Maestra:** Calendario interactivo con pestañas de filtro para **Barbería** (9 empleados) y **Zona Women** (5 empleadas) evitando sobrecarga visual. Detección de tiempos muertos y prevención de citas solapadas.
  - **Punto de Pago (Caja):** Liquidación de citas completadas, adición de productos físicos de venta y cálculo automático inmediato de la comisión de cada profesional.
  - **Inventario:** CRUD completo con diferenciación entre productos de **Venta al cliente** y **Consumo interno** (insumos de barberos/estilistas).
  - **Reportes y Cierre:** Historial contable y exportación de planillas de comisiones por empleado a formato **Excel (.xlsx)**.
  - **Configuración:** Administración de los 14 empleados, comisiones, invitaciones y catálogo de servicios con duraciones bloqueadas.
- **Empleados (Barberos y Zona Women):**
  - **Mi Agenda:** Vista simplificada día a día de sus citas asignadas con botones de 1 clic para cambiar de estado (*Iniciar Servicio* / *Terminar Servicio*).
  - **Mis Finanzas:** Historial personal de cortes y comisiones acumuladas, sin acceso a las finanzas globales del negocio.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 19, Vite, React Router 7.
- **Estilos:** CSS Nativo Premium (Dark & Gold Theme, Glassmorphism, Responsive Mobile & Desktop).
- **Exportación:** SheetJS (`xlsx`) para reportes contables.
- **Backend / Base de Datos:** Supabase (PostgreSQL) con **Row Level Security (RLS)** y funciones transaccionales RPC (`procesar_pago`).
- **Modo Demo Offline:** Permite ejecutar y probar toda la lógica de negocio y roles localmente sin necesidad de conexión inicial a base de datos.

---

## 📦 Puesta en Marcha Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173/](http://localhost:5173/) en tu navegador.

---

## 🗄️ Conexión con Supabase (Producción)

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve al **SQL Editor** y ejecuta en este orden:
   - `supabase/schema.sql`: Estructura de tablas, RLS, triggers y RPC transaccional.
   - `supabase/seed.sql`: Servicios, inventario inicial e invitaciones para los 14 empleados.
3. Copia tus credenciales en el archivo `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```
