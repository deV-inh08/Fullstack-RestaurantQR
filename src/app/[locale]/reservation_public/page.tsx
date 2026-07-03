'use client'

import { useState, useMemo } from 'react'
import { Link, useRouter } from '@/src/i18n/navigation'
import { LayoutGrid, CheckCircle, Loader2, CalendarDays, Clock, Users, Phone, User, MessageSquare, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import http from '@/src/lib/http'
import { handleErrorApi } from '@/src/lib/utils'
import TableSection from './components/TableSection'
import ConfirmedState from './components/confirmedState'
import { ReservationTableDto } from '@/src/schema/reservation.schema'
// import { useUpdateTableVisibilityMutation } from '@/src/queries/useTable'
import { useCreateReservationMutation } from '@/src/queries/useReservation'
import { useGetTablesForReservation } from '@/src/queries/useTable'


// ─── Hooks ───────────────────────────────────────────────────────────────────
// function useTablesForReservation() {
//   return useQuery({
//     queryKey: ['tables-reservation'],
//     queryFn: () =>
//       http.get<{ message: string; data: ReservationTableDto[] }>(
//         '/table/reservation-available',
//         { service: 'order' }
//       ),
//     staleTime: 60_000,
//   })
// }

// function useCreateReservation() {
//   return useMutation({
//     mutationFn: (body: Record<string, unknown>) =>
//       http.post('/reservation', body, { service: 'reservation' }),
//   })
// }

// ─── Small helpers ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1A1714',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#F5F0E8',
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function InputFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = '#FFC000'
  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,192,0,0.12)'
}
function InputBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
  e.currentTarget.style.boxShadow = 'none'
}

function FieldLabel({ icon: Icon, children }: { icon: React.ElementType; children: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
      color: '#8A7F72', marginBottom: 6,
    }}>
      <Icon size={12} />
      {children}
    </label>
  )
}


