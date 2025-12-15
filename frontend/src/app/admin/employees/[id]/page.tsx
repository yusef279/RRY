'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Upload } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FileUpload } from '@/components/ui/file-upload'
import api from '@/lib/api'
import { EmployeeProfile } from '@/types/employee'
import { UserRole } from '@/types/auth'

const STATUS_OPTIONS: EmployeeProfile['status'][] = [
  'ACTIVE',
  'INACTIVE',
  'ON_LEAVE',
  'SUSPENDED',
  'RETIRED',
  'PROBATION',
  'TERMINATED',
]

const ROLE_OPTIONS: UserRole[] = [
  'department employee',
  'department head',
  'HR Manager',
  'HR Employee',
  'Payroll Specialist',
  'Payroll Manager',
  'System Admin',
  'Legal & Policy Admin',
  'Recruiter',
  'Finance Staff',
  'HR Admin',
]

type Department = {
  _id: string
  name: string
  code?: string
}

type Position = {
  _id: string
  name: string
  code?: string
  departmentId?: string
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [allPositions, setAllPositions] = useState<Position[]>([])
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([])

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

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const [deptsRes, positionsRes] = await Promise.all([
          api.get('/organization-structure/departments'),
          api.get('/organization-structure/positions'),
        ])
        setDepartments(deptsRes.data || [])
        setAllPositions(positionsRes.data || [])
      } catch (error) {
        console.error('Failed to load org structure data:', error)
      }
    }
    fetchOrgData()
  }, [])

  useEffect(() => {
    // Filter positions based on selected department
    const deptId = typeof form?.primaryDepartmentId === 'string'
      ? form.primaryDepartmentId
      : form?.primaryDepartmentId?._id

    if (deptId) {
      const filtered = allPositions.filter(p => p.departmentId === deptId)
      setFilteredPositions(filtered)
    } else {
      setFilteredPositions(allPositions)
    }
  }, [form?.primaryDepartmentId, allPositions])

  const handleChange = (key: keyof EmployeeProfile, value: any) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleAddressChange = (field: string, value: string) => {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        address: {
          ...(typeof prev.address === 'object' ? prev.address : {}),
          [field]: value,
        },
      }
    })
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
    if (!form || !form._id) return
    setSaving(true)
    try {
      // Extract department and position IDs
      const primaryDepartmentId = typeof form.primaryDepartmentId === 'string'
        ? form.primaryDepartmentId
        : form.primaryDepartmentId?._id

      const primaryPositionId = typeof form.primaryPositionId === 'string'
        ? form.primaryPositionId
        : form.primaryPositionId?._id

      // PATCH /employee-profile/admin/:id for profile data
      await api.patch(`/employee-profile/admin/${form._id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName,
        workEmail: form.workEmail,
        personalEmail: form.personalEmail,
        mobilePhone: form.mobilePhone,
        homePhone: form.homePhone,
        nationalId: form.nationalId,
        dateOfBirth: form.dateOfBirth,
        maritalStatus: form.maritalStatus,
        address: form.address,
        status: form.status,
        biography: form.biography,
        primaryDepartmentId: primaryDepartmentId || undefined,
        primaryPositionId: primaryPositionId || undefined,
      })

      // PATCH /employee-profile/admin/:id/system-roles for roles
      if (form.roles && form.roles.length > 0) {
        await api.patch(`/employee-profile/admin/${form._id}/system-roles`, {
          roles: form.roles,
        })
      }

      toast.success('Employee updated successfully')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to save')
    } finally {
      setSaving(false)
    }
  }

  const initials = form
    ? `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`.toUpperCase()
    : 'N/A'

  return (
    <AppShell
      title="Employee Details"
      allowedRoles={['HR Admin', 'System Admin', 'HR Manager', 'HR Employee']}
    >
      {loading || !form ? (
        <p className="text-muted-foreground">Loading employee...</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage
                  src={
                    form.profilePictureUrl
                      ? form.profilePictureUrl.startsWith('http')
                        ? form.profilePictureUrl
                        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${form.profilePictureUrl}`
                      : ''
                  }
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm cursor-pointer hover:bg-primary/90 transition-colors">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !form._id) return

                    const formData = new FormData()
                    formData.append('profilePicture', file)

                    const toastId = toast.loading('Uploading photo...')
                    try {
                      const res = await api.post(
                        `/employee-profile/admin/${form._id}/profile-picture`,
                        formData,
                        {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        }
                      )
                      setForm((prev) =>
                        prev
                          ? { ...prev, profilePictureUrl: res.data.profilePictureUrl }
                          : prev
                      )
                      toast.success('Photo uploaded', { id: toastId })
                    } catch (error: any) {
                      console.error(error)
                      toast.error('Upload failed', { id: toastId })
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold">
                  {form.firstName} {form.lastName}
                </h2>
                {form.status && <Badge variant="secondary">{form.status}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mb-2">ID: {form.employeeNumber || form._id}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
            </TabsList>

            {/* PERSONAL INFO TAB */}
            <TabsContent value="personal" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
                {/* Personal Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Details</CardTitle>
                    <CardDescription>
                      Basic employee information and contact details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <InputRow
                        label="First Name"
                        value={form.firstName || ''}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                      />
                      <InputRow
                        label="Middle Name"
                        value={form.middleName || ''}
                        onChange={(e) => handleChange('middleName', e.target.value)}
                      />
                      <InputRow
                        label="Last Name"
                        value={form.lastName || ''}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <InputRow
                        label="Work Email"
                        type="email"
                        value={form.workEmail || ''}
                        onChange={(e) => handleChange('workEmail', e.target.value)}
                      />
                      <InputRow
                        label="Personal Email"
                        type="email"
                        value={form.personalEmail || ''}
                        onChange={(e) => handleChange('personalEmail', e.target.value)}
                      />
                      <InputRow
                        label="Mobile Phone"
                        value={form.mobilePhone || ''}
                        onChange={(e) => handleChange('mobilePhone', e.target.value)}
                      />
                      <InputRow
                        label="Home Phone"
                        value={form.homePhone || ''}
                        onChange={(e) => handleChange('homePhone', e.target.value)}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <InputRow
                        label="Date of Birth"
                        type="date"
                        value={form.dateOfBirth?.split('T')[0] || ''}
                        onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      />
                      <InputRow
                        label="National ID"
                        value={form.nationalId || ''}
                        onChange={(e) => handleChange('nationalId', e.target.value)}
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Marital Status</label>
                        <select
                          value={form.maritalStatus || ''}
                          onChange={(e) => handleChange('maritalStatus', e.target.value)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="SINGLE">Single</option>
                          <option value="MARRIED">Married</option>
                          <option value="DIVORCED">Divorced</option>
                          <option value="WIDOWED">Widowed</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Address</h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <InputRow
                          label="Street Address"
                          value={
                            typeof form.address === 'object'
                              ? form.address?.streetAddress || ''
                              : ''
                          }
                          onChange={(e) =>
                            handleAddressChange('streetAddress', e.target.value)
                          }
                        />
                        <InputRow
                          label="City"
                          value={
                            typeof form.address === 'object'
                              ? form.address?.city || ''
                              : ''
                          }
                          onChange={(e) => handleAddressChange('city', e.target.value)}
                        />
                        <InputRow
                          label="Country"
                          value={
                            typeof form.address === 'object'
                              ? form.address?.country || ''
                              : ''
                          }
                          onChange={(e) => handleAddressChange('country', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Biography / Notes</label>
                      <Textarea
                        value={form.biography || ''}
                        onChange={(e) => handleChange('biography', e.target.value)}
                        rows={4}
                        placeholder="Additional notes or biography..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* EMPLOYMENT TAB */}
            <TabsContent value="employment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Employment Information</CardTitle>
                  <CardDescription>
                    Employment status, position, and system roles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputRow
                      label="Employee Number"
                      value={form.employeeNumber || ''}
                      onChange={(e) => handleChange('employeeNumber', e.target.value)}
                      disabled
                    />
                    <InputRow
                      label="Date of Hire"
                      type="date"
                      value={form.dateOfHire?.split('T')[0] || ''}
                      onChange={(e) => handleChange('dateOfHire', e.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Department</label>
                      <select
                        value={
                          typeof form.primaryDepartmentId === 'string'
                            ? form.primaryDepartmentId
                            : form.primaryDepartmentId?._id || ''
                        }
                        onChange={(e) => {
                          handleChange('primaryDepartmentId', e.target.value || undefined)
                          handleChange('primaryPositionId', undefined) // Reset position when department changes
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Select Department...</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name} {dept.code ? `(${dept.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Position</label>
                      <select
                        value={
                          typeof form.primaryPositionId === 'string'
                            ? form.primaryPositionId
                            : form.primaryPositionId?._id || ''
                        }
                        onChange={(e) => handleChange('primaryPositionId', e.target.value || undefined)}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        disabled={!form.primaryDepartmentId}
                      >
                        <option value="">Select Position...</option>
                        {filteredPositions.map((pos) => (
                          <option key={pos._id} value={pos._id}>
                            {pos.name} {pos.code ? `(${pos.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employment Status</label>
                    <select
                      value={form.status || ''}
                      onChange={(e) =>
                        handleChange('status', e.target.value as EmployeeProfile['status'])
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Roles</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 border rounded-md">
                      {ROLE_OPTIONS.map((role) => (
                        <label key={role} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.roles?.includes(role) ?? false}
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
            </TabsContent>
          </Tabs>

          {/* Save Actions */}
          <div className="flex items-center gap-3 sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
            <Button onClick={save} disabled={saving} size="lg">
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/employees')} size="lg">
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
  disabled,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  )
}
