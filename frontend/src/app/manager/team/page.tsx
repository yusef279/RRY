'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users2, Clock3 } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import type { EmployeeProfile } from '@/types/employee'

export default function TeamPage() {
  const router = useRouter()
  const [team, setTeam] = useState<EmployeeProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const fetchTeam = async () => {
      const user = getCurrentUser()

      // Must have employeeId to load your profile
      if (!user || !user.employeeId) {
        router.push('/login')
        return
      }

      try {
        // 1) Load MY profile to get my primaryPositionId (source of truth)
        const meRes = await api.get(`/employee-profile/${user.employeeId}`)
        const me: EmployeeProfile = meRes.data

        const myPositionId =
          typeof me.primaryPositionId === 'object'
            ? (me.primaryPositionId as any)?._id
            : me.primaryPositionId

        if (!myPositionId) {
          toast.error('No position assigned to your account. Cannot load team members.')
          setTeam([])
          return
        }

        // 2) Load direct reports using supervisorPositionId
        const res = await api.get('/employee-profile/manager/team', {
          params: { supervisorPositionId: myPositionId },
        })

        setTeam(res.data || [])
      } catch (error: any) {
        const status = error?.response?.status

        if (status === 401) {
          router.push('/login')
          return
        }

        if (status === 403) {
          toast.error('Forbidden: your account does not have manager permissions to view team members.')
          setTeam([])
          return
        }

        toast.error(error?.response?.data?.message || 'Failed to load team')
      } finally {
        setLoading(false)
      }
    }

    fetchTeam()
  }, [router])

  const filtered = useMemo(() => {
    return team.filter((member) => {
      const name = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase()
      return name.includes(query.toLowerCase())
    })
  }, [query, team])

  return (
    <AppShell title="My Team">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Total reports</p>
              <p className="text-xl font-semibold">{team.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Active</p>
              <p className="text-xl font-semibold">
                {team.filter((t) => t.status === 'ACTIVE').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">On leave / suspended</p>
              <p className="text-xl font-semibold">
                {team.filter((t) => t.status === 'ON_LEAVE' || t.status === 'SUSPENDED').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Direct reports</CardTitle>
            <CardDescription>Summary view without sensitive information.</CardDescription>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              placeholder="Search by name..."
              className="w-full sm:w-64"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="outline" onClick={() => setQuery('')}>
              Clear
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading team...</p>
          ) : team.length === 0 ? (
            <p className="text-sm text-muted-foreground">No direct reports found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date of Hire</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((member) => {
                  const name =
                    [member.firstName, member.lastName].filter(Boolean).join(' ').trim() ||
                    member.fullName ||
                    'Employee'

                  const initials = name
                    .split(' ')
                    .filter((part) => part.length > 0)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  const departmentName =
                    typeof member.primaryDepartmentId === 'object'
                      ? (member.primaryDepartmentId as any)?.name ?? '-'
                      : member.department?.name || '-'

                  // ✅ Position is title, not name
                  const positionName =
                    typeof member.primaryPositionId === 'object'
                      ? ((member.primaryPositionId as any)?.title ??
                        (member.primaryPositionId as any)?.code ??
                        '-')
                      : '-'

                  return (
                    <TableRow key={member._id || member.employeeNumber}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{name}</span>
                            <span className="text-xs text-muted-foreground">
                              {member.employeeNumber || '-'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{positionName}</TableCell>
                      <TableCell>{departmentName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.dateOfHire ? new Date(member.dateOfHire).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {member.status ? <Badge variant="secondary">{member.status}</Badge> : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}
