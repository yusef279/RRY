"use client";

import React from "react";
import { ChevronDown, ChevronRight, Building2, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Department {
  _id?: string;
  name: string;
  code?: string;
  parentDepartmentId?: string;
  positions?: Position[];
}

interface Position {
  _id?: string;
  name: string;
  code?: string;
  departmentId?: string;
  supervisorPositionId?: string | null;
}

interface OrgTreeProps {
  departments: Department[];
  positions: Position[];
  onDepartmentClick?: (dept: Department) => void;
  onPositionClick?: (pos: Position) => void;
}

export function OrgTree({
  departments,
  positions,
  onDepartmentClick,
  onPositionClick,
}: OrgTreeProps) {
  const [expandedDepts, setExpandedDepts] = React.useState<Set<string>>(
    new Set()
  );

  // Build hierarchy
  const rootDepartments = departments.filter((d) => !d.parentDepartmentId);

  const getChildDepartments = (parentId: string | undefined) => {
    if (!parentId) return [];
    return departments.filter((d) => d.parentDepartmentId === parentId);
  };

  const getDepartmentPositions = (deptId: string | undefined) => {
    if (!deptId) return [];
    return positions.filter((p) => p.departmentId === deptId);
  };

  const toggleExpand = (deptId: string | undefined) => {
    if (!deptId) return;
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepts(newExpanded);
  };

  const DepartmentNode = ({
    department,
    level = 0,
  }: {
    department: Department;
    level?: number;
  }) => {
    const isExpanded = department._id ? expandedDepts.has(department._id) : false;
    const childDepts = getChildDepartments(department._id);
    const deptPositions = getDepartmentPositions(department._id);
    const hasChildren = childDepts.length > 0 || deptPositions.length > 0;

    return (
      <div className="space-y-2">
        <Card
          className={cn(
            "p-3 hover:bg-accent cursor-pointer transition-colors",
            level > 0 && "ml-8"
          )}
          onClick={() => onDepartmentClick?.(department)}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(department._id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}
            <Building2 className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium">{department.name}</p>
              {department.code && (
                <p className="text-xs text-muted-foreground">
                  Code: {department.code}
                </p>
              )}
            </div>
          </div>
        </Card>

        {isExpanded && hasChildren && (
          <div className="space-y-2">
            {/* Positions under this department */}
            {deptPositions.map((position) => (
              <Card
                key={position._id}
                className={cn(
                  "p-2 hover:bg-accent cursor-pointer transition-colors bg-muted/50",
                  level > 0 ? "ml-16" : "ml-8"
                )}
                onClick={() => onPositionClick?.(position)}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{position.name}</p>
                    {position.code && (
                      <p className="text-xs text-muted-foreground">
                        Code: {position.code}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {/* Child departments */}
            {childDepts.map((childDept) => (
              <DepartmentNode
                key={childDept._id}
                department={childDept}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {rootDepartments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No departments found. Create your first department to get started.
        </p>
      ) : (
        rootDepartments.map((dept) => (
          <DepartmentNode key={dept._id} department={dept} />
        ))
      )}
    </div>
  );
}
