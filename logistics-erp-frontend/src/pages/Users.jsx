import { useEffect, useState, useCallback } from 'react'
import { UsersAPI } from '../lib/api'
import DataTable from '../components/DataTable'
import { Badge, Field, Modal, PageHeader } from '../components/ui'
import { ROLES } from '../lib/roles'

const EMPTY = { name: '', email: '', password: '', role: 'employee' }

export default function Users() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await UsersAPI.list()
      const data = res.data?.data || res.data || []
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load users from the API.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const create = async (event) => {
    event.preventDefault(); setSaving(true)
    try {
      await UsersAPI.create(form)
      setOpen(false); setForm(EMPTY); load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not create user.')
    } finally { setSaving(false) }
  }

  return <div>
    <PageHeader eyebrow="Administration" title="User access" description="Create staff accounts and assign only the work they need." />
    <DataTable
      columns={[
        { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name || '—'}</span> },
        { key: 'email', header: 'Email' },
        { key: 'role', header: 'Role', render: (r) => <Badge tone="accent">{ROLES[r.role] || r.role || '—'}</Badge> },
      ]}
      rows={rows} loading={loading} error={error} onCreate={() => { setForm(EMPTY); setOpen(true) }} createLabel="Create user"
      emptyTitle="No staff users yet" emptyDescription="Create an employee, entry employee, or accountant account."
    />
    <Modal open={open} onClose={() => setOpen(false)} title="Create staff user">
      <form onSubmit={create} className="space-y-4">
        <Field label="Full name"><input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input required type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Temporary password"><input required minLength="8" type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role"><select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.entries(ROLES).filter(([key]) => key !== 'admin').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></Field>
        <p className="text-xs text-steel">Employee: drivers and vehicles. Entry employee: trip sheets. Accountant: cashbook.</p>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded border border-line text-steel">Cancel</button><button type="submit" disabled={saving} className="btn-accent px-4 py-2 text-sm rounded disabled:opacity-60">{saving ? 'Creating…' : 'Create user'}</button></div>
      </form>
    </Modal>
  </div>
}