// ─── Main page ────────────────────────────────────────────────────────────────
export default function ReservationPage() {
  // Table data from Order.API
  const { data: tableRes, isLoading: tableLoading } = useGetTablesForReservation()
  const tables = tableRes?.payload?.data ?? []

  // Group tables
  const windowSeats = tables.filter(t => t.capacity <= 2)
  const mainFloor = tables.filter(t => t.capacity >= 3 && t.capacity <= 6)
  const privateArea = tables.filter(t => t.capacity >= 7)

  // Form state
  const [selectedTable, setSelectedTable] = useState<ReservationTableDto | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [guests, setGuests] = useState('')
  const [note, setNote] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)

  const isFormValid = name.trim() && phone.trim() && date && time && Number(guests) > 0

  const createMutation = useCreateReservationMutation()

  const handleConfirm = async () => {
    if (!isFormValid) return

    // Combine date + time → ISO DateTime string
    const reservationDate = new Date(`${date}T${time}:00`)

    try {
      await createMutation.mutateAsync({
        guestName: name.trim(),
        guestPhone: phone.trim(),
        guestEmail: email.trim() || null,
        tableId: selectedTable?.id ?? null,
        numberOfPeople: Number(guests),
        tableNumber: selectedTable?.number ?? null,
        reservationDate,
        depositAmount: 0,
        depositStatus: 'None',
        note: note.trim() || null,
      })
      setIsConfirmed(true)
      toast.success('Đặt bàn thành công! Chúng tôi sẽ liên hệ xác nhận sớm.')
    } catch (error) {
      handleErrorApi({ error })
    }
  }

  const handleReset = () => {
    setSelectedTable(null)
    setName(''); setPhone(''); setEmail('')
    setDate(''); setTime(''); setGuests(''); setNote('')
    setIsConfirmed(false)
  }

  // Min date = tomorrow
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <div style={{ backgroundColor: '#0D0B08', color: '#F5F0E8', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header style={{
        backgroundColor: '#0D0B08',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 40px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              backgroundColor: '#FFC000', color: '#000',
              width: 34, height: 34, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14,
            }}>
              VG
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.1em' }}>
              VIET GOLD
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/" style={{ fontSize: 13, color: '#8A7F72', textDecoration: 'none' }}>
              ← Trang chủ
            </Link>
            <Link href="/login" style={{ fontSize: 13, color: '#8A7F72', textDecoration: 'none' }}>
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Layout ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', minHeight: 'calc(100vh - 57px)' }}>

        {/* ── Left: Floor Plan ──────────────────────────────────── */}
        <section style={{ padding: '40px 48px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, color: '#FFC000', letterSpacing: '0.18em', marginBottom: 8, fontWeight: 600 }}>
              ĐẶT BÀN TRỰC TUYẾN
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em', margin: 0, lineHeight: 1.1 }}>
              CHỌN BÀN CỦA BẠN
            </h1>
            <p style={{ fontSize: 13, color: '#8A7F72', marginTop: 8, lineHeight: 1.6 }}>
              Chọn bàn mong muốn từ sơ đồ bên dưới, hoặc bỏ qua để nhà hàng tự sắp xếp.
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { color: '#1A1714', border: 'rgba(255,255,255,0.15)', label: 'Trống' },
              { color: '#FFC000', border: 'transparent', label: 'Đang chọn' },
              { color: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Không khả dụng' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 3,
                  backgroundColor: l.color,
                  border: `1px solid ${l.border}`,
                }} />
                <span style={{ fontSize: 11, color: '#8A7F72' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Floor plan container */}
          <div style={{
            backgroundColor: '#110F0C', borderRadius: 14,
            padding: 28, border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {tableLoading ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 180, gap: 12, color: '#8A7F72',
              }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13 }}>Đang tải sơ đồ bàn...</span>
              </div>
            ) : tables.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A7F72' }}>
                <LayoutGrid size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 13 }}>Chưa có bàn nào được thiết lập</p>
              </div>
            ) : (
              <>
                {windowSeats.length > 0 && (
                  <TableSection
                    title="CỬA SỔ"
                    tables={windowSeats}
                    selected={selectedTable}
                    onSelect={setSelectedTable}
                  />
                )}
                {mainFloor.length > 0 && (
                  <TableSection
                    title="KHU VỰC CHÍNH"
                    tables={mainFloor}
                    selected={selectedTable}
                    onSelect={setSelectedTable}
                  />
                )}
                {privateArea.length > 0 && (
                  <TableSection
                    title="KHU VIP / RIÊNG TƯ"
                    tables={privateArea}
                    selected={selectedTable}
                    onSelect={setSelectedTable}
                  />
                )}
              </>
            )}
          </div>

          {/* Skip option */}
          {selectedTable && (
            <button
              onClick={() => setSelectedTable(null)}
              style={{
                marginTop: 14, background: 'none', border: 'none',
                color: '#8A7F72', fontSize: 12, cursor: 'pointer',
                textDecoration: 'underline', padding: 0,
              }}
            >
              Bỏ qua — để nhà hàng tự sắp xếp bàn
            </button>
          )}
        </section>

        {/* ── Right: Booking Panel ──────────────────────────────── */}
        <aside style={{
          backgroundColor: '#110F0C', padding: '40px 28px',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto',
          position: 'sticky', top: 57, height: 'calc(100vh - 57px)',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 4px 0' }}>
              THÔNG TIN ĐẶT BÀN
            </h2>
            <p style={{ fontSize: 12, color: '#8A7F72', margin: 0 }}>
              Điền thông tin để xác nhận lịch hẹn
            </p>
          </div>

          {/* Selected table badge */}
          {selectedTable ? (
            <div style={{
              backgroundColor: 'rgba(255,192,0,0.08)',
              border: '1px solid rgba(255,192,0,0.25)',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                backgroundColor: '#FFC000', color: '#000',
                width: 40, height: 40, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, flexShrink: 0,
              }}>
                {selectedTable.number}
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#8A7F72', letterSpacing: '0.1em' }}>BÀN ĐÃ CHỌN</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F0E8' }}>
                  Bàn {selectedTable.number} · Tối đa {selectedTable.capacity} khách
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#1A1714',
              border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <LayoutGrid size={16} style={{ color: '#8A7F72', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#8A7F72', margin: 0, lineHeight: 1.5 }}>
                Chưa chọn bàn — nhà hàng sẽ sắp xếp phù hợp
              </p>
            </div>
          )}

          {/* ── Confirmed state ─────────────────────────────── */}
          {isConfirmed ? (
            <ConfirmedState
              tableNumber={selectedTable?.number || null}
              name={name} date={date} time={time} guests={guests}
              onReset={handleReset}
            />
          ) : (
            /* ── Form ──────────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Name */}
              <div>
                <FieldLabel icon={User}>HỌ TÊN *</FieldLabel>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={inputStyle}
                  onFocus={InputFocus}
                  onBlur={InputBlur}
                />
              </div>

              {/* Phone */}
              <div>
                <FieldLabel icon={Phone}>SỐ ĐIỆN THOẠI *</FieldLabel>
                <input
                  type="tel"
                  placeholder="0901 234 567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={inputStyle}
                  onFocus={InputFocus}
                  onBlur={InputBlur}
                />
              </div>

              {/* Email (optional) */}
              <div>
                <FieldLabel icon={Mail}>EMAIL (tuỳ chọn)</FieldLabel>
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={InputFocus}
                  onBlur={InputBlur}
                />
              </div>

              {/* Date + Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <FieldLabel icon={CalendarDays}>NGÀY *</FieldLabel>
                  <input
                    type="date"
                    value={date}
                    min={minDateStr}
                    onChange={e => setDate(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    onFocus={InputFocus}
                    onBlur={InputBlur}
                  />
                </div>
                <div>
                  <FieldLabel icon={Clock}>GIỜ *</FieldLabel>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    onFocus={InputFocus}
                    onBlur={InputBlur}
                  />
                </div>
              </div>

              {/* Guests */}
              <div>
                <FieldLabel icon={Users}>SỐ LƯỢNG KHÁCH *</FieldLabel>
                <input
                  type="number"
                  min={1} max={30}
                  placeholder="2"
                  value={guests}
                  onChange={e => setGuests(e.target.value)}
                  style={inputStyle}
                  onFocus={InputFocus}
                  onBlur={InputBlur}
                />
              </div>

              {/* Note */}
              <div>
                <FieldLabel icon={MessageSquare}>YÊU CẦU ĐẶC BIỆT</FieldLabel>
                <textarea
                  placeholder="Sinh nhật, dị ứng thực phẩm, yêu cầu khác..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                  onFocus={InputFocus}
                  onBlur={InputBlur}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleConfirm}
                disabled={!isFormValid || createMutation.isPending}
                style={{
                  backgroundColor: '#FFC000',
                  color: '#000',
                  fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.08em',
                  padding: '14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: isFormValid && !createMutation.isPending ? 'pointer' : 'not-allowed',
                  width: '100%',
                  opacity: isFormValid && !createMutation.isPending ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.15s',
                }}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ĐANG ĐẶT BÀN...
                  </>
                ) : (
                  'XÁC NHẬN ĐẶT BÀN'
                )}
              </button>

              <p style={{ fontSize: 11, color: '#8A7F72', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
                Chúng tôi sẽ liên hệ xác nhận qua số điện thoại trong vòng 30 phút.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Spin animation */}
      <style>{`
                @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
            `}</style>
    </div>
  )
}


