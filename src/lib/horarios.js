// Helper centralizado para gestión de días de descanso y horarios de empleados
import { DIAS_SEMANA } from './constants'

const STORAGE_PREFIX = 'barberia_emp_descanso_'

// Asignación de días de descanso por defecto para los barberos y estilitas
const DIAS_DEFAULT_MAP = {
  'Carlos Méndez': 1, // Lunes
  'Andrés Rojas': 2, // Martes
  'Julián Torres': 3, // Miércoles
  'Santiago Pérez': 4, // Jueves
  'Mateo Gómez': 5, // Viernes
  'Felipe Castro': 0, // Domingo
  'Daniel Ríos': 1, // Lunes
  'Sebastián Vargas': 2, // Martes
  'Kevin Morales': 3, // Miércoles
  'Valentina López': 1, // Lunes
  'Camila Herrera': 2, // Martes
  'Laura Martínez': 3, // Miércoles
  'Daniela Ruiz': 4, // Jueves
  'Sofía Ramírez': 0, // Domingo
}

export function getEmpleadoHorario(emp) {
  if (!emp) return { diaId: null, diaNombre: 'Sin descanso fijo', horario: '9:00 AM - 9:00 PM' }

  // 1. Revisar si viene guardado en localStorage
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${emp.id}`)
    if (raw) {
      const data = JSON.parse(raw)
      const diaObj = DIAS_SEMANA.find((d) => d.id === data.diaId)
      return {
        diaId: data.diaId ?? null,
        diaNombre: diaObj ? diaObj.label : 'Sin descanso fijo',
        horario: data.horario || '9:00 AM - 9:00 PM',
      }
    }
  } catch {
    // ignorar error de parseo
  }

  // 2. Si el objeto ya tiene dia_descanso asignado directamente
  if (emp.dia_descanso !== undefined && emp.dia_descanso !== null) {
    const diaObj = DIAS_SEMANA.find((d) => d.id === Number(emp.dia_descanso))
    return {
      diaId: Number(emp.dia_descanso),
      diaNombre: diaObj ? diaObj.label : 'Sin descanso fijo',
      horario: emp.horario_trabajo || '9:00 AM - 9:00 PM',
    }
  }

  // 3. Fallback inteligente basado en nombre o ID
  const defId = DIAS_DEFAULT_MAP[emp.nombre] !== undefined ? DIAS_DEFAULT_MAP[emp.nombre] : null
  const diaObj = DIAS_SEMANA.find((d) => d.id === defId)

  return {
    diaId: defId,
    diaNombre: diaObj ? diaObj.label : 'Sin descanso fijo',
    horario: '9:00 AM - 9:00 PM',
  }
}

export function saveEmpleadoHorario(empId, { diaId, horario = '9:00 AM - 9:00 PM' }) {
  if (!empId) return
  const data = {
    diaId: diaId === '' || diaId === null || diaId === undefined ? null : Number(diaId),
    horario,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(`${STORAGE_PREFIX}${empId}`, JSON.stringify(data))
  window.dispatchEvent(new CustomEvent('barberia_horarios_updated', { detail: { empId, ...data } }))
  return data
}

export function esDiaDescanso(emp, date) {
  if (!emp || !date) return false
  const { diaId } = getEmpleadoHorario(emp)
  if (diaId === null || diaId === undefined) return false
  const dayOfWeek = date instanceof Date ? date.getDay() : new Date(date).getDay()
  return dayOfWeek === diaId
}
