'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'
import { EmployeeProfile } from '@/types/employee'
import { UserRole } from '@/types/auth'

const STATUS_OPTIONS: EmployeeProfile['status'][] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']
const ROLE_OPTIONS: UserRole[] = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYS_ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE']

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await api.get(`/employee-profile/${params.id}`)
        setForm(res.data)
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load employee')
      } finally {
        setLoading(false)
      }
    }
    fetchEmployee()
  }, [params.id])

  const handleChange = (key: keyof EmployeeProfile, value: any) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const toggleRole = (role: UserRole) => {
    setForm((prev) => {
      if (!prev) return prev
      const roles = prev.roles || []
      return roles.includes(role)
        ? { ...prev, roles: roles.filter((r) => r !== role) }
        : { ...prev, roles: [...roles, role] }
    })
  }

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      await api.patch(`/employee-profiles/${form._id}`, {
        ...form,
        department: form.department?._id,
        position: form.position?._id,
      })
      toast.success('Employee updated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Employee Details" allowedRoles={['HR_ADMIN', 'SYS_ADMIN', 'HR_MANAGER']}>
      {loading || !form ? (
        <p className="text-muted-foreground">Loading employee...</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <div className="text-sm text-muted-foreground">ID: {form._id}</div>
            {form.status && <Badge variant="secondary">{form.status}</Badge>}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Personal information</CardTitle>
                <CardDescription>Update any field as HR admin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <InputRow label="First name" value={form.firstName || ''} onChange={(e) => handleChange('firstName', e.target.value)} />
                <InputRow label="Last name" value={form.lastName || ''} onChange={(e) => handleChange('lastName', e.target.value)} />
                <InputRow label="Email" value={form.email || ''} onChange={(e) => handleChange('email', e.target.value)} />
                <InputRow label="Phone" value={form.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} />
                <InputRow label="National ID" value={form.nationalId || ''} onChange={(e) => handleChange('nationalId', e.target.value)} />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Textarea value={form.address || ''} onChange={(e) => handleChange('address', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Employment</CardTitle>
                <CardDescription>Manage status, position, and department.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <InputRow
                  label="Employee Number"
                  value={form.employeeNumber || ''}
                  onChange={(e) => handleChange('employeeNumber', e.target.value)}
                />
                <InputRow label="Department ID" value={form.department?._id || ''} onChange={(e) => handleChange('department', { _id: e.target.value, name: form.department?.name || '' })} />
                <InputRow label="Position ID" value={form.position?._id || ''} onChange={(e) => handleChange('position', { _id: e.target.value, name: form.position?.name || '' })} />
                <InputRow label="Pay Grade" value={form.payGrade || ''} onChange={(e) => handleChange('payGrade', e.target.value)} />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={form.status} onChange={(e) => handleChange('status', e.target.value as EmployeeProfile['status'])}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">System Roles</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map((role) => (
                      <label key={role} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.roles?.includes(role)}
                          onChange={() => toggleRole(role)}
                          className="h-4 w-4 rounded border-border"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/admin/employees')}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function InputRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={onChange} />
    </div>
  )
}
