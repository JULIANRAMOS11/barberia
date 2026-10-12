-- =====================================================================
--  BARBERÍA SaaS — Datos Iniciales (Seed) para Supabase
--  Ejecutar DESPUÉS de haber corrido schema.sql
-- =====================================================================

do $$
declare
  v_barberia_id uuid;
  v_admin_id uuid := auth.uid(); -- Si se corre logueado en Supabase SQL Editor
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid; v_s5 uuid; v_s6 uuid; v_s7 uuid; v_s8 uuid;
begin
  -- 1. Crear Barbería Principal (Comisión 50% en servicios, 0% en productos)
  insert into public.barberias (nombre, suscripcion_activa, comision_incluye_productos)
  values ('Elite Barber Studio', true, false)
  returning id into v_barberia_id;

  -- 2. Crear Servicios Reales (Barbería y Zona Women)
  -- Enfoque directo: Servicios completos listos sin necesidad de enredos de extras manuales
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Corte Clásico', 'barberia', 25000, 30) returning id into v_s1;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Corte + Cejas', 'barberia', 30000, 35) returning id into v_s2;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Corte + Barba', 'barberia', 35000, 45) returning id into v_s3;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Corte + Barba + Cejas', 'barberia', 45000, 50) returning id into v_s4;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Perfilado de Barba', 'barberia', 15000, 20) returning id into v_s5;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Arreglo de Cejas', 'barberia', 10000, 15) returning id into v_s6;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Manicure Tradicional', 'women', 25000, 45) returning id into v_s7;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Pedicure Spa', 'women', 35000, 60) returning id into v_s8;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Semipermanente', 'women', 45000, 60);
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Uñas Acrílicas', 'women', 85000, 120);
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Cepillado y Planchado', 'women', 30000, 45);

  -- 3. Crear Inventario Inicial (Venta al cliente e Insumos organizados)
  insert into public.inventario (barberia_id, nombre, tipo, stock_actual, stock_minimo, precio_compra, precio_venta) values
    (v_barberia_id, 'Cera Mate Reuzel', 'venta', 14, 5, 22000, 42000),
    (v_barberia_id, 'Pomada con Brillo', 'venta', 3, 5, 18000, 35000),
    (v_barberia_id, 'Aceite para Barba', 'venta', 8, 5, 15000, 32000),
    (v_barberia_id, 'Minoxidil 5%', 'venta', 9, 5, 35000, 60000),
    (v_barberia_id, 'Shampoo Anticaída', 'venta', 2, 5, 14000, 28000),
    (v_barberia_id, 'Cuchillas Dorco (Caja)', 'consumo_interno', 4, 5, 25000, 0),
    (v_barberia_id, 'Talco para Barbero', 'consumo_interno', 8, 3, 8000, 0),
    (v_barberia_id, 'Toallas Desechables', 'consumo_interno', 50, 15, 600, 0),
    (v_barberia_id, 'Esmalte Semipermanente', 'consumo_interno', 18, 5, 9000, 0),
    (v_barberia_id, 'Acetona Pura', 'consumo_interno', 3, 5, 7000, 0);

  -- 4. Crear Empleados / Profesionales con Comisión del 50% fija
  insert into public.invitaciones (barberia_id, nombre, email, rol, area, porcentaje_comision) values
    (v_barberia_id, 'Carlos Méndez', 'carlos@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Andrés Rojas', 'andres@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Julián Torres', 'julian@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Santiago Pérez', 'santiago@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Mateo Gómez', 'mateo@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Felipe Castro', 'felipe@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Daniel Ríos', 'daniel@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Sebastián Vargas', 'sebastian@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Kevin Morales', 'kevin@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Valentina López', 'valentina@demo.com', 'empleado', 'women', 50),
    (v_barberia_id, 'Camila Herrera', 'camila@demo.com', 'empleado', 'women', 50),
    (v_barberia_id, 'Laura Martínez', 'laura@demo.com', 'empleado', 'women', 50),
    (v_barberia_id, 'Daniela Ruiz', 'daniela@demo.com', 'empleado', 'women', 50),
    (v_barberia_id, 'Sofía Ramírez', 'sofia@demo.com', 'empleado', 'women', 50);

  raise notice 'Seed cargado exitosamente para la barbería con comisión al 50%: %', v_barberia_id;
end $$;
