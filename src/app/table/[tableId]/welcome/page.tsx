'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useGuestLoginMutation, useGetTablePublic } from '@/src/queries/useGuest'
import { setGuestInfo, isGuestLoggedIn } from '@/src/lib/guest-session'
import { handleErrorApi } from '@/src/lib/utils'

export default function GuestLoginPage() {
  const params = useParams()
  const router = useRouter()
  const tableId = Number(params.tableId)

  const [name, setName] = useState('')

  useEffect(() => {
    if (isGuestLoggedIn()) router.replace(`/table/${tableId}`)
  }, [tableId, router])

  const { data: tableData, isLoading: isLoadingTable } = useGetTablePublic(tableId)
  const table = tableData?.payload.data

  const loginMutation = useGuestLoginMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !table) return
    if (table.status !== 'Available') {
      toast.error('Bàn này hiện không khả dụng. Vui lòng liên hệ nhân viên.')
      return
    }
    try {
      const result = await loginMutation.mutateAsync({
        tableNumber: table.number,
        name: name.trim(),
      })
      const { guest } = result.payload.data
      // KHÔNG gọi updateTableStatusMutation ở đây nữa — GuestService.LoginAsync
      // (Order.API) đã tự chuyển Table.Status sang Occupied ngay trong transaction
      // login rồi. Gọi thêm sẽ luôn lỗi 401 vì PATCH /table/{id}/status yêu cầu
      // role Staff/Admin/SuperAdmin, mà guest chỉ có Guest-role token.
      setGuestInfo(guest.name, guest.tableNumber)
      router.push(`/table/${tableId}`)
    } catch (error) {
      handleErrorApi({ error })
    }
  }

  if (isLoadingTable) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-foreground/10 bg-card p-8">
        <h1 className="text-xl font-bold text-center">Chào mừng tới bàn {table?.number}</h1>
        <p className="text-center text-sm text-foreground/60">Nhập tên để bắt đầu đặt món</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên của bạn"
          className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Bắt đầu
        </button>
      </form>
    </div>
  )
}