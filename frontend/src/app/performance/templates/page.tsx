'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import {
  AppraisalTemplateType,
  AppraisalRatingScaleType,
} from '@/types/performance';
import type { Department, Position } from '@/types/org-structure'; // ← shared file that has description
/* ----------  TYPES + CONSTANTS  ---------- */
type Criterion = {
  key: string;
  title: string;
  details?: string;
  weight?: number;
  maxScore?: number;
  required?: boolean;
};
type Template = {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  templateType?: AppraisalTemplateType;
  ratingScale?: {
    type: AppraisalRatingScaleType;
    min: number;
    max: number;
  };
  instructions?: string;
  criteria?: Criterion[];
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
};

const TEMPLATE_TYPES = Object.values(AppraisalTemplateType);
const SCALE_TYPES = Object.values(AppraisalRatingScaleType);
const SCALE_MAP: Record<AppraisalRatingScaleType, { min: number; max: number }> = {
  THREE_POINT: { min: 1, max: 3 },
  FIVE_POINT: { min: 1, max: 5 },
  TEN_POINT: { min: 1, max: 10 },
};

/* ----------  COMPONENT  ---------- */
export default function TemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [depts, setDepts] = useState<Department[]>([]);
  const [pos, setPos] = useState<Position[]>([]);

  /* form state */
  const [form, setForm] = useState({
    name: '',
    description: '',
    templateType: AppraisalTemplateType.ANNUAL,
    ratingType: AppraisalRatingScaleType.FIVE_POINT,
    instructions: '',
    deptIds: [] as string[],
    posIds: [] as string[],
    criteria: [] as Criterion[],
  });
  const [editId, setEditId] = useState<string | null>(null);

  /* ----------  DATA  ---------- */
  const load = () =>
    Promise.all([
      api.get('/performance/templates'),
      api.get('/organization-structure/departments'),
      api.get('/organization-structure/positions'),
    ])
      .then(([t, d, p]) => {
        setRows(Array.isArray(t.data) ? t.data : []);
        setDepts(Array.isArray(d.data) ? d.data : []);
        setPos(Array.isArray(p.data) ? p.data : []);
      })
      .catch(() => toast.error('Load failed'));

  useEffect(() => {
    load();
  }, []);

  /* ----------  ACTIONS  ---------- */
  const save = async () => {
    const payload = {
      name: form.name,
      description: form.description,
      templateType: form.templateType,
      ratingScale: { type: form.ratingType, ...SCALE_MAP[form.ratingType] },
      instructions: form.instructions,
      applicableDepartmentIds: form.deptIds,
      applicablePositionIds: form.posIds,
      criteria: form.criteria,
    };
    try {
      if (editId) await api.patch(`/performance/templates/${editId}`, payload);
      else await api.post('/performance/templates', payload);
      toast.success('Saved');
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Save failed');
    }
  };

  const deactivate = async (id: string) => {
    await api.patch(`/performance/templates/${id}/deactivate`);
    toast.success('Deactivated');
    load();
  };

  /* ----------  CRITERIA HANDLERS  ---------- */
  const addCriterion = () =>
    setForm({
      ...form,
      criteria: [
        ...form.criteria,
        {
          key: Date.now().toString(),
          title: '',
          details: '',
          weight: 0,
          maxScore: SCALE_MAP[form.ratingType].max,
          required: true,
        },
      ],
    });

  const updateCriterion = (idx: number, field: keyof Criterion, val: any) => {
    const copy = [...form.criteria];
    copy[idx] = { ...copy[idx], [field]: val };
    setForm({ ...form, criteria: copy });
  };

  const removeCriterion = (idx: number) => {
    const copy = [...form.criteria];
    copy.splice(idx, 1);
    setForm({ ...form, criteria: copy });
  };

  /* ----------  MULTI-SELECT HELPERS  ---------- */
  const toggleDept = (id: string) =>
    setForm({
      ...form,
      deptIds: form.deptIds.includes(id)
        ? form.deptIds.filter((d) => d !== id)
        : [...form.deptIds, id],
    });

  const togglePos = (id: string) =>
    setForm({
      ...form,
      posIds: form.posIds.includes(id)
        ? form.posIds.filter((p) => p !== id)
        : [...form.posIds, id],
    });

  /* ----------  RENDER  ---------- */
  return (
    <AppShell title="Appraisal templates" allowedRoles={['HR Admin','HR Manager', 'System Admin']}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Templates</CardTitle>
          <Button
            onClick={() => {
              setEditId(null);
              setForm({
                name: '',
                description: '',
                templateType: AppraisalTemplateType.ANNUAL,
                ratingType: AppraisalRatingScaleType.FIVE_POINT,
                instructions: '',
                deptIds: [],
                posIds: [],
                criteria: [],
              });
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scale</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.templateType?.replace('_', ' ') ?? '—'}</TableCell>
                      <TableCell>
                        {t.ratingScale
                          ? `${t.ratingScale.min}-${t.ratingScale.max} (${t.ratingScale.type.replace('_', ' ')})`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            t.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {t.isActive ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditId(t._id);
                            setForm({
                              name: t.name,
                              description: t.description || '',
                              templateType: t.templateType || AppraisalTemplateType.ANNUAL,
                              ratingType: t.ratingScale?.type || AppraisalRatingScaleType.FIVE_POINT,
                              instructions: t.instructions || '',
                              deptIds: t.applicableDepartmentIds || [],
                              posIds: t.applicablePositionIds || [],
                              criteria: t.criteria || [],
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deactivate(t._id)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ===============  DIALOG WITH SCROLL  =============== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'New'} template</DialogTitle>
          </DialogHeader>

          {/* *******  SCROLLABLE INNER BODY  ******* */}
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-4">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <Label>Template type *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.templateType}
                onChange={(e) => setForm({ ...form, templateType: e.target.value as AppraisalTemplateType })}
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>

              <Label>Rating scale *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.ratingType}
                onChange={(e) =>
                  setForm({ ...form, ratingType: e.target.value as AppraisalRatingScaleType })
                }
              >
                {SCALE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>

              <Label>Instructions</Label>
              <Textarea
                rows={3}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Guidelines for managers / employees"
              />

              <Label>Applicable departments</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {depts.map((d) => (
                  <label key={d._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.deptIds.includes(d._id??"")}
                      onChange={() => toggleDept(d._id??"")}
                      className="h-4 w-4 rounded"
                    />
                    {d.name}
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Label>Evaluation criteria</Label>
                <Button size="sm" onClick={addCriterion}>
                  <Plus className="w-4 h-4 mr-1" /> Add question
                </Button>
              </div>

              {form.criteria.map((c, idx) => (
                <Card key={c.key} className="p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Question *</Label>
                      <Input
                        value={c.title}
                        onChange={(e) => updateCriterion(idx, 'title', e.target.value)}
                        placeholder="e.g. Communication Skills"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Details</Label>
                      <Textarea
                        rows={2}
                        value={c.details}
                        onChange={(e) => updateCriterion(idx, 'details', e.target.value)}
                        placeholder="Description or examples"
                      />
                    </div>
                    <div>
                      <Label>Weight %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={c.weight}
                        onChange={(e) => updateCriterion(idx, 'weight', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Max score</Label>
                      <Input
                        type="number"
                        min={1}
                        max={SCALE_MAP[form.ratingType].max}
                        value={c.maxScore}
                        onChange={(e) => updateCriterion(idx, 'maxScore', Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={c.required}
                        onChange={(e) => updateCriterion(idx, 'required', e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      <Label className="!mb-0">Required</Label>
                    </div>
                    <div className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeCriterion(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {form.criteria.length === 0 && (
                <p className="text-sm text-muted-foreground">No criteria added yet.</p>
              )}
            </div>
          </ScrollArea>

          {/* *******  SAVE BUTTON ALWAYS VISIBLE  ******* */}
          <DialogFooter>
            <Button onClick={save}>Save template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}