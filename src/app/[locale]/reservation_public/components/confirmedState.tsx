import { CheckCircle } from 'lucide-react'

interface Props {
    tableNumber: number | null;
    name: string
    date: string
    time: string
    guests: string
    onReset: () => void
}

function formatDate(d: string) {
    return new Date(d + 'T00:00').toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
}

export default function ConfirmedState({ tableNumber, name, date, time, guests, onReset }: Props) {
    const summary = [
        ['Bàn', tableNumber ? `Bàn số ${tableNumber}` : 'Nhà hàng sắp xếp'],
        ['Ngày', formatDate(date)],
        ['Giờ', time],
        ['Khách', `${guests} người`],
    ]

    return (
        <div style={{
            backgroundColor: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 12, padding: '28px 20px', textAlign: 'center',
        }}>
            {/* Icon */}
            <div style={{
                width: 56, height: 56, borderRadius: '50%',
                backgroundColor: 'rgba(34,197,94,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
            }}>
                <CheckCircle size={28} color="#22c55e" />
            </div>

            <h3 style={{
                fontSize: 15, fontWeight: 700, color: '#22c55e',
                margin: '0 0 6px 0', letterSpacing: '0.06em',
            }}>
                ĐẶT BÀN THÀNH CÔNG!
            </h3>

            <p style={{ fontSize: 12, color: '#8A7F72', margin: '0 0 20px 0', lineHeight: 1.6 }}>
                Cảm ơn <strong style={{ color: '#F5F0E8' }}>{name}</strong>!<br />
                Chúng tôi đã nhận lịch hẹn của bạn.
            </p>

            {/* Summary */}
            <div style={{
                backgroundColor: '#1A1714', borderRadius: 8,
                padding: '14px 16px', textAlign: 'left', marginBottom: 20,
            }}>
                {summary.map(([k, v]) => (
                    <div key={k} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        <span style={{ fontSize: 11, color: '#8A7F72' }}>{k}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F5F0E8' }}>{v}</span>
                    </div>
                ))}
            </div>

            <p style={{ fontSize: 11, color: '#8A7F72', margin: '0 0 20px 0', lineHeight: 1.7 }}>
                Nhân viên sẽ gọi xác nhận trong vòng{' '}
                <strong style={{ color: '#F5F0E8' }}>30 phút</strong>.<br />
                Vui lòng đến đúng giờ để giữ bàn.
            </p>

            <button
                onClick={onReset}
                style={{
                    fontSize: 12, color: '#FFC000', fontWeight: 600,
                    letterSpacing: '0.06em', padding: '8px 16px',
                    borderRadius: 6, width: '100%',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255,192,0,0.25)',
                    cursor: 'pointer',
                }}
            >
                ĐẶT THÊM MỘT BÀN KHÁC
            </button>
        </div>
    )
}