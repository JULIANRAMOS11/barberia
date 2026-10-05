import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon'
import { Modal, Spinner } from './ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { duracion, fromInputs, hora, money, toDateInput, toTimeInput } from '../lib/format'

/**
 * Crear / editar cita.
 * props: open, onClose, onSaved(cita), empleados, servicios, initial ({empleado_id, fecha_hora} o cita completa)
 */
export default function CitaModal({ open, onClose, onSaved, empleados, servicios, initial }) {
  const toast = useToast()
  const editing = Boolean(initial?.id)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const fh = initial?.fecha_hora ? new Date(initial.fecha_hora) : new Date()
    setForm({
      cliente: initial?.cliente ?? '',
      cliente_telefono: initial?.cliente_telefono ?? '',
      empleado_id: initial?.empleado_id ?? empleados[0]?.id ?? '',
      servicio_id: initial?.servicio_id ?? '',
      fecha: toDateInput(fh),
      hora: toTimeInput(fh),
      notas: initial?.notas ?? '',
    })
  }, [open, initial, empleados])

  const empleado = empleados.find((e) => e.id === form?.empleado_id)
  const serviciosArea = useMemo(
    () => servicios.filter((s) => s.activo !== false && (!s.area || !empleado || s.area === empleado.area)),
    [servicios, empleado],
  )
  const servicio = servicios.find((s) => s.id === form?.servicio_id)

  // Si cambia el empleado a otra área y el servicio ya no aplica, se limpia
  useEffect(() => {
    if (form?.servicio_id && !serviciosArea.some((s) => s.id === form.servicio_id)) {
      setForm((f) => ({ ...f, servicio_id: '' }))
    }
  }, [serviciosArea, form?.servicio_id])

  if (!open || !form) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const inicio = form.fecha && form.hora ? fromInputs(form.fecha, form.hora) : null
  const fin = inicio && servicio ? new Date(inicio.getTime() + servicio.duracion_minutos * 60000) : null

  const submit = async (e) => {
    e.preventDefault()
    if (!servicio) return toast.error('Selecciona un servicio')
    setBusy(true)
    try {
      const payload = {
        cliente: form.cliente.trim(),
        cliente_telefono: form.cliente_telefono.trim(),
        empleado_id: form.empleado_id,
        servicio_id: form.servicio_id,
        fecha_hora: inicio,
        notas: form.notas.trim(),
      }
      const saved = editing ? await api.updateCita(initial.id, payload) : await api.createCita(payload)
      toast.success(editing ? 'Cita actualizada' : 'Cita agendada')
      onSaved?.(saved)
      onClose()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cita' : 'Nueva cita'}
      subtitle="El calendario bloquea automáticamente la duración del servicio."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button" id="cita-cancel">Cancelar</button>
          <button className="btn btn-primary" form="cita-form" type="submit" disabled={busy} id="cita-save">
            {busy ? <Spinner /> : <><Icon name="check" /> {editing ? 'Guardar cambios' : 'Agendar cita'}</>}
          </button>
        </>
      }
    >
      <form id="cita-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="cita-cliente">Cliente</label>
          <input id="cita-cliente" className="input" required value={form.cliente} onChange={set('cliente')} placeholder="Nombre del cliente" autoFocus />
        </div>
        <div className="field">
          <label className="label" htmlFor="cita-telefono">Teléfono (opcional)</label>
          <input id="cita-telefono" className="input" type="tel" autoComplete="tel" value={form.cliente_telefono} onChange={set('cliente_telefono')} placeholder="300 123 4567" />
        </div>
        <div className="field">
          <label className="label" htmlFor="cita-empleado">Empleado</label>
          <select id="cita-empleado" className="select" required value={form.empleado_id} onChange={set('empleado_id')}>
            {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="cita-servicio">Servicio</label>
          <select id="cita-servicio" className="select" required value={form.servicio_id} onChange={set('servicio_id')}>
            <option value="">Selecciona…</option>
            {serviciosArea.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre} · {duracion(s.duracion_minutos)} · {money(s.precio)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="cita-fecha">Fecha</label>
          <input id="cita-fecha" type="date" className="input" required value={form.fecha} onChange={set('fecha')} />
        </div>
        <div className="field">
          <label className="label" htmlFor="cita-hora">Hora de inicio</label>
          <input id="cita-hora" type="time" step="300" className="input" required value={form.hora} onChange={set('hora')} />
        </div>
        <div className="field span-2">
          <label className="label" htmlFor="cita-notas">Notas</label>
          <textarea id="cita-notas" className="textarea" rows={2} value={form.notas} onChange={set('notas')} placeholder="Preferencias del cliente, referencias…" />
        </div>

        {servicio && inicio && (
          <div className="span-2 receipt" style={{ padding: 14 }}>
            <div className="row-between wrap">
              <span className="row" style={{ gap: 8 }}><Icon name="clock" size={16} className="faint" /> {hora(inicio)} → {hora(fin)}</span>
              <span className="muted">{duracion(servicio.duracion_minutos)}</span>
              <strong className="mono gold-text">{money(servicio.precio)}</strong>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
