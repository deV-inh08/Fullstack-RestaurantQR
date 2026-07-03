'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

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

import { UpdateEmployeeBody, UpdateEmployeeBodyType } from '@/src/schema/account.schema'
import { useGetAccount, useUpdateEmployeeMutation } from '@/src/queries/useAccount'
import { handleErrorApi } from '@/src/lib/utils'

interface EditEmployeeProps {
    id: number | undefined
    setId: (id: number | undefined) => void
}

export default function EditEmployee({ id, setId }: EditEmployeeProps) {
    const { data } = useGetAccount({ id: id as number, enabled: Boolean(id) })
    const updateMutation = useUpdateEmployeeMutation()

    const form = useForm<UpdateEmployeeBodyType>({
        resolver: zodResolver(UpdateEmployeeBody),
        defaultValues: { name: '', email: '', avatar: null }
    })

    // Populate form when data is fetched
    useEffect(() => {
        if (!data) return
        const { name, email, avatar } = data.payload.data
        form.reset({ name, email, avatar: avatar ?? null })
    }, [data, form])

    const reset = () => {
        setId(undefined)
        form.reset()
    }

    const onSubmit = async (values: UpdateEmployeeBodyType) => {
        if (!id || updateMutation.isPending) return
        try {
            const result = await updateMutation.mutateAsync({ id, ...values })
            toast.success(result.payload.message ?? 'Cập nhật thành công')
            reset()
        } catch (error) {
            handleErrorApi({ error, setError: form.setError })
        }
    }

    return (
        <Dialog
            open={Boolean(id)}
            onOpenChange={(open) => { if (!open) reset() }}
        >
            <DialogContent className="max-w-lg rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                        Chỉnh sửa tài khoản
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form id="edit-employee-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
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
                                            className="mt-1 h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email — read-only per Identity.API design (change = new identity) */}
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
                                            className="mt-1 h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Avatar URL */}
                            <FormField
                                control={form.control}
                                name="avatar"
                                render={({ field }) => (
                                    <FormItem>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            URL Avatar (tuỳ chọn)
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://..."
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value || null)}
                                            className="mt-1 h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Role info (read-only display — changing role goes through createAdmin/createStaff endpoints) */}
                            {data && (
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Vai trò
                                    </label>
                                    <div className="mt-1 flex h-10 items-center rounded-md border border-input-border bg-input/50 px-4 text-sm text-muted-foreground">
                                        {data.payload.data.role}
                                        <span className="ml-2 text-xs text-muted-foreground">(không thể thay đổi ở đây)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </Form>

                <DialogFooter className="border-t border-border-subtle p-6">
                    <Button
                        variant="outline"
                        onClick={reset}
                        className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        form="edit-employee-form"
                        disabled={updateMutation.isPending}
                        className="rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-md hover:shadow-gold"
                    >
                        {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}