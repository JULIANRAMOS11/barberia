# 💈 BarberOS — Sistema de Gestión Integral para Barberías & Salones

> **Sistema SaaS de alta gama** desarrollado para la administración operativa, agendamiento inteligente, punto de pago (caja) con liquidación automática de comisiones, inventario físico con dotación de herramientas, días de descanso y portal de reservas público para clientes con integración a redes sociales y WhatsApp.

---

## 📑 Tabla de Contenidos
1. [Visión General y Propósito](#-visión-general)
2. [Estructura Completa del Proyecto](#-estructura-del-proyecto)
3. [Módulos y Funcionalidades](#-módulos-y-funcionalidades)
   - [Punto de Pago y Caja (Efectivo, Transferencia, Tarjeta)](#1-punto-de-pago-y-caja)
   - [Inventario Triple y Dotación por Trabajador](#2-inventario-y-dotación-por-empleado)
   - [Agenda Maestra y Sincronización en Vivo](#3-agenda-maestra-y-sincronización)
   - [Horarios (9:00 AM a 9:00 PM) y Días de Descanso](#4-horarios-y-días-de-descanso)
   - [Gestión de Clientes sin Cita / De Paso (Walk-in)](#5-clientes-sin-cita-de-paso)
   - [Portal Público de Reservas y Redes Sociales](#6-portal-público-de-reservas-para-clientes)
   - [Usuarios, Roles y Cuentas de Trabajadores](#7-usuarios-roles-y-cuentas-de-trabajadores)
4. [Base de Datos y Modelo de Datos (Supabase)](#-base-de-datos-y-supabase)
5. [Modo Demo vs Modo Real](#-modo-demo-vs-modo-real)
6. [Puesta en Marcha Local y Despliegue](#-puesta-en-marcha-y-despliegue)
7. [Credenciales de Demostración](#-credenciales-de-demostración)

---

## 🎯 Visión General

BarberOS fue diseñado para resolver los dolores cotidianos de barberías y estudios de belleza modernos:
- **Cero colisiones de agenda**: Ningún cliente puede agendarse en el mismo horario con el mismo profesional.
- **Transparencia en comisiones**: Cada corte y producto vendido calcula en el instante el porcentaje exacto para el trabajador y la ganancia neta para el negocio.
- **Agilidad en mostrador**: Atiende tanto a clientes agendados como a personas que entran de la calle sin cita previa.
- **Cuidado del activo físico**: Control estricto de máquinas de corte, secadores, lámparas UV y barberas entregadas a cada barbero o manicurista.

---

## 📁 Estructura del Proyecto

```text
barberia/
├── index.html                   # Entrada HTML principal con metaetiquetas SEO y fuentes
├── package.json                 # Dependencias (React 19, Vite, React Router, Supabase, XLSX)
├── vite.config.js               # Configuración de compilación Vite
├── vercel.json                  # Reglas de enrutamiento SPA para despliegue en Vercel
├── .env                         # Variables de entorno (URL y Llave pública de Supabase)
├── README.md                    # Manual integral del sistema y arquitectura
│
├── public/                      # Recursos estáticos públicos
│
├── supabase/                    # Scripts SQL para PostgreSQL en Supabase
│   ├── schema.sql               # Tablas, Enums, Políticas RLS y Función RPC procesar_pago()
│   └── seed.sql                 # Datos de prueba iniciales (servicios, insumos, invitaciones)
│
└── src/
    ├── main.jsx                 # Punto de arranque de la aplicación React
    ├── index.css                # Sistema de diseño de alto impacto (Dark & Gold Theme, Glassmorphism)
    │
    ├── context/                 # Estados globales de la aplicación
    │   ├── AuthContext.jsx      # Autenticación, sesión activa, rol y cambio entre Demo y Supabase
    │   └── ToastContext.jsx     # Notificaciones interactivas en pantalla (éxito, error, info)
    │
    ├── hooks/                   # Custom Hooks reutilizables
    │   └── useMediaQuery.js     # Detección de dispositivos móviles y pantallas táctiles
    │
    ├── components/              # Componentes de interfaz compartidos
    │   ├── Layout.jsx           # Marco principal: Sidebar de navegación, usuario, botón de link público
    │   ├── Icon.jsx             # Iconografía vectorial SVG nativa (redes, tijeras, pago, etc.)
    │   ├── ui.jsx               # Botones, Modales, Spinner, Switch, Badges, Avatar y Skeletons
    │   ├── CitaModal.jsx        # Ventana para crear o reprogramar citas en la agenda
    │   └── DashboardCharts.jsx  # Gráficos SVG interactivos (Donut de pagos, barras de horas pico)
    │
    ├── lib/                     # Lógica de negocio y utilidades
    │   ├── constants.js         # Horarios (9-21), Áreas (Barbería/Women), Métodos de pago, Redes
    │   ├── format.js            # Formato de moneda ($ COP), fechas en español y duraciones
    │   ├── horarios.js          # Lógica de cálculo y asignación de días de descanso por empleado
    │   │
    │   └── api/                 # Capa de abstracción de datos
    │       ├── index.js         # Selector dinámico: Conecta a Supabase o al motor Demo local
    │       ├── supabaseApi.js   # Cliente oficial que interactúa con PostgreSQL y Supabase Auth
    │       ├── demoApi.js       # Base de datos simulada en localStorage con aislamiento completo
    │       └── demoSeed.js      # Generador determinístico de citas, barberos y servicios demo
    │
    └── pages/                   # Vistas principales del sistema
        ├── Login.jsx            # Inicio de sesión elegante con imagen de fondo y selección de rol
        ├── Dashboard.jsx        # Panel administrativo: métricas del día, ingresos, gráficos y alertas
        ├── AgendaMaestra.jsx    # Calendario central de turnos, huecos libres y botón Walk-in
        ├── Caja.jsx             # Punto de cobro: 3 métodos de pago, venta de productos y comisiones
        ├── Inventario.jsx       # Consumibles, catálogo de máquinas y dotación por trabajador
        ├── Reportes.jsx         # Cierre de caja, métricas contables y exportación a Excel (.xlsx)
        ├── Configuracion.jsx    # Gestión de empleados, descansos, servicios y reglas del local
        ├── ReservaPublica.jsx   # Link exclusivo para clientes con redes sociales y agendamiento
        ├── MiAgenda.jsx         # Vista exclusiva del trabajador para ver y gestionar sus turnos
        ├── MisFinanzas.jsx      # Vista exclusiva del trabajador con sus comisiones ganadas
        └── SinPerfil.jsx        # Pantalla de espera para usuarios sin barbería asignada
```

---

## 🚀 Módulos y Funcionalidades

### 1. Punto de Pago y Caja
- **Cobro Rápido con 3 Métodos de Pago**:
  - 💵 **Efectivo**: Conteo de billetes para la caja física.
  - 🟣 **Transferencia**: Nequi, Daviplata, Bre-B o transferencias bancarias.
  - 💳 **Tarjeta**: Cobros por datáfono (Débito o Crédito).
- **Venta de Productos en Caja**: Al momento de cobrar el corte, la cajera puede añadir ceras, minoxidil, aceites para barba o esmaltes, descontando inmediatamente las existencias del inventario.
- **Liquidación Automática de Comisiones**:
  - Al completar el pago, la función transaccional desglosa el valor del servicio multiplicándolo por el `% de comisión` pactado con ese barbero (ej. 45% o 50%).
  - El sistema registra la ganancia neta del local y el saldo a pagar al profesional sin necesidad de calcular nada manualmente en papel.

---

### 2. Inventario y Dotación por Empleado
El módulo de inventario está dividido en 3 pestañas especializadas:
1. **Consumibles de Venta y Uso**: Control de stock con alerta visual de agotamiento (*Stock Mínimo*).
2. **Herramientas y Equipos**:
   - Registro de máquinas de corte (Wahl Magic Clip Cordless, Babyliss Pro GoldFX).
   - Patilleras / Trimmers (Andis Slimline Pro).
   - Barberas de hoja intercambiable de acero inoxidable (Parker SRX).
   - Secadores iónicos profesionales (Parlux Alyon 2250W).
   - Lámparas de uñas UV/LED (SunX Plus 72W) y Tornos / Drills de manicura.
3. **Dotación por Empleado**:
   - Tarjetas individuales por cada trabajador donde se detalla exactamente qué herramientas tiene en su puesto de trabajo.
   - Registro de número de serie, fecha de entrega y estado de conservación (*Excelente*, *Buen estado*, *En mantenimiento*).
   - Botón **"+ Asignar Dotación"** para dar de alta nuevas herramientas o retirarlas cuando un trabajador deja el local.

---

### 3. Agenda Maestra y Sincronización
- **División por Áreas**: Pestañas separadas para **Barbería (Caballeros)** y **Zona Women (Damas / Uñas)** para que el calendario no se sature.
- **Detección de Tiempos Muertos**: Ilumina los espacios libres entre citas para que la recepción pueda reacomodar turnos o asignar clientes que llegan de paso.
- **Prevención de Cruces**: Valida en milisegundos que ningún barbero tenga dos clientes agendados a la misma hora.

---

### 4. Horarios y Días de Descanso
- **Horario Central**: Configurado de **9:00 AM a 9:00 PM** (12 horas de atención continua).
- **Descanso Semanal por Empleado**:
  - Desde *Configuración > Equipo*, cada trabajador tiene asignado su día de descanso (Lunes, Martes, Miércoles, etc.).
  - En la **Agenda Maestra**, la columna del empleado muestra el distintivo `🏖️ Descanso`.
  - En el **Portal de Reservas del Cliente**, los días de descanso del barbero aparecen señalizados y deshabilitados, mostrando un aviso amable que invita al cliente a seleccionar otro día o elegir a otro profesional disponible.

---

### 5. Clientes sin Cita / De Paso (Walk-in)
En la parte superior de la Agenda Maestra se encuentra el botón **`+ Cliente sin Cita (Paso)`**:
- Evalúa al instante quién está desocupado en ese momento (`● Disponible ahora` vs `Ocupado hasta las XX:XX`).
- Permite resolver la atención con un solo clic:
  - **"Atender Ahora (En Proceso)"**: Bloquea el espacio en la agenda inmediatamente.
  - **"Ya terminó (Pasar a Caja directo)"**: Envía el registro directo a la caja para realizar el cobro.

---

### 6. Portal Público de Reservas para Clientes
- **Ruta de Acceso**: `/reservar` (ej. `https://tu-dominio.com/reservar`).
- **Enlace Personalizado por Barbero**: `/reservar?barbero=[ID]` para que el cliente entre con su barbero favorito preseleccionado.
- **Redes Sociales Integradas**: En la cabecera y pie de página se incluyen los accesos directos oficiales a:
  - 🎵 **TikTok**
  - 📸 **Instagram**
  - 👥 **Facebook**
  - 💬 **WhatsApp**
- **Confirmación con 1 Clic**: Al finalizar la reserva, el cliente puede pulsar el botón **"Confirmar por WhatsApp"**, el cual abre WhatsApp con un mensaje prefabricado con todos los detalles de su cita.

---

### 7. Usuarios, Roles y Cuentas de Trabajadores
El sistema cuenta con 2 roles con estricto aislamiento de seguridad:

| Característica | Administrador / Dueña | Trabajador (Barbero / Estilista) |
|---|:---:|:---:|
| **Dashboard e Ingresos Globales** | ✅ Sí | ❌ No |
| **Agenda Maestra Completa** | ✅ Sí | ❌ Solo su propia agenda |
| **Punto de Pago y Caja** | ✅ Sí | ❌ No |
| **Finanzas Personales / Comisiones** | ✅ Todo el local | ✅ Solo sus propias comisiones |
| **Inventario y Dotación** | ✅ Completo | ❌ Solo consulta asignada |
| **Configuración de Precios y Personal** | ✅ Sí | ❌ No |

#### ¿Cómo se sincronizan las cuentas?
- Cuando un barbero entra con su correo y contraseña desde su propio teléfono celular, ve su sección **"Mi espacio"** (*Mi Agenda* y *Mis Finanzas*).
- Si el barbero inicia o finaliza un servicio en su teléfono, la recepcionista o administradora lo ve reflejado al instante en la pantalla principal.
- Si un cliente agenda por internet o llega de la calle, le aparece automáticamente al barbero en su lista de turnos del día.

---

## 🗄️ Base de Datos y Supabase

El backend está construido sobre **PostgreSQL en Supabase**, empleando **Row Level Security (RLS)** para garantizar que ninguna persona ajena a la barbería pueda ver los datos.

### Tablas Principales:
- `barberias`: Información de la empresa y configuración de comisiones.
- `usuarios`: Perfiles vinculados a Supabase Auth (Admin o Empleado, Área y % Comisión).
- `servicios`: Catálogo con precio al público y duración en minutos para bloqueo de turnos.
- `citas`: Registro histórico de citas, estados (`pendiente`, `en_proceso`, `completada`, `pagada`, `cancelada`), fecha y notas.
- `inventario`: Insumos y herramientas con stock actual y costo.
- `caja_diaria`: Movimientos de facturación con método de pago (`efectivo`, `transferencia`, `tarjeta`), total cobrado y comisión calculada.
- `invitaciones`: Tokens seguros para dar de alta a nuevos empleados.

### Procedimiento Almacenado Seguro (RPC):
- `procesar_pago(p_cita_id, p_metodo, p_items_inventario)`: Ejecuta una transacción atómica en PostgreSQL:
  1. Cambia el estado de la cita a `pagada`.
  2. Descuenta del inventario los productos vendidos.
  3. Liquida la comisión del barbero.
  4. Registra el asiento contable en `caja_diaria`.

---

## 🔄 Modo Demo vs Modo Real

BarberOS incluye un motor de persistencia dual:

```text
               ┌───────────────────────────────┐
               │    Selector API (api/index.js) │
               └──────────────┬────────────────┘
                              │
             Tiene credenciales en .env?
                     /                \
                   SÍ                  NO
                  /                      \
   ┌───────────────────────┐   ┌───────────────────────────┐
   │ supabaseApi.js        │   │ demoApi.js                │
   │ PostgreSQL en la nube │   │ localStorage del navegador│
   │ Supabase Auth         │   │ Seed con 14 empleados     │
   │ Producción Real       │   │ Modo prueba sin servidor  │
   └───────────────────────┘   └───────────────────────────┘
```

> **¿Qué pasa cuando vayas a pasar a datos reales?**
> **No tienes que rehacer nada.** La interfaz, las validaciones y los cálculos son idénticos. Simplemente configuras tu proyecto de Supabase en el archivo `.env` y el sistema pasa automáticamente al modo conectado en la nube.

---

## 💻 Puesta en Marcha y Despliegue

### Requisitos Previos:
- [Node.js](https://nodejs.org/) (versión 18 o superior).
- Git.

### 1. Clonar e Instalar:
```bash
git clone https://github.com/JULIANRAMOS11/barberia.git
cd barberia
npm install
```

### 2. Ejecutar Localmente:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173/`.

### 3. Compilar para Producción:
```bash
npm run build
```

### 4. Despliegue en la Nube (Vercel):
El proyecto incluye `vercel.json` con reescritura para Single Page Applications (SPA). Cada vez que haces `git push origin main`, Vercel compila y publica los cambios de forma automática en:
- `https://barberia-91hg.vercel.app`
- `https://barberia-smoky.vercel.app`

---

## 🔑 Credenciales de Demostración

Para probar todos los roles en el modo demo sin necesidad de crear correos reales:

### Administrador (Dueña / Recepción):
- **Correo:** `admin@demo.com`
- **Contraseña:** `demo123`
- *Acceso:* Control total (Dashboard, Agenda Maestra, Caja, Inventario, Reportes, Configuración).

### Barberos (Barbería Caballeros):
- `carlos@demo.com` · Clave: `demo123`
- `andres@demo.com` · Clave: `demo123`
- `julian@demo.com` · Clave: `demo123`
- `santiago@demo.com` · Clave: `demo123`
- `mateo@demo.com` · Clave: `demo123`
- *Acceso:* Mi Agenda personal y Mis Finanzas con sus comisiones.

### Estilistas / Manicuristas (Zona Women):
- `valentina@demo.com` · Clave: `demo123`
- `camila@demo.com` · Clave: `demo123`
- `laura@demo.com` · Clave: `demo123`
- `daniela@demo.com` · Clave: `demo123`
- `sofia@demo.com` · Clave: `demo123`
- *Acceso:* Mi Agenda personal y Mis Finanzas de tratamientos y uñas.

---

## 📞 Soporte y Licencia
Desarrollado con estándares de software empresarial, alta disponibilidad y máxima velocidad de respuesta.
Licencia privada para **Elite Barber Studio**.
