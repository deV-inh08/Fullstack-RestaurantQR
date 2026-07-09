'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'

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

import { CreateAdminBody, CreateAdminBodyType } from '@/src/schema/account.schema'
import { useCreateAdminMutation } from '@/src/queries/useAccount'
import { handleErrorApi } from '@/src/lib/utils'

interface AddAdminProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function AddAdmin({ isOpen, onOpenChange }: AddAdminProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const createMutation = useCreateAdminMutation()

    const form = useForm<CreateAdminBodyType>({
        resolver: zodResolver(CreateAdminBody),
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

    const onSubmit = async (values: CreateAdminBodyType) => {
        if (createMutation.isPending) return
        try {
            const result = await createMutation.mutateAsync(values)
            toast.success(result.payload.message ?? 'Tạo tài khoản Admin thành công')
            reset()
            onOpenChange(false)
        } catch (error) {
            handleErrorApi({ error, setError: form.setError })
        }
    }

    const inputCls = 'mt-1 h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20'
    const labelCls = 'text-xs font-bold uppercase tracking-wider text-muted-foreground'

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-foreground">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Tạo Tài Khoản Admin
                    </DialogTitle>
                </DialogHeader>

                {/* Warning badge */}
                <div className="mx-6 mt-4 rounded-md border border-amber-500/20 bg-amber-500/8 px-4 py-2 text-xs text-amber-400">
                    Tài khoản Admin có quyền quản lý Staff và toàn bộ hệ thống.
                </div>

                <Form {...form}>
                    <form id="add-admin-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                        <div className="space-y-4 p-6">
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <label className={labelCls}>Họ tên</label>
                                        <input {...field} type="text" placeholder="Nguyễn Văn A" className={inputCls} />
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
                                        <label className={labelCls}>Email</label>
                                        <input {...field} type="email" placeholder="admin@vietgold.com" className={inputCls} />
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
                                        <label className={labelCls}>Mật khẩu</label>
                                        <div className="relative mt-1">
                                            <input
                                                {...field}
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                className="h-10 w-full rounded-md border border-input-border bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
                                        <label className={labelCls}>Xác nhận mật khẩu</label>
                                        <div className="relative mt-1">
                                            <input
                                                {...field}
                                                type={showConfirm ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                className="h-10 w-full rounded-md border border-input-border bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                            />
                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
                    <Button variant="outline" onClick={() => handleClose(false)}
                        className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                        Hủy
                    </Button>
                    <Button type="submit" form="add-admin-form" disabled={createMutation.isPending}
                        className="rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-md hover:shadow-gold">
                        {createMutation.isPending ? 'Đang tạo...' : 'Tạo Admin'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}