'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/src/components/ui/dialog'
import {
    Form,
    FormField,
    FormItem,
    FormMessage
} from '@/src/components/ui/form'
import { Button } from '@/src/components/ui/button'

import { CreateStaffBody, CreateStaffBodyType } from '@/src/schema/account.schema'
import { useCreateStaffMutation } from '@/src/queries/useAccount'
import { handleErrorApi } from '@/src/lib/utils'

interface AddStaffProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function AddStaff({ isOpen, onOpenChange }: AddStaffProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const createMutation = useCreateStaffMutation()

    const form = useForm<CreateStaffBodyType>({
        resolver: zodResolver(CreateStaffBody),
        defaultValues: { name: '', email: '', password: '', confirmPassword: '' }
    })

    const reset = () => {
        form.reset()
        setShowPassword(false)
        setShowConfirm(false)
    }

    const handleClose = (open: boolean) => {
        if (!open) reset()
        onOpenChange(open)
    }

    const onSubmit = async (values: CreateStaffBodyType) => {
        if (createMutation.isPending) return
        try {
            const result = await createMutation.mutateAsync(values)
            toast.success(result.payload.message ?? 'Tạo tài khoản thành công')
            reset()
            onOpenChange(false)
        } catch (error) {
            handleErrorApi({ error, setError: form.setError })
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                        Tạo Tài Khoản Staff
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form id="add-staff-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                        <div className="space-y-4 p-6">
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Họ tên
                                        </label>
                                        <input
                                            {...field}
                                            type="text"
                                            placeholder="Nguyễn Văn A"
                                            className="mt-1 h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Email
                                        </label>
                                        <input
                                            {...field}
                                            type="email"
                                            placeholder="staff@vietgold.com"
                                            className="mt-1 h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Password */}
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Mật khẩu
                                        </label>
                                        <div className="relative mt-1">
                                            <input
                                                {...field}
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                className="h-10 w-full rounded-md border border-input-border bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Confirm Password */}
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Xác nhận mật khẩu
                                        </label>
                                        <div className="relative mt-1">
                                            <input
                                                {...field}
                                                type={showConfirm ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                className="h-10 w-full rounded-md border border-input-border bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </form>
                </Form>

                <DialogFooter className="border-t border-border-subtle p-6">
                    <Button
                        variant="outline"
                        onClick={() => handleClose(false)}
                        className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        form="add-staff-form"
                        disabled={createMutation.isPending}
                        className="rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-md hover:shadow-gold"
                    >
                        {createMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}