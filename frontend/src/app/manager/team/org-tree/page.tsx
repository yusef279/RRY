'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GitBranch, Building2, Briefcase, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import api from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface Position {
    _id: string
    title?: string
    name?: string
    code?: string
    departmentId?: string
    reportsToPositionId?: string | null
    children?: Position[]
}

interface Department {
    _id: string
    name: string
    code?: string
}

interface OrgTreeNode {
    department: Department
    rootPositions: Position[]
}

export default function ManagerOrgTreePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [orgTree, setOrgTree] = useState<OrgTreeNode[]>([])
    const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set())
    const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null)

    useEffect(() => {
        const fetchOrgTree = async () => {
            const user = getCurrentUser()

            if (!user || !user.employeeId) {
                router.push('/login')
                return
            }

            try {
                // First, get the current user's profile to determine their department
                const profileRes = await api.get(`/employee-profile/${user.employeeId}`)
                const profile = profileRes.data

                const deptId = typeof profile.primaryDepartmentId === 'object'
                    ? profile.primaryDepartmentId?._id
                    : profile.primaryDepartmentId

                setUserDepartmentId(deptId || null)

                // Fetch the full org tree
                const treeRes = await api.get('/organization-structure/tree')
                const fullTree: OrgTreeNode[] = treeRes.data || []

                // Filter to only show the user's department (for managers)
                // HR and System Admin can see all departments
                const userRoles = [user.role, ...(user.roles || [])].filter(Boolean)
                const isHrOrAdmin = userRoles.some((r) =>
                    ['HR Manager', 'HR Admin', 'System Admin', 'HR Employee'].includes(r as string)
                )

                if (isHrOrAdmin) {
                    setOrgTree(fullTree)
                } else if (deptId) {
                    // Filter to manager's department only
                    const filteredTree = fullTree.filter(
                        (node) => node.department._id === deptId
                    )
                    setOrgTree(filteredTree)
                } else {
                    setOrgTree([])
                }
            } catch (error: any) {
                const status = error?.response?.status

                if (status === 401) {
                    router.push('/login')
                    return
                }

                if (status === 403) {
                    toast.error('You do not have permission to view the organization structure.')
                    setOrgTree([])
                    return
                }

                toast.error(error?.response?.data?.message || 'Failed to load organization structure')
            } finally {
                setLoading(false)
            }
        }

        fetchOrgTree()
    }, [router])

    const togglePosition = (positionId: string) => {
        const newExpanded = new Set(expandedPositions)
        if (newExpanded.has(positionId)) {
            newExpanded.delete(positionId)
        } else {
            newExpanded.add(positionId)
        }
        setExpandedPositions(newExpanded)
    }

    const expandAll = () => {
        const allPositionIds = new Set<string>()
        const collectIds = (positions: Position[]) => {
            positions.forEach((pos) => {
                if (pos.children && pos.children.length > 0) {
                    allPositionIds.add(pos._id)
                    collectIds(pos.children)
                }
            })
        }
        orgTree.forEach((node) => collectIds(node.rootPositions))
        setExpandedPositions(allPositionIds)
    }

    const collapseAll = () => {
        setExpandedPositions(new Set())
    }

    const PositionNode = ({
        position,
        level = 0,
    }: {
        position: Position
        level?: number
    }) => {
        const isExpanded = expandedPositions.has(position._id)
        const hasChildren = position.children && position.children.length > 0
        const positionName = position.title || position.name || position.code || 'Unnamed Position'

        return (
            <div className="space-y-1">
                <div
                    className={cn(
                        'flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-accent',
                        level === 0 && 'border-primary/30 bg-primary/5'
                    )}
                    style={{ marginLeft: `${level * 24}px` }}
                >
                    {hasChildren ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => togglePosition(position._id)}
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </Button>
                    ) : (
                        <div className="w-6" />
                    )}
                    <Briefcase className={cn(
                        'h-4 w-4 shrink-0',
                        level === 0 ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            'font-medium truncate',
                            level === 0 && 'text-primary'
                        )}>
                            {positionName}
                        </p>
                        {position.code && (
                            <p className="text-xs text-muted-foreground">
                                Code: {position.code}
                            </p>
                        )}
                    </div>
                    {level === 0 && (
                        <Badge variant="outline" className="shrink-0">
                            Head
                        </Badge>
                    )}
                    {hasChildren && (
                        <Badge variant="secondary" className="shrink-0">
                            {position.children?.length} reports
                        </Badge>
                    )}
                </div>

                {isExpanded && hasChildren && (
                    <div className="space-y-1">
                        {position.children?.map((child) => (
                            <PositionNode
                                key={child._id}
                                position={child}
                                level={level + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const totalPositions = orgTree.reduce((sum, node) => {
        const countPositions = (positions: Position[]): number =>
            positions.reduce(
                (acc, pos) => acc + 1 + (pos.children ? countPositions(pos.children) : 0),
                0
            )
        return sum + countPositions(node.rootPositions)
    }, 0)

    return (
        <AppShell
            title="Organization Tree"
            subtitle="View your department's organizational structure"
            allowedRoles={['department head', 'HR Manager', 'System Admin', 'HR Admin', 'HR Employee']}
        >
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card className="shadow-sm">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Departments</p>
                            <p className="text-xl font-semibold">{orgTree.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Positions</p>
                            <p className="text-xl font-semibold">{totalPositions}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                            <GitBranch className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase text-muted-foreground">Hierarchy Levels</p>
                            <p className="text-xl font-semibold">
                                {orgTree.length > 0 ? 'Active' : 'None'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Org Tree Card */}
            <Card className="shadow-sm">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <GitBranch className="h-5 w-5" />
                            Department Hierarchy
                        </CardTitle>
                        <CardDescription>
                            Read-only view of the organizational reporting structure
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={expandAll}>
                            Expand All
                        </Button>
                        <Button variant="outline" size="sm" onClick={collapseAll}>
                            Collapse All
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-muted-foreground">Loading organization structure...</p>
                        </div>
                    ) : orgTree.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                No organization structure found for your department.
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Contact your HR administrator to set up the organization structure.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px] pr-4">
                            <div className="space-y-6">
                                {orgTree.map((node) => (
                                    <div key={node.department._id} className="space-y-3">
                                        {/* Department Header */}
                                        <div className="flex items-center gap-2 border-b pb-2">
                                            <Building2 className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <h3 className="font-semibold">{node.department.name}</h3>
                                                {node.department.code && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Code: {node.department.code}
                                                    </p>
                                                )}
                                            </div>
                                            {userDepartmentId === node.department._id && (
                                                <Badge className="ml-auto">Your Department</Badge>
                                            )}
                                        </div>

                                        {/* Positions Tree */}
                                        {node.rootPositions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground pl-7">
                                                No positions defined for this department.
                                            </p>
                                        ) : (
                                            <div className="space-y-1 pl-2">
                                                {node.rootPositions.map((position) => (
                                                    <PositionNode key={position._id} position={position} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    )
}
