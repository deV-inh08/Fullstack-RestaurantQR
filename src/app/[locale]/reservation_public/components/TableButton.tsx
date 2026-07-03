import { useState } from 'react'
import type { ReservationTableDto } from '@/src/schema/reservation.schema'

interface Props {
    table: ReservationTableDto
    selected: boolean
    onClick: () => void
}

export default function TableButton({ table, selected, onClick }: Props) {
    const [hovered, setHovered] = useState(false)
    const unavailable = table.status !== 'Available'

    const bg = selected
        ? '#FFC000'
        : unavailable
            ? 'rgba(239,68,68,0.08)'
            : hovered
                ? 'rgba(255,192,0,0.06)'
                : '#1A1714'

    const border = selected
        ? 'none'
        : unavailable
            ? '1px solid rgba(239,68,68,0.25)'
            : hovered
                ? '1px solid rgba(255,192,0,0.4)'
                : '1px solid rgba(255,255,255,0.1)'

    const textColor = selected ? '#000' : unavailable ? '#ef4444' : '#F5F0E8'
    const subColor = selected ? 'rgba(0,0,0,0.55)' : unavailable ? 'rgba(239,68,68,0.6)' : '#8A7F72'

    return (
        <button
            onClick={unavailable ? undefined : onClick}
            disabled={unavailable}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={
                unavailable
                    ? `Bàn ${table.id} — ${table.status}`
                    : `Bàn ${table.capacity} — ${table.capacity} chỗ`
            }
            style={{
                width: 64, height: 64,
                backgroundColor: bg,
                border,
                borderRadius: 10,
                cursor: unavailable ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                transition: 'all 0.15s',
                color: textColor,
                opacity: unavailable && !selected ? 0.55 : 1,
                position: 'relative',
            }}
        >
            <span style={{ fontSize: 16, fontWeight: 700 }}>{table.id}</span>
            <span style={{ fontSize: 9, letterSpacing: '0.05em', color: subColor }}>
                {table.capacity} PAX
            </span>

            {unavailable && (
                <span style={{
                    position: 'absolute', bottom: -6,
                    fontSize: 9, color: '#ef4444', fontWeight: 600,
                    backgroundColor: '#0D0B08', padding: '0 4px', borderRadius: 3,
                }}>
                    {table.status === 'Occupied' ? 'CÓ KHÁCH' : 'ẨN'}
                </span>
            )}
        </button>
    )
}