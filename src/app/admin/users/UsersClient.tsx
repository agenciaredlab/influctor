'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Search, Key, UserX, UserCheck, Trash2, Crown, Eye, X, AlertCircle, CheckCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface UserRow {
  id: string
  name: string
  email: string
  plan: string
  planStatus: string
  isAdmin: boolean
  active: boolean
  createdAt: string
  aiUsageThisMonth: number
}

export default function UsersClient({ currentAdminId }: { currentAdminId: string }) {
  const { update } = useSession()
  const router = useRouter()

  const [users, setUsers]     = useState<UserRow[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [query, setQuery]     = useState('')
  const [planFilter, setPlanFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [notice, setNotice]   = useState<string | null>(null)

  // Modal state
  const [deleteTarget, setDeleteTarget]     = useState<UserRow | null>(null)
  const [deleteConfirm, setDeleteConfirm]   = useState('')
  const [transferTarget, setTransferTarget] = useState<UserRow | null>(null)
  const [transferConfirm, setTransferConfirm] = useState('')
  const [resetResult, setResetResult]       = useState<{ user: UserRow; password: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (query)        params.set('query', query)
      if (planFilter)   params.set('plan', planFilter)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setUsers(json.data)
      setTotal(json.total)
      setPages(json.pages)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, query, planFilter, statusFilter])

  useEffect(() => { load() }, [load])

  function flash(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3000)
  }

  async function changePlan(u: UserRow, plan: string) {
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setUsers(list => list.map(x => x.id === u.id ? { ...x, plan } : x))
      flash(`Plan de ${u.name} actualizado a ${plan}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(u: UserRow) {
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !u.active }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setUsers(list => list.map(x => x.id === u.id ? { ...x, active: !u.active } : x))
      flash(u.active ? `${u.name} desactivado` : `${u.name} reactivado`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function resetPassword(u: UserRow) {
    setBusyId(u.id)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setResetResult({ user: u, password: json.password })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      flash(`${deleteTarget.name} eliminado`)
      setDeleteTarget(null)
      setDeleteConfirm('')
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function confirmTransfer() {
    if (!transferTarget) return
    setBusyId(transferTarget.id)
    try {
      const res = await fetch(`/api/admin/users/${transferTarget.id}/transfer-admin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: transferConfirm }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      await update({}) // force this browser's JWT to re-check isAdmin
      setTransferTarget(null)
      setTransferConfirm('')
      flash(`Rol de admin transferido a ${transferTarget.name}. Redirigiendo...`)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function impersonate(u: UserRow) {
    setBusyId(u.id)
    try {
      await update({ impersonateUserId: u.id })
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message)
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" /> {notice}
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={e => { setPage(1); setQuery(e.target.value) }}
              placeholder="Buscar por nombre o email..."
              className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={planFilter}
            onChange={e => { setPage(1); setPlanFilter(e.target.value) }}
            className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">Todos los planes</option>
            <option value="free">Free</option>
            <option value="creator">Creator</option>
            <option value="pro">Pro</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => { setPage(1); setStatusFilter(e.target.value) }}
            className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Desactivados</option>
          </select>
          <span className="text-xs text-gray-500">{total} usuarios</span>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-[#1e1e35]">
                <th className="pb-3 font-medium">Usuario</th>
                <th className="pb-3 font-medium">Plan</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Alta</th>
                <th className="pb-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-600">Cargando...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-600">Sin resultados</td></tr>
              )}
              {!loading && users.map(u => (
                <tr key={u.id} className="border-b border-[#1e1e35] last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-white font-medium flex items-center gap-1.5">
                          {u.name}
                          {u.isAdmin && (
                            <Badge variant="danger" size="sm" dot>
                              <Crown size={10} /> Admin
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <select
                      value={u.plan}
                      disabled={busyId === u.id}
                      onChange={e => changePlan(u, e.target.value)}
                      className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="free">Free</option>
                      <option value="creator">Creator</option>
                      <option value="pro">Pro</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <Badge variant={u.active ? 'success' : 'default'} dot>
                      {u.active ? 'Activo' : 'Desactivado'}
                    </Badge>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        title="Impersonar"
                        disabled={busyId === u.id || u.id === currentAdminId}
                        onClick={() => impersonate(u)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        title="Resetear contraseña"
                        disabled={busyId === u.id}
                        onClick={() => resetPassword(u)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-white/5 disabled:opacity-30"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        title={u.active ? 'Desactivar' : 'Reactivar'}
                        disabled={busyId === u.id || u.id === currentAdminId}
                        onClick={() => toggleActive(u)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {u.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      {!u.isAdmin && (
                        <button
                          title="Transferir rol de Admin"
                          disabled={busyId === u.id}
                          onClick={() => setTransferTarget(u)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-white/5 disabled:opacity-30"
                        >
                          <Crown size={14} />
                        </button>
                      )}
                      <button
                        title="Eliminar"
                        disabled={busyId === u.id || u.id === currentAdminId}
                        onClick={() => setDeleteTarget(u)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1e1e35]">
            <span className="text-xs text-gray-500">Página {page} de {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteConfirm('') }} title="Eliminar usuario" description="Esta acción no se puede deshacer.">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Se eliminará <strong className="text-white">{deleteTarget.name}</strong> ({deleteTarget.email}) y todos sus datos (posts, deals, ingresos, cuentas conectadas). Escribe su email para confirmar.
            </p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={deleteTarget.email}
              className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteConfirm('') }}>Cancelar</Button>
              <Button
                variant="danger"
                disabled={deleteConfirm.toLowerCase().trim() !== deleteTarget.email.toLowerCase() || busyId === deleteTarget.id}
                onClick={confirmDelete}
                icon={<Trash2 size={14} />}
              >
                Eliminar definitivamente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transfer admin confirmation */}
      <Modal open={!!transferTarget} onClose={() => { setTransferTarget(null); setTransferConfirm('') }} title="Transferir rol de Admin" description="Solo puede existir un admin a la vez.">
        {transferTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Vas a transferir el rol de Admin a <strong className="text-white">{transferTarget.name}</strong> ({transferTarget.email}). Perderás tu propio acceso de admin de inmediato. Escribe su email para confirmar.
            </p>
            <input
              value={transferConfirm}
              onChange={e => setTransferConfirm(e.target.value)}
              placeholder={transferTarget.email}
              className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setTransferTarget(null); setTransferConfirm('') }}>Cancelar</Button>
              <Button
                variant="danger"
                disabled={transferConfirm.toLowerCase().trim() !== transferTarget.email.toLowerCase() || busyId === transferTarget.id}
                onClick={confirmTransfer}
                icon={<Crown size={14} />}
              >
                Transferir rol
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset password result */}
      <Modal open={!!resetResult} onClose={() => setResetResult(null)} title="Contraseña restablecida" description="Cópiala ahora — no se vuelve a mostrar.">
        {resetResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Nueva contraseña para <strong className="text-white">{resetResult.user.name}</strong>:
            </p>
            <div className="flex items-center gap-2 bg-[#0a0a14] rounded-lg px-3 py-2.5 border border-[#1a1a2e]">
              <code className="text-sm text-emerald-400 flex-1 select-all">{resetResult.password}</code>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setResetResult(null)} icon={<X size={14} />}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}