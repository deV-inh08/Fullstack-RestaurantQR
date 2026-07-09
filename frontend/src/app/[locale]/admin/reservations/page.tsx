'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Search, CalendarDays } from 'lucide-react'
import { AdminHeader } from '@/src/components/admin/admin-header'
import DeleteReservationDialog from './components/delete_reservation'
import TableReservation from "./components/table_reservation"
import { ReservationDto, ReservationStatusType } from '@/src/schema/reservation.schema'
import { useGetReservations } from '@/src/queries/useReservation'
import { TableSkeleton } from '@/src/components/Skeleton/skeleton'
import { PAGE_SIZE } from '@/src/config'

export default function ReservationPage() {
  const t = useTranslations('Admin.Reservations')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const [toDelete, setToDelete] = useState<ReservationDto | null>(null)

  // Build query params for the API
  const queryParams = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    ...(statusFilter !== 'all' ? { status: statusFilter as ReservationStatusType } : {}),
    ...(dateFilter ? { fromDate: dateFilter, toDate: dateFilter } : {}),
    ...(search.match(/^\d/) ? { guestPhone: search } : {}),
  }), [page, statusFilter, dateFilter, search])


  const { data, isLoading } = useGetReservations(queryParams)

  const allReservations = data?.payload.data.data ?? []

  const filtered = useMemo(() =>
    search && !search.match(/^\d/)
      ? allReservations.filter(r =>
        r.guestName.toLowerCase().includes(search.toLowerCase()))
      : allReservations,
    [allReservations, search])

  const totalBookings = data?.payload.data.total ?? 0
  const totalPages = data?.payload.data.totalPages ?? 1
  const pendingCount = filtered.filter(r => r.status === 'Booked').length
  const todayCount = filtered.filter(r => {
    const d = new Date(r.reservationDate)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length



  return (
    <>
      <AdminHeader title={t('header.title')} subtitle={t('header.subtitle')} />
      <DeleteReservationDialog reservation={toDelete} onClose={() => setToDelete(null)} />

      <div style={{ padding: '32px 40px' }}>
        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: t('metrics.total'), value: totalBookings, color: '#F5F0E8' },
            { label: t('metrics.pending'), value: pendingCount, color: '#FFC000' },
            { label: t('metrics.today'), value: todayCount, color: '#22c55e' },
          ].map((m, i) => (
            <div key={i} style={{
              backgroundColor: '#1A1714', borderRadius: 10,
              padding: '16px 20px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 10, color: '#8A7F72', letterSpacing: '0.12em', marginBottom: 8 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>
                {isLoading ? '...' : m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{
              position: 'absolute', left: 8, top: '50%',
              transform: 'translateY(-50%)', color: '#8A7F72',
            }} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{
                backgroundColor: '#1A1714',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, height: 32,
                paddingLeft: 32, paddingRight: 12,
                fontSize: 13, color: '#F5F0E8', width: '100%',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(1) }}
              style={{
                backgroundColor: '#1A1714',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, height: 32, padding: '0 12px',
                fontSize: 13, color: '#F5F0E8',
              }}
            />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              style={{
                backgroundColor: '#1A1714',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, height: 32, padding: '0 12px',
                fontSize: 13, color: '#F5F0E8', minWidth: 160,
              }}
            >
              <option value="all">{t('statusAll')}</option>
              <option value="Booked">{t('reservationStatus.booked')}</option>
              <option value="CheckedIn">{t('reservationStatus.checkedIn')}</option>
              <option value="Cancelled">{t('reservationStatus.cancelled')}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{
          backgroundColor: '#1A1714', borderRadius: 10, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '60px 20px', color: '#8A7F72',
            }}>
              <CalendarDays size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>{t('empty')}</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                {t('emptyHint')}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#110F0C',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    height: 40,
                  }}>
                    {[t('columns.guest'), t('columns.phone'), t('columns.table'), t('columns.datetime'), t('columns.guests'), t('columns.deposit'), t('columns.note'), t('columns.status'), t('columns.actions')].map(h => (
                      <th key={h} style={{
                        padding: '0 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700,
                        color: '#8A7F72', letterSpacing: '0.08em',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(res => (
                    <TableReservation key={res.id} res={res} onDelete={setToDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  backgroundColor: 'transparent', color: '#F5F0E8',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
                  fontSize: 13, opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                {t('prevPage')}
              </button>
              <span style={{ fontSize: 13, color: '#8A7F72' }}>
                {t('pageOf', { page, totalPages })}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  backgroundColor: 'transparent', color: '#F5F0E8',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
                  fontSize: 13, opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                {t('nextPage')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
