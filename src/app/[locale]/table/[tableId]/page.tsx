'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/src/i18n/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Minus, Plus } from 'lucide-react'
import http from '@/src/lib/http'
import { formatCurrency, handleErrorApi, handleImageURL } from '@/src/lib/utils'
import { getGuestInfo, isGuestLoggedIn } from '@/src/lib/guest-session'
import { useGetDishes } from '@/src/queries/useDish'
import { DishDto } from '@/src/schema/dish.schema'

type CartItem = { dishId: number; name: string; price: number; quantity: number }
const CATEGORY_ORDER = ['Beverage', 'MainCourse', 'Dessert', 'Other'] as const

function getCategoryKey(dish: DishDto): string {
  const cat = (dish as any).category as string | undefined
  return cat && CATEGORY_ORDER.includes(cat as any) ? cat : 'Other'
}

export default function GuestTablePage() {
  const t = useTranslations('Guest.Menu')
  const params = useParams()
  const router = useRouter()
  const tableId = Number(params.tableId)
  const guestInfo = getGuestInfo()

  const [activeCategory, setActive] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  // Chưa đăng nhập → về trang welcome
  useEffect(() => {
    if (!isGuestLoggedIn()) {
      router.replace(`/table/${tableId}/welcome`)
    }
  }, [tableId, router])

  // Fetch danh sách món — [AllowAnonymous] ở Menu.API nên không cần token
  const { data: dishesData, isLoading } = useGetDishes()
  const dishes = (dishesData?.payload.data.data ?? []).filter(
    (d) => d.status === 'Available'
  )

  // Group dishes by category
  const grouped = dishes.reduce<Record<string, DishDto[]>>((acc, dish) => {
    const key = getCategoryKey(dish)
      ; (acc[key] ??= []).push(dish)
    return acc
  }, {})

  const categoryKeys = CATEGORY_ORDER.filter((k) => grouped[k]?.length)

  // Auto-select first category once data loads
  useEffect(() => {
    if (categoryKeys.length && !activeCategory) setActive(categoryKeys[0])
  }, [categoryKeys.join(',')])

  // Dishes shown = only the active category
  const visibleDishes = grouped[activeCategory] ?? []


  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0)



  // ─── Cart helpers ──────────────────────────────────────────────────────
  const getQty = (dishId: number) =>
    cart.find((i) => i.dishId === dishId)?.quantity ?? 0

  const addToCart = (dish: DishDto) =>
    setCart((prev) => {
      const existing = prev.find((i) => i.dishId === dish.id)
      if (existing) {
        return prev.map((i) =>
          i.dishId === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { dishId: dish.id, name: dish.name, price: dish.price, quantity: 1 }]
    })

  const removeFromCart = (dishId: number) =>
    setCart((prev) => {
      const existing = prev.find((i) => i.dishId === dishId)
      if (!existing) return prev
      if (existing.quantity === 1) return prev.filter((i) => i.dishId !== dishId)
      return prev.map((i) =>
        i.dishId === dishId ? { ...i, quantity: i.quantity - 1 } : i
      )
    })


  const orderMutation = useMutation({
    mutationFn: async (items: CartItem[]) => {
      // Không còn đọc accessToken thủ công từ sessionStorage — cookie
      // guestAccessToken được BFF tự gắn vào request khi gọi qua
      // service: 'guest'. Lấy dish-snapshot vẫn là call công khai/staff
      // bình thường qua service: 'menu'.
      await Promise.all(
        items.map(async (item) => {
          const snapshotRes = await http.get<{ message: string; data: { id: number } }>(
            `/dish-snapshot/by-dish/${item.dishId}`,
            { service: 'menu' }
          )

          const snapshotId = snapshotRes.payload.data.id

          return http.post(
            '/order',
            { dishSnapshotId: snapshotId, quantity: item.quantity, tableId: tableId },
            { service: 'guest' }
          )
        })
      )
    },
    onSuccess: () => {
      toast.success(t('orderedToast', { count: totalItems }))
      setCart([])
      router.push(`/table/${tableId}/orders`)
    },
    onError: (error: any) => {
      if (error?.status === 401) {
        toast.error(t('sessionExpired'))
        router.replace(`/table/${tableId}/welcome`)
      } else {
        handleErrorApi({ error })
      }
    },
  })

  return (
    <div className="flex min-h-screen flex-col pb-28">
      <header className="border-b border-foreground/10 p-4">
        <h1 className="text-lg font-bold">
          {t('tableLabel', { number: tableId })}{guestInfo ? ` · ${guestInfo.name}` : ''}
        </h1>
      </header>


      {/* Category tabs — filter, not scroll */}
      {!isLoading && categoryKeys.length > 0 && (
        <div className="sticky top-[52px] z-10 border-b border-foreground/8 bg-background/90 backdrop-blur-sm">
          <div className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoryKeys.map((key) => {
              const isActive = activeCategory === key
              return (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  className={[
                    'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium',
                    'whitespace-nowrap transition-all duration-150 active:scale-95',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-foreground/6 text-foreground/70 hover:bg-foreground/10',
                  ].join(' ')}
                >
                  {t(`categories.${key}` as any)}
                  <span
                    className={[
                      'rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-foreground/10 text-foreground/50',
                    ].join(' ')}
                  >
                    {grouped[key].length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}


      {/* Dish list — only active category */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visibleDishes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-foreground/50">
          {t('empty')}
        </div>
      ) : (
        <ul className="divide-y divide-foreground/8 px-4">
          {visibleDishes.map((dish) => {
            const qty = getQty(dish.id)
            return (
              <li key={dish.id} className="flex items-center gap-3 py-4">

                {dish.imagePath && (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-foreground/5">
                    <img
                      src={handleImageURL(dish.imagePath) ?? ''}
                      alt={dish.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{dish.name}</p>
                  {dish.description && (
                    <p className="line-clamp-1 text-xs text-foreground/50">
                      {dish.description}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-bold text-primary">
                    {formatCurrency(dish.price)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {qty > 0 ? (
                    <>
                      <button
                        aria-label={t('decreaseAria')}
                        onClick={() => removeFromCart(dish.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground/20 text-foreground/70 active:scale-95"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold tabular-nums">
                        {qty}
                      </span>
                      <button
                        aria-label={t('increaseAria')}
                        onClick={() => addToCart(dish)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      aria-label={t('addAria', { name: dish.name })}
                      onClick={() => addToCart(dish)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-foreground/10 bg-card p-4">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <div>
              <p className="text-xs text-foreground/60">{t('itemsCount', { count: totalItems })}</p>
              <p className="text-lg font-bold">{formatCurrency(totalPrice)}</p>
            </div>
            <button
              onClick={() => orderMutation.mutate(cart)}
              disabled={orderMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {orderMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('placeOrder')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
