import { useEffect, useState, useCallback } from 'react'
import { RolesAPI, UsersAPI } from '../lib/api'
import DataTable from '../components/DataTable'
import { Badge, Field, Modal, PageHeader } from '../components/ui'
import { ROLES } from '../lib/roles'

const EMPTY = { name: '', email: '', phone: '', password: '', role: 'employee', status: 'active' }

export default function Users() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState([])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [usersRes, rolesRes] = await Promise.all([UsersAPI.list(), RolesAPI.list()])
      const data = usersRes.data?.data || usersRes.data || []
      setRows(Array.isArray(data) ? data : [])
      setRoles(rolesRes.data?.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load users from the API.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const save = async (event) => {
    event.preventDefault(); setSaving(true)
    try {
      if (editingId) await UsersAPI.update(editingId, form)
      else await UsersAPI.create(form)
      setOpen(false); setForm(EMPTY); setEditingId(null); load()
    } catch (err) {
      alert(err?.response?.data?.message || `Could not ${editingId ? 'update' : 'create'} user.`)
    } finally { setSaving(false) }
  }

  const edit = (user) => {
    setEditingId(user._id)
    setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '', password: '', role: user.role || 'employee', status: user.status || 'active' })
    setOpen(true)
  }

  const roleLabel = (key) => roles.find((role) => role.key === key)?.name || ROLES[key] || key

  return <div>
    <PageHeader eyebrow="Administration" title="User access" description="Create staff accounts and assign only the work they need." />
    <DataTable
      columns={[
        { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name || '—'}</span> },
        { key: 'email', header: 'Email' },
        { key: 'role', header: 'Role', render: (r) => <Badge tone="accent">{roleLabel(r.role) || '—'}</Badge> },
        { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'positive' : 'negative'}>{r.status || '—'}</Badge> },
        { key: 'actions', header: '', render: (r) => <button onClick={() => edit(r)} className="text-accent-deep hover:underline">Edit</button> },
      ]}
      rows={rows} loading={loading} error={error} onCreate={() => { setEditingId(null); setForm(EMPTY); setOpen(true) }} createLabel="Create user"
      emptyTitle="No staff users yet" emptyDescription="Create an employee, entry employee, or accountant account."
    />
    <Modal open={open} onClose={() => setOpen(false)} title={editingId ? 'Edit staff user' : 'Create staff user'}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Full name"><input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input required type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={editingId ? 'New password (optional)' : 'Temporary password'}><input required={!editingId} minLength="8" type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role category"><select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
        </select></Field>
        <Field label="Account status"><select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        <p className="text-xs text-steel">Employee: drivers and vehicles. Entry employee: trip sheets. Accountant: cashbook.</p>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded border border-line text-steel">Cancel</button><button type="submit" disabled={saving} className="btn-accent px-4 py-2 text-sm rounded disabled:opacity-60">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create user'}</button></div>
      </form>
    </Modal>
  </div>
}
