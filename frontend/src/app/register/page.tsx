'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import axios from 'axios'
import { toast } from 'sonner'
import AuthCard from '@/components/auth/authCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SystemRole } from '@/enum' //

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  employeeNumber: z.string().min(1),
  nationalId: z.string().min(10),
  dateOfHire: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  role: z.nativeEnum(SystemRole),
})
type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    setLoading(true)
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, data, {
        withCredentials: true,
      })
      toast.success('Account created – please log in')
      router.push('/login')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Create account" desc="Fill in your details below">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input {...register('firstName')} />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
          </div>
          <div>
            <Label>Last name</Label>
            <Input {...register('lastName')} />
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <Label>Email</Label>
          <Input type="email" {...register('email')} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div>
          <Label>Password</Label>
          <Input type="password" {...register('password')} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <div>
          <Label>Employee number</Label>
          <Input {...register('employeeNumber')} />
          {errors.employeeNumber && <p className="text-sm text-destructive">{errors.employeeNumber.message}</p>}
        </div>

        <div>
          <Label>National ID</Label>
          <Input {...register('nationalId')} />
          {errors.nationalId && <p className="text-sm text-destructive">{errors.nationalId.message}</p>}
        </div>

        <div>
          <Label>Date of hire</Label>
          <Input type="date" {...register('dateOfHire')} />
          {errors.dateOfHire && <p className="text-sm text-destructive">{errors.dateOfHire.message}</p>}
        </div>

        <div>
          <Label>Initial role</Label>
          <select {...register('role')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {Object.values(SystemRole).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
        </div>

        <Button
  type="submit"
  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-indigo-500/40 transition-all"
  disabled={loading}
>
  {loading ? 'Creating..' : 'Create'}
</Button>
      </form>
    </AuthCard>
  )
}