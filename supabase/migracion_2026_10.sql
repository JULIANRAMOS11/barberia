-- =====================================================================
--  MIGRACIÓN 2026-10 — Sincroniza la base de datos con la app
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
--  Es idempotente: se puede ejecutar varias veces sin romper nada.
--
--  Corrige:
--   1. Métodos de pago 'transferencia' y 'tarjeta' (hoy se guardan como 'nequi')
--   2. Tipo de inventario 'herramienta' (máquinas / dotación)
--   3. Día de descanso y horario del barbero guardados en la BD
--      (antes solo vivían en el navegador del admin)
--   4. Página pública de reservas: lectura de la barbería, servicios y
--      profesionales para clientes sin cuenta
--   5. Privacidad: los clientes anónimos ya NO pueden leer nombres ni
--      teléfonos de otras citas, ni correos / comisiones de empleados
--   6. Reserva pública valida descanso y horario del local
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 y 2. Enums
-- ---------------------------------------------------------------------
alter type public.metodo_pago   add value if not exists 'transferencia';
alter type public.metodo_pago   add value if not exists 'tarjeta';
alter type public.tipo_producto add value if not exists 'herramienta';

-- ---------------------------------------------------------------------
-- 3. Horario de empleados e inventario (proveedor / categoría)
-- ---------------------------------------------------------------------
alter table public.usuarios add column if not exists dia_descanso    smallint;
alter table public.usuarios add column if not exists horario_trabajo text;

alter table public.inventario add column if not exists proveedor text;
alter table public.inventario add column if not exists categoria text;

do $$ begin
  alter table public.usuarios
    add constraint usuarios_dia_descanso_chk check (dia_descanso between 0 and 6);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 4. Lectura pública del catálogo (página de reservas)
-- ---------------------------------------------------------------------
drop policy if exists barberias_public_read on public.barberias;
create policy barberias_public_read on public.barberias for select to anon
  using (suscripcion_activa);

drop policy if exists servicios_public_read on public.servicios;
create policy servicios_public_read on public.servicios for select to anon
  using (activo = true);

drop policy if exists usuarios_public_read on public.usuarios;
create policy usuarios_public_read on public.usuarios for select to anon
  using (activo = true and rol = 'empleado');

-- ---------------------------------------------------------------------
-- 5. Privacidad para visitantes anónimos
--    - usuarios: solo columnas públicas (sin email ni % de comisión)
--    - citas: se elimina la lectura directa; la disponibilidad se
--      consulta con la RPC disponibilidad_publica (solo horas ocupadas)
-- ---------------------------------------------------------------------
revoke select on public.usuarios from anon;
grant select (id, barberia_id, nombre, area, rol, activo, dia_descanso, horario_trabajo)
  on public.usuarios to anon;

revoke select on public.barberias from anon;
grant select (id, nombre, suscripcion_activa) on public.barberias to anon;

drop policy if exists citas_public_availability on public.citas;

create or replace function public.disponibilidad_publica(
  p_empleado_id uuid,
  p_desde       timestamptz,
  p_hasta       timestamptz
) returns table (fecha_hora timestamptz, fecha_fin timestamptz)
language sql stable security definer set search_path = public as $$
  select c.fecha_hora, c.fecha_fin
  from citas c
  join usuarios u on u.id = c.empleado_id and u.activo and u.rol = 'empleado'
  where c.empleado_id = p_empleado_id
    and c.estado <> 'cancelada'
    and c.fecha_hora <  p_hasta
    and c.fecha_fin  >  p_desde
    and p_hasta - p_desde <= interval '8 days'
  order by c.fecha_hora;
$$;

revoke all on function public.disponibilidad_publica(uuid, timestamptz, timestamptz) from public;
grant execute on function public.disponibilidad_publica(uuid, timestamptz, timestamptz) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Reserva pública con validaciones de negocio
--    Horario del local: 9:00 a 21:00 (hora Colombia)
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
  v_serv  servicios;
  v_emp   usuarios;
  v_cita  citas;
  v_local timestamp := p_fecha_hora at time zone 'America/Bogota';
  v_fin   timestamp;
