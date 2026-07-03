import { CheckCircle } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

interface Props {
    tableNumber: number | null;
    name: string
    date: string
    time: string
    guests: string
    onReset: () => void
}

export default function ConfirmedState({ tableNumber, name, date, time, guests, onReset }: Props) {
    const t = useTranslations('Guest.Reservation.confirmed')
    const locale = useLocale()

    function formatDate(d: string) {
        return new Date(d + 'T00:00').toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
    }

    const summary = [
        [t('table'), tableNumber ? t('tableNumber', { number: tableNumber }) : t('tableAssigned')],
        [t('date'), formatDate(date)],
        [t('time'), time],
        [t('guests'), t('guestsCount', { count: guests })],
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
                {t('title')}
            </h3>

            <p style={{ fontSize: 12, color: '#8A7F72', margin: '0 0 20px 0', lineHeight: 1.6 }}>
                {t.rich('thankYou', {
                    name,
                    b: (chunks) => <strong style={{ color: '#F5F0E8' }}>{chunks}</strong>,
                })}
                <br />
                {t('received')}
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
                {t('callHint')}{' '}
                <strong style={{ color: '#F5F0E8' }}>{t('callHintMinutes')}</strong>.<br />
                {t('arriveOnTime')}
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
                {t('bookAnother')}
            </button>
        </div>
    )
}