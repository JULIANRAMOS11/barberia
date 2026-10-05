-- =====================================================================
--  BARBERÍA SaaS — Esquema completo para Supabase (PostgreSQL)
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
--  Orden: 1) schema.sql   2) seed.sql
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------
do $$ begin
  create type rol_usuario   as enum ('admin', 'empleado');
  create type area_trabajo  as enum ('barberia', 'women');
  create type estado_cita   as enum ('pendiente', 'en_proceso', 'completada', 'pagada', 'cancelada');
  create type metodo_pago   as enum ('efectivo', 'nequi', 'transferencia', 'tarjeta');
  create type tipo_producto as enum ('venta', 'consumo_interno', 'herramienta');
exception when duplicate_object then null; end $$;

-- Compatibilidad para bases de datos existentes:
alter type public.metodo_pago add value if not exists 'transferencia';
alter type public.metodo_pago add value if not exists 'tarjeta';
alter type public.tipo_producto add value if not exists 'herramienta';

-- ---------------------------------------------------------------------
-- 2. TENANTS
-- ---------------------------------------------------------------------
create table if not exists public.barberias (
  id                          uuid primary key default gen_random_uuid(),
  nombre                      text not null,
  suscripcion_activa          boolean not null default true,
  -- Pendiente de definir con la dueña: ¿la comisión incluye productos vendidos?
  comision_incluye_productos  boolean not null default false,
  created_at                  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. USUARIOS (perfil 1:1 con auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.usuarios (
  id                   uuid primary key references auth.users(id) on delete cascade,
  barberia_id          uuid not null references public.barberias(id) on delete cascade,
  rol                  rol_usuario not null default 'empleado',
  nombre               text not null,
  email                text,
  area                 area_trabajo,                       -- null para admin
  porcentaje_comision  numeric(5,2) not null default 0
                       check (porcentaje_comision between 0 and 100),
  activo               boolean not null default true,
  created_at           timestamptz not null default now()
);
create index if not exists usuarios_barberia_area_idx on public.usuarios (barberia_id, area);

-- ---------------------------------------------------------------------
-- 4. FUNCIONES DE SESIÓN (base del RLS)
--    SECURITY DEFINER evita recursión de políticas sobre "usuarios".
--    Si la suscripción está inactiva o el usuario desactivado => NULL,
--    con lo cual el RLS no devuelve ningún dato.
-- ---------------------------------------------------------------------
create or replace function public.mi_barberia_id()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select u.barberia_id into v
  from usuarios u join barberias b on b.id = u.barberia_id
  where u.id = auth.uid() and u.activo and b.suscripcion_activa;
  return v;
end $$;

create or replace function public.es_admin()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return exists (
    select 1 from usuarios u join barberias b on b.id = u.barberia_id
    where u.id = auth.uid() and u.rol = 'admin' and u.activo and b.suscripcion_activa
  );
end $$;

-- ---------------------------------------------------------------------
-- 5. INVITACIONES (alta de empleados sin service_role)
--    El admin crea la invitación => el empleado se registra con ese
--    correo => un trigger crea su fila en "usuarios".
-- ---------------------------------------------------------------------
create table if not exists public.invitaciones (
  id                   uuid primary key default gen_random_uuid(),
  barberia_id          uuid not null default public.mi_barberia_id()
                       references public.barberias(id) on delete cascade,
  email                text not null,
  nombre               text not null,
  rol                  rol_usuario not null default 'empleado',
  area                 area_trabajo,
  porcentaje_comision  numeric(5,2) not null default 0
                       check (porcentaje_comision between 0 and 100),
  usada                boolean not null default false,
  created_at           timestamptz not null default now()
);
create unique index if not exists invitaciones_email_pendiente_idx
  on public.invitaciones (lower(email)) where not usada;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv invitaciones;
begin
  select * into inv from invitaciones
  where lower(email) = lower(new.email) and not usada
  order by created_at desc limit 1;

  if found then
    insert into usuarios (id, barberia_id, rol, nombre, email, area, porcentaje_comision)
    values (new.id, inv.barberia_id, inv.rol, inv.nombre, new.email, inv.area, inv.porcentaje_comision);
    update invitaciones set usada = true where id = inv.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. SERVICIOS
-- ---------------------------------------------------------------------
create table if not exists public.servicios (
  id                uuid primary key default gen_random_uuid(),
  barberia_id       uuid not null default public.mi_barberia_id()
                    references public.barberias(id) on delete cascade,
  nombre            text not null,
  area              area_trabajo,                          -- null = ambas áreas
  precio            numeric(12,2) not null check (precio >= 0),
  duracion_minutos  int not null check (duracion_minutos between 5 and 480),
  activo            boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. CITAS
--    fecha_fin se calcula por trigger y una restricción EXCLUDE impide
--    que un empleado tenga dos citas solapadas (excepto canceladas).
-- ---------------------------------------------------------------------
create table if not exists public.citas (
  id                uuid primary key default gen_random_uuid(),
  barberia_id       uuid not null default public.mi_barberia_id()
                    references public.barberias(id) on delete cascade,
  cliente           text not null,
  cliente_telefono  text,
  empleado_id       uuid not null references public.usuarios(id) on delete restrict,
  servicio_id       uuid not null references public.servicios(id) on delete restrict,
  estado            estado_cita not null default 'pendiente',
  fecha_hora        timestamptz not null,
  duracion_minutos  int not null,
  fecha_fin         timestamptz not null,
  precio            numeric(12,2) not null,               -- snapshot del precio
  notas             text,
  created_at        timestamptz not null default now(),
  constraint citas_sin_solapamiento exclude using gist (
    empleado_id with =,
    tstzrange(fecha_hora, fecha_fin, '[)') with &&
  ) where (estado <> 'cancelada')
);
create index if not exists citas_barberia_fecha_idx on public.citas (barberia_id, fecha_hora);
create index if not exists citas_empleado_fecha_idx on public.citas (empleado_id, fecha_hora);

create or replace function public.citas_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare s servicios;
begin
  if tg_op = 'INSERT' or new.servicio_id is distinct from old.servicio_id then
    select * into s from servicios where id = new.servicio_id;
    if not found or s.barberia_id <> new.barberia_id then
      raise exception 'Servicio inválido para esta barbería';
    end if;
    new.duracion_minutos := s.duracion_minutos;
    new.precio := s.precio;
  end if;

  if not exists (select 1 from usuarios where id = new.empleado_id and barberia_id = new.barberia_id) then
    raise exception 'Empleado inválido para esta barbería';
  end if;

  if tg_op = 'UPDATE' and old.estado = 'pagada' and new.estado <> 'pagada' then
    raise exception 'Una cita pagada no puede cambiar de estado';
  end if;

  new.fecha_fin := new.fecha_hora + make_interval(mins => new.duracion_minutos);
  return new;
end $$;

drop trigger if exists citas_before_write on public.citas;
create trigger citas_before_write
  before insert or update on public.citas
  for each row execute function public.citas_before_write();

-- ---------------------------------------------------------------------
-- 8. INVENTARIO
-- ---------------------------------------------------------------------
create table if not exists public.inventario (
  id             uuid primary key default gen_random_uuid(),
  barberia_id    uuid not null default public.mi_barberia_id()
                 references public.barberias(id) on delete cascade,
  nombre         text not null,
  tipo           tipo_producto not null default 'venta',
  stock_actual   int not null default 0 check (stock_actual >= 0),
  stock_minimo   int not null default 5 check (stock_minimo >= 0),
  precio_compra  numeric(12,2) not null default 0 check (precio_compra >= 0),
  precio_venta   numeric(12,2) not null default 0 check (precio_venta >= 0),
  created_at     timestamptz not null default now()
);
create index if not exists inventario_barberia_idx on public.inventario (barberia_id);

-- ---------------------------------------------------------------------
-- 9. CAJA DIARIA (libro contable, inmutable desde el cliente)
-- ---------------------------------------------------------------------
create table if not exists public.caja_diaria (
  id                   uuid primary key default gen_random_uuid(),
  barberia_id          uuid not null references public.barberias(id) on delete cascade,
  cita_id              uuid not null unique references public.citas(id) on delete restrict,
  empleado_id          uuid not null,
  registrado_por       uuid,
  metodo_pago          metodo_pago not null,
  total_servicio       numeric(12,2) not null,
  total_productos      numeric(12,2) not null default 0,
  total_pago           numeric(12,2) not null,
  porcentaje_aplicado  numeric(5,2) not null,
  comision_empleado    numeric(12,2) not null,
  created_at           timestamptz not null default now(),
  constraint caja_diaria_empleado_fkey   foreign key (empleado_id)    references public.usuarios(id),
  constraint caja_diaria_registrado_fkey foreign key (registrado_por) references public.usuarios(id)
);
create index if not exists caja_barberia_fecha_idx on public.caja_diaria (barberia_id, created_at);
create index if not exists caja_empleado_fecha_idx on public.caja_diaria (empleado_id, created_at);

create table if not exists public.caja_productos (
  id               uuid primary key default gen_random_uuid(),
  barberia_id      uuid not null references public.barberias(id) on delete cascade,
  caja_id          uuid not null references public.caja_diaria(id) on delete cascade,
  producto_id      uuid not null references public.inventario(id) on delete restrict,
  cantidad         int not null check (cantidad > 0),
  precio_unitario  numeric(12,2) not null,
  subtotal         numeric(12,2) not null
);

-- ---------------------------------------------------------------------
-- 10. RPC: PROCESAR PAGO (transaccional)
--   - Valida que quien cobra es admin de la misma barbería
--   - Bloquea la cita y los productos (FOR UPDATE) para evitar carreras
--   - Lee porcentaje_comision del empleado y calcula la comisión exacta
--   - Descuenta stock_actual de cada producto vendido
--   - Inserta caja_diaria + caja_productos y marca la cita como 'pagada'
--   p_productos: [{"producto_id": "uuid", "cantidad": 2}, ...]
-- ---------------------------------------------------------------------
create or replace function public.procesar_pago(
  p_cita_id   uuid,
  p_metodo    metodo_pago,
  p_productos jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_barberia   uuid := mi_barberia_id();
  v_cita       citas;
  v_empleado   usuarios;
  v_cfg        barberias;
  v_item       jsonb;
  v_prod       inventario;
  v_cant       int;
  v_total_prod numeric(12,2) := 0;
  v_base       numeric(12,2);
  v_comision   numeric(12,2);
  v_caja_id    uuid;
begin
  if v_barberia is null or not es_admin() then
    raise exception 'Solo un administrador puede procesar pagos';
  end if;

  select * into v_cita from citas where id = p_cita_id and barberia_id = v_barberia for update;
  if not found then raise exception 'Cita no encontrada'; end if;
  if v_cita.estado <> 'completada' then
    raise exception 'Solo se pueden cobrar citas en estado Completada (estado actual: %)', v_cita.estado;
  end if;

  select * into v_empleado from usuarios where id = v_cita.empleado_id;
  select * into v_cfg from barberias where id = v_barberia;

  insert into caja_diaria (barberia_id, cita_id, empleado_id, registrado_por, metodo_pago,
                           total_servicio, total_productos, total_pago, porcentaje_aplicado, comision_empleado)
  values (v_barberia, v_cita.id, v_cita.empleado_id, auth.uid(), p_metodo,
          v_cita.precio, 0, v_cita.precio, v_empleado.porcentaje_comision, 0)
  returning id into v_caja_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_productos, '[]'::jsonb)) loop
    v_cant := (v_item->>'cantidad')::int;
    if v_cant is null or v_cant <= 0 then continue; end if;

    select * into v_prod from inventario
    where id = (v_item->>'producto_id')::uuid and barberia_id = v_barberia
    for update;
    if not found then raise exception 'Producto no encontrado'; end if;
    if v_prod.tipo <> 'venta' then raise exception '"%" es de consumo interno y no se puede vender', v_prod.nombre; end if;
    if v_prod.stock_actual < v_cant then
      raise exception 'Stock insuficiente de "%" (disponible: %)', v_prod.nombre, v_prod.stock_actual;
    end if;

    update inventario set stock_actual = stock_actual - v_cant where id = v_prod.id;
    insert into caja_productos (barberia_id, caja_id, producto_id, cantidad, precio_unitario, subtotal)
    values (v_barberia, v_caja_id, v_prod.id, v_cant, v_prod.precio_venta, v_prod.precio_venta * v_cant);
    v_total_prod := v_total_prod + v_prod.precio_venta * v_cant;
  end loop;

  v_base := v_cita.precio + case when v_cfg.comision_incluye_productos then v_total_prod else 0 end;
  v_comision := round(v_base * v_empleado.porcentaje_comision / 100.0, 2);

  update caja_diaria
     set total_productos = v_total_prod,
         total_pago = v_cita.precio + v_total_prod,
         comision_empleado = v_comision
   where id = v_caja_id;

  update citas set estado = 'pagada' where id = v_cita.id;

  return jsonb_build_object(
    'caja_id', v_caja_id,
    'total_servicio', v_cita.precio,
    'total_productos', v_total_prod,
    'total_pago', v_cita.precio + v_total_prod,
    'porcentaje', v_empleado.porcentaje_comision,
    'comision_empleado', v_comision
  );
end $$;

-- ---------------------------------------------------------------------
-- 11. RPC: EMPLEADO CAMBIA ESTADO DE SU PROPIA CITA
--     (los empleados no tienen UPDATE directo sobre "citas")
-- ---------------------------------------------------------------------
create or replace function public.cambiar_estado_mi_cita(p_cita_id uuid, p_estado estado_cita)
returns void language plpgsql security definer set search_path = public as $$
declare v_cita citas;
begin
  if p_estado not in ('en_proceso', 'completada') then
    raise exception 'Estado no permitido';
  end if;
  select * into v_cita from citas
  where id = p_cita_id and empleado_id = auth.uid() and barberia_id = mi_barberia_id()
  for update;
  if not found then raise exception 'Cita no encontrada'; end if;
  if v_cita.estado in ('pagada', 'cancelada') then
    raise exception 'La cita ya está %', v_cita.estado;
  end if;
  update citas set estado = p_estado where id = p_cita_id;
end $$;

-- ---------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.barberias      enable row level security;
alter table public.usuarios       enable row level security;
alter table public.invitaciones   enable row level security;
alter table public.servicios      enable row level security;
alter table public.citas          enable row level security;
alter table public.inventario     enable row level security;
alter table public.caja_diaria    enable row level security;
alter table public.caja_productos enable row level security;

-- barberias
drop policy if exists barberias_select on public.barberias;
create policy barberias_select on public.barberias for select
  using (id = mi_barberia_id());
drop policy if exists barberias_update on public.barberias;
create policy barberias_update on public.barberias for update
  using (id = mi_barberia_id() and es_admin())
  with check (id = mi_barberia_id());

-- usuarios: cada quien ve su perfil; el admin ve a todo su equipo
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios for select
  using (id = auth.uid() or (es_admin() and barberia_id = mi_barberia_id()));
drop policy if exists usuarios_update on public.usuarios;
create policy usuarios_update on public.usuarios for update
  using (es_admin() and barberia_id = mi_barberia_id())
  with check (barberia_id = mi_barberia_id());

-- invitaciones (solo admin)
drop policy if exists invitaciones_all on public.invitaciones;
create policy invitaciones_all on public.invitaciones for all
  using (es_admin() and barberia_id = mi_barberia_id())
  with check (es_admin() and barberia_id = mi_barberia_id());

-- servicios: todos leen los de su barbería; admin escribe
drop policy if exists servicios_select on public.servicios;
create policy servicios_select on public.servicios for select
  using (barberia_id = mi_barberia_id());
drop policy if exists servicios_write on public.servicios;
create policy servicios_write on public.servicios for all
  using (es_admin() and barberia_id = mi_barberia_id())
  with check (es_admin() and barberia_id = mi_barberia_id());

-- citas: admin todo su local; empleado solo las suyas (lectura)
drop policy if exists citas_select on public.citas;
create policy citas_select on public.citas for select
  using (barberia_id = mi_barberia_id() and (es_admin() or empleado_id = auth.uid()));
drop policy if exists citas_write on public.citas;
create policy citas_write on public.citas for all
  using (es_admin() and barberia_id = mi_barberia_id())
  with check (es_admin() and barberia_id = mi_barberia_id());

-- inventario (solo admin)
drop policy if exists inventario_all on public.inventario;
create policy inventario_all on public.inventario for all
  using (es_admin() and barberia_id = mi_barberia_id())
  with check (es_admin() and barberia_id = mi_barberia_id());

-- caja_diaria: solo lectura (se escribe vía procesar_pago)
drop policy if exists caja_select on public.caja_diaria;
create policy caja_select on public.caja_diaria for select
  using (barberia_id = mi_barberia_id() and (es_admin() or empleado_id = auth.uid()));

drop policy if exists caja_productos_select on public.caja_productos;
create policy caja_productos_select on public.caja_productos for select
  using (es_admin() and barberia_id = mi_barberia_id());

-- Permisos de ejecución de RPCs
revoke all on function public.procesar_pago(uuid, metodo_pago, jsonb) from public, anon;
grant execute on function public.procesar_pago(uuid, metodo_pago, jsonb) to authenticated;
revoke all on function public.cambiar_estado_mi_cita(uuid, estado_cita) from public, anon;
grant execute on function public.cambiar_estado_mi_cita(uuid, estado_cita) to authenticated;

-- ---------------------------------------------------------------------
-- 13. AUTO-AGENDAMIENTO PÚBLICO (Link de WhatsApp para Clientes)
--     Permite a clientes reservar sin cuenta, asegurando que no se
--     solapen citas y bloqueando la duración exacta del servicio.
-- ---------------------------------------------------------------------
create or replace function public.crear_cita_publica(
  p_barberia_id       uuid,
  p_empleado_id       uuid,
  p_servicio_id       uuid,
  p_cliente           text,
  p_cliente_telefono  text,
  p_fecha_hora        timestamptz,
  p_notas             text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_serv servicios;
  v_emp  usuarios;
  v_cita citas;
begin
  if p_cliente is null or trim(p_cliente) = '' then
    raise exception 'El nombre del cliente es obligatorio';
  end if;

  select * into v_serv from servicios where id = p_servicio_id and barberia_id = p_barberia_id and activo;
  if not found then raise exception 'Servicio no disponible'; end if;

  select * into v_emp from usuarios where id = p_empleado_id and barberia_id = p_barberia_id and activo and rol = 'empleado';
  if not found then raise exception 'Profesional no disponible'; end if;

  if p_fecha_hora < now() then
    raise exception 'No se pueden agendar citas en fechas u horas pasadas';
  end if;

  insert into citas (
    barberia_id, cliente, cliente_telefono, empleado_id, servicio_id,
    estado, fecha_hora, duracion_minutos, fecha_fin, precio, notas
  ) values (
    p_barberia_id, trim(p_cliente), trim(p_cliente_telefono), v_emp.id, v_serv.id,
    'pendiente', p_fecha_hora, v_serv.duracion_minutos,
    p_fecha_hora + make_interval(mins => v_serv.duracion_minutos), v_serv.precio, p_notas
  ) returning * into v_cita;

  return jsonb_build_object(
    'id', v_cita.id,
    'cliente', v_cita.cliente,
    'fecha_hora', v_cita.fecha_hora,
    'duracion_minutos', v_cita.duracion_minutos,
    'precio', v_cita.precio,
    'empleado', v_emp.nombre,
    'servicio', v_serv.nombre
  );
end $$;

grant execute on function public.crear_cita_publica(uuid, uuid, uuid, text, text, timestamptz, text) to anon, authenticated;

-- Políticas públicas para que la página de reservas lea el catálogo
drop policy if exists servicios_public_read on public.servicios;
create policy servicios_public_read on public.servicios for select to anon using (activo = true);

drop policy if exists usuarios_public_read on public.usuarios;
create policy usuarios_public_read on public.usuarios for select to anon using (activo = true and rol = 'empleado');

drop policy if exists citas_public_availability on public.citas;
create policy citas_public_availability on public.citas for select to anon using (estado <> 'cancelada');