begin
  if p_cliente is null or trim(p_cliente) = '' then
    raise exception 'El nombre del cliente es obligatorio';
  end if;

  if not exists (select 1 from barberias where id = p_barberia_id and suscripcion_activa) then
    raise exception 'Barbería no disponible';
  end if;

  select * into v_serv from servicios where id = p_servicio_id and barberia_id = p_barberia_id and activo;
  if not found then raise exception 'Servicio no disponible'; end if;

  select * into v_emp from usuarios
  where id = p_empleado_id and barberia_id = p_barberia_id and activo and rol = 'empleado';
  if not found then raise exception 'Profesional no disponible'; end if;

  if p_fecha_hora < now() then
    raise exception 'No se pueden agendar citas en fechas u horas pasadas';
  end if;

  v_fin := v_local + make_interval(mins => v_serv.duracion_minutos);
  if v_local::time < time '09:00' or v_fin::time > time '21:00' or v_fin::date <> v_local::date then
    raise exception 'El horario de atención es de 9:00 AM a 9:00 PM';
  end if;

  if v_emp.dia_descanso is not null and extract(dow from v_local)::int = v_emp.dia_descanso then
    raise exception '% descansa ese día. Elige otra fecha u otro profesional.', v_emp.nombre;
  end if;

  insert into citas (
    barberia_id, cliente, cliente_telefono, empleado_id, servicio_id,
    estado, fecha_hora, duracion_minutos, fecha_fin, precio, notas
  ) values (
    p_barberia_id, trim(p_cliente), nullif(trim(p_cliente_telefono), ''), v_emp.id, v_serv.id,
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

revoke all on function public.crear_cita_publica(uuid, uuid, uuid, text, text, timestamptz, text) from public;
grant execute on function public.crear_cita_publica(uuid, uuid, uuid, text, text, timestamptz, text) to anon, authenticated;

-- Refrescar caché de PostgREST para que la API vea los cambios de inmediato
notify pgrst, 'reload schema';

-- =====================================================================
--  VERIFICACIÓN (revisa el resultado en la pestaña "Results")
-- =====================================================================
select 'metodo_pago'   as chequeo, string_agg(e.enumlabel, ', ' order by e.enumsortorder) as valor
  from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'metodo_pago'
union all
select 'tipo_producto', string_agg(e.enumlabel, ', ' order by e.enumsortorder)
  from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'tipo_producto'
union all
select 'columnas horario', string_agg(column_name, ', ')
  from information_schema.columns
  where table_schema = 'public' and table_name = 'usuarios' and column_name in ('dia_descanso', 'horario_trabajo')
union all
select 'funciones', string_agg(proname, ', ' order by proname)
  from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('procesar_pago', 'cambiar_estado_mi_cita', 'crear_cita_publica', 'disponibilidad_publica', 'mi_barberia_id', 'es_admin')
union all
select 'barberias', count(*)::text from public.barberias
union all
select 'admins / empleados activos',
  count(*) filter (where rol = 'admin' and activo)::text || ' / ' || count(*) filter (where rol = 'empleado' and activo)::text
  from public.usuarios
union all
select 'servicios activos', count(*)::text from public.servicios where activo
union all
select 'productos inventario', count(*)::text from public.inventario
union all
select 'citas (total / por cobrar)',
  count(*)::text || ' / ' || count(*) filter (where estado = 'completada')::text from public.citas
union all
select 'pagos registrados en caja', count(*)::text from public.caja_diaria
union all
select 'citas pagadas SIN registro en caja (debe ser 0)', count(*)::text
  from public.citas c where c.estado = 'pagada'
  and not exists (select 1 from public.caja_diaria k where k.cita_id = c.id)
union all
select 'usuarios auth SIN perfil (no pueden entrar)', count(*)::text
  from auth.users a where not exists (select 1 from public.usuarios u where u.id = a.id);
