import { useCallback, useEffect, useState } from 'react'
import { RolesAPI } from '../lib/api'
import { Field, Modal, PageHeader } from '../components/ui'

const EMPTY = { key: '', name: '', permissions: [] }

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingKey, setEditingKey] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const response = await RolesAPI.list()
      setRoles(response.data?.data || [])
      setPermissions(response.data?.permissions || [])
    } catch (err) { setError(err?.response?.data?.message || 'Could not load roles.') }
  }, [])
  useEffect(() => { load() }, [load])

  const edit = (role) => {
    setEditingKey(role.key)
    setForm({ key: role.key, name: role.name, permissions: role.permissions || [] })
    setOpen(true)
  }
  const toggle = (permission) => setForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] }))
  const save = async (event) => {
    event.preventDefault(); setSaving(true)
    try {
      if (editingKey) await RolesAPI.update(editingKey, { name: form.name, permissions: form.permissions })
      else await RolesAPI.create(form)
      setOpen(false); setForm(EMPTY); setEditingKey(null); load()
    } catch (err) { alert(err?.response?.data?.message || 'Could not save role.') } finally { setSaving(false) }
  }

  return <div>
    <PageHeader eyebrow="Administration" title="Roles & access" description="Create role categories and choose exactly which modules each role can use." />
    {error && <div className="mb-4 rounded border border-negative/20 bg-negative-soft p-3 text-sm text-negative">{error}</div>}
    <section className="card overflow-hidden">
      <div className="flex items-center justify-end px-4 py-3 border-b border-line"><button onClick={() => { setEditingKey(null); setForm(EMPTY); setOpen(true) }} className="btn-accent rounded px-3 py-2 text-sm">Create role</button></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-line bg-paper-2/60"><th className="text-left px-4 py-2.5 text-xs uppercase text-steel">Role</th><th className="text-left px-4 py-2.5 text-xs uppercase text-steel">Access</th><th className="px-4 py-2.5" /></tr></thead><tbody>{roles.map((role) => <tr key={role.key} className="border-b border-line last:border-0"><td className="px-4 py-3 font-medium">{role.name}</td><td className="px-4 py-3 text-steel">{role.permissions?.includes('*') ? 'All modules' : (role.permissions || []).join(', ') || 'No access'}</td><td className="px-4 py-3 text-right">{role.key === 'admin' ? <span className="text-steel">Full access</span> : <button onClick={() => edit(role)} className="text-accent-deep hover:underline">Edit access</button>}</td></tr>)}</tbody></table></div>
    </section>
    <Modal open={open} onClose={() => setOpen(false)} title={editingKey ? 'Edit role access' : 'Create role'}><form onSubmit={save} className="space-y-4">
      <Field label="Role name"><input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      {!editingKey && <Field label="Role key"><input required pattern="[a-z][a-z0-9_]*" className="input-field" placeholder="dispatch_manager" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })} /><p className="mt-1 text-xs text-steel">Lowercase letters, numbers, and underscores only.</p></Field>}
      <fieldset><legend className="label-field">Module access</legend><div className="mt-2 grid grid-cols-2 gap-2">{permissions.map((permission) => <label key={permission} className="flex items-center gap-2 rounded border border-line px-3 py-2 text-sm capitalize"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => toggle(permission)} />{permission.replace('_', ' ')}</label>)}</div></fieldset>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded border border-line text-steel">Cancel</button><button type="submit" disabled={saving} className="btn-accent px-4 py-2 text-sm rounded disabled:opacity-60">{saving ? 'Saving…' : 'Save role'}</button></div>
    </form></Modal>
  </div>
}
