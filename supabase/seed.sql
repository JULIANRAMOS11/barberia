-- =====================================================================
--  BARBERÍA SaaS — Datos Iniciales (Seed) para Supabase
--  Ejecutar DESPUÉS de haber corrido schema.sql
-- =====================================================================

do $$
declare
  v_barberia_id uuid;
  v_admin_id uuid := auth.uid(); -- Si se corre logueado en Supabase SQL Editor
  v_b1 uuid; v_b2 uuid; v_b3 uuid; v_b4 uuid; v_b5 uuid; v_b6 uuid; v_b7 uuid; v_b8 uuid; v_b9 uuid;
  v_w1 uuid; v_w2 uuid; v_w3 uuid; v_w4 uuid; v_w5 uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid; v_s5 uuid; v_s6 uuid; v_s7 uuid; v_s8 uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid; v_p5 uuid;
begin
  -- 1. Crear Barbería Principal
  insert into public.barberias (nombre, suscripcion_activa, comision_incluye_productos)
  values ('Elite Barber Studio', true, false)
  returning id into v_barberia_id;

  -- 2. Crear Servicios (Barbería y Zona Women)
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Corte Clásico', 'barberia', 25000, 30) returning id into v_s1;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Corte + Barba', 'barberia', 35000, 45) returning id into v_s2;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Degradado / Fade', 'barberia', 30000, 45) returning id into v_s3;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Perfilado de Barba', 'barberia', 15000, 30) returning id into v_s4;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Manicure Tradicional', 'women', 25000, 45) returning id into v_s5;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Pedicure Spa', 'women', 32000, 60) returning id into v_s6;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Uñas Acrílicas', 'women', 85000, 120) returning id into v_s7;
  insert into public.servicios (id, barberia_id, nombre, area, precio, duracion_minutos) values
    (gen_random_uuid(), v_barberia_id, 'Semipermanente', 'women', 45000, 60) returning id into v_s8;

  -- 3. Crear Inventario Inicial
  insert into public.inventario (barberia_id, nombre, tipo, stock_actual, stock_minimo, precio_compra, precio_venta) values
    (v_barberia_id, 'Cera Mate Reuzel', 'venta', 14, 5, 22000, 42000),
    (v_barberia_id, 'Pomada con Brillo', 'venta', 3, 5, 18000, 35000), -- Alerta bajo stock
    (v_barberia_id, 'Aceite para Barba', 'venta', 8, 5, 15000, 32000),
    (v_barberia_id, 'Minoxidil 5%', 'venta', 9, 5, 35000, 60000),
    (v_barberia_id, 'Shampoo Anticaída', 'venta', 2, 5, 14000, 28000), -- Alerta bajo stock
    (v_barberia_id, 'Cuchillas Dorco (Caja)', 'consumo_interno', 4, 5, 25000, 0), -- Alerta
    (v_barberia_id, 'Talco para Barbero', 'consumo_interno', 8, 3, 8000, 0),
    (v_barberia_id, 'Toallas Desechables', 'consumo_interno', 50, 15, 600, 0),
    (v_barberia_id, 'Esmalte Semipermanente', 'consumo_interno', 18, 5, 9000, 0),
    (v_barberia_id, 'Acetona Pura', 'consumo_interno', 3, 5, 7000, 0);

  -- 4. Crear Invitaciones para los 14 Empleados (9 Barberos y 5 Mujeres)
  insert into public.invitaciones (barberia_id, nombre, email, rol, area, porcentaje_comision) values
    (v_barberia_id, 'Carlos Méndez', 'carlos@demo.com', 'empleado', 'barberia', 45),
    (v_barberia_id, 'Andrés Rojas', 'andres@demo.com', 'empleado', 'barberia', 40),
    (v_barberia_id, 'Julián Torres', 'julian@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Santiago Pérez', 'santiago@demo.com', 'empleado', 'barberia', 45),
    (v_barberia_id, 'Mateo Gómez', 'mateo@demo.com', 'empleado', 'barberia', 40),
    (v_barberia_id, 'Felipe Castro', 'felipe@demo.com', 'empleado', 'barberia', 45),
    (v_barberia_id, 'Daniel Ríos', 'daniel@demo.com', 'empleado', 'barberia', 50),
    (v_barberia_id, 'Sebastián Vargas', 'sebastian@demo.com', 'empleado', 'barberia', 45),
    (v_barberia_id, 'Kevin Morales', 'kevin@demo.com', 'empleado', 'barberia', 40),
    (v_barberia_id, 'Valentina López', 'valentina@demo.com', 'empleado', 'women', 50),
    (v_barberia_id, 'Camila Herrera', 'camila@demo.com', 'empleado', 'women', 45),
    (v_barberia_id, 'Laura Martínez', 'laura@demo.com', 'empleado', 'women', 50),
    (v_barberia_id, 'Daniela Ruiz', 'daniela@demo.com', 'empleado', 'women', 45),
    (v_barberia_id, 'Sofía Ramírez', 'sofia@demo.com', 'empleado', 'women', 50);

  raise notice 'Seed cargado exitosamente para la barbería: %', v_barberia_id;
end $$;
