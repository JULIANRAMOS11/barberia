// Utilidades de formato y fechas (zona horaria local del navegador)

const moneyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export const money = (n) => moneyFmt.format(Number(n) || 0)

export function hora(date) {
  const d = new Date(date)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

export function horaCorta(h24) {
  const h = h24 % 12 || 12
  return `${h} ${h24 >= 12 ? 'pm' : 'am'}`
}

export const fechaLarga = (d) =>
  new Date(d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

export const fechaCorta = (d) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

export const fechaHora = (d) => `${fechaCorta(d)} · ${hora(d)}`

export function duracion(min) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (!h) return `${m} min`
  return m ? `${h}h ${m}m` : `${h}h`
}

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7 // lunes = 0
  return addDays(x, -dow)
}

export function startOfMonth(d = new Date()) {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()

export function toDateInput(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function toTimeInput(d) {
  const x = new Date(d)
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
}

export function fromInputs(dateStr, timeStr) {
  const [y, mo, da] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  return new Date(y, mo - 1, da, h, mi, 0, 0)
}

export function initials(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export const minutesBetween = (a, b) => (new Date(b) - new Date(a)) / 60000
