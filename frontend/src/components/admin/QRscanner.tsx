'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/src/i18n/navigation'

interface QRScannerModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
    const t = useTranslations('Guest.Scanner')
    const router = useRouter()
    const scannerRef = useRef<any>(null)
    const [status, setStatus] = useState<'idle' | 'scanning' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (!isOpen) return

        let html5QrCode: any

        const startScanner = async () => {
            try {
                // Dynamic import để tránh SSR error
                const { Html5Qrcode } = await import('html5-qrcode')

                html5QrCode = new Html5Qrcode('qr-reader-container')
                scannerRef.current = html5QrCode

                await html5QrCode.start(
                    { facingMode: 'environment' }, // dùng camera sau
                    {
                        fps: 10,
                        qrbox: { width: 220, height: 220 },
                        aspectRatio: 1,
                    },
                    (decodedText: string) => {
                        // QR decode thành công
                        html5QrCode.stop().catch(() => { })
                        onClose()

                        // Xử lý URL từ QR:
                        // - Nếu QR chứa /tables/5 → redirect đến /tables/5
                        // - Nếu QR là số bàn thuần (vd "5") → /tables/5
                        // - Nếu QR là full URL → push trực tiếp
                        try {
                            const url = new URL(decodedText)
                            router.push(url.pathname + url.search)
                        } catch {
                            const tableMatch = decodedText.match(/tables[\/\\](\d+)/i)
                            if (tableMatch) {
                                router.push(`/tables/${tableMatch[1]}`)
                            } else if (/^\d+$/.test(decodedText.trim())) {
                                router.push(`/tables/${decodedText.trim()}`)
                            } else {
                                router.push(decodedText)
                            }
                        }
                    },
                    () => {
                        // Mỗi frame không decode được → bỏ qua, không log
                    }
                )

                setStatus('scanning')
            } catch (err: any) {
                const msg =
                    err?.message?.includes('Permission')
                        ? t('permissionError')
                        : err?.message?.includes('device')
                            ? t('deviceError')
                            : t('genericError')
                setStatus('error')
                setErrorMsg(msg)
            }
        }

        setStatus('idle')
        setErrorMsg('')
        startScanner()

        return () => {
            if (scannerRef.current?.isScanning) {   // ← fix ở đây nữa
                scannerRef.current.stop().catch(() => { })
            }
            scannerRef.current = null
        }
    }, [isOpen, t])

    const handleClose = () => {
        if (scannerRef.current?.isScanning) {   // ← chỉ stop khi đang chạy
            scannerRef.current.stop().catch(() => { })
        }
        scannerRef.current = null
        setStatus('idle')
        onClose()
    }

    if (!isOpen) return null

    return (
        // Backdrop
        <div
            onClick={handleClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                backgroundColor: 'rgba(0, 0, 0, 0.80)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
            }}
        >
            {/* Modal — stopPropagation để click bên trong không đóng */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: '#1A1714',
                    borderRadius: '16px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '360px',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            style={{
                                backgroundColor: '#FFC000',
                                color: '#000',
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {/* QR icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </div>
                        <span
                            style={{
                                color: '#F5F0E8',
                                fontSize: '13px',
                                fontWeight: '700',
                                letterSpacing: '0.08em',
                            }}
                        >
                            {t('title')}
                        </span>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#8A7F72',
                            cursor: 'pointer',
                            fontSize: '20px',
                            lineHeight: 1,
                            padding: '2px 6px',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Camera viewfinder */}
                <div
                    style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#0D0B08',
                        aspectRatio: '1',
                    }}
                >
                    {/* html5-qrcode render video vào đây */}
                    <div id="qr-reader-container" style={{ width: '100%', height: '100%' }} />

                    {/* Corner brackets overlay */}
                    {status === 'scanning' && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                                {/* Top-left */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, width: '24px', height: '24px',
                                    borderTop: '3px solid #FFC000', borderLeft: '3px solid #FFC000', borderRadius: '4px 0 0 0'
                                }} />
                                {/* Top-right */}
                                <div style={{
                                    position: 'absolute', top: 0, right: 0, width: '24px', height: '24px',
                                    borderTop: '3px solid #FFC000', borderRight: '3px solid #FFC000', borderRadius: '0 4px 0 0'
                                }} />
                                {/* Bottom-left */}
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, width: '24px', height: '24px',
                                    borderBottom: '3px solid #FFC000', borderLeft: '3px solid #FFC000', borderRadius: '0 0 0 4px'
                                }} />
                                {/* Bottom-right */}
                                <div style={{
                                    position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px',
                                    borderBottom: '3px solid #FFC000', borderRight: '3px solid #FFC000', borderRadius: '0 0 4px 0'
                                }} />

                                {/* Scan line animation */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: '10px',
                                        right: '10px',
                                        height: '2px',
                                        background: 'linear-gradient(to right, transparent, #FFC000, transparent)',
                                        animation: 'scanline 2s ease-in-out infinite',
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error state overlay */}
                    {status === 'error' && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                padding: '24px',
                                backgroundColor: '#0D0B08',
                            }}
                        >
                            <div style={{ fontSize: '32px' }}>📷</div>
                            <p
                                style={{
                                    color: '#ef4444',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    lineHeight: '1.5',
                                    margin: 0,
                                }}
                            >
                                {errorMsg}
                            </p>
                        </div>
                    )}

                    {/* Loading state */}
                    {status === 'idle' && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#0D0B08',
                            }}
                        >
                            <div style={{ color: '#8A7F72', fontSize: '12px' }}>{t('starting')}</div>
                        </div>
                    )}
                </div>

                {/* Hint text */}
                <p
                    style={{
                        color: '#8A7F72',
                        fontSize: '11px',
                        textAlign: 'center',
                        margin: 0,
                        letterSpacing: '0.04em',
                        lineHeight: '1.5',
                    }}
                >
                    {status === 'error'
                        ? t('hintError')
                        : t('hintScanning')}
                </p>

                {/* Retry button (only on error) */}
                {status === 'error' && (
                    <button
                        onClick={() => {
                            setStatus('idle')
                            setErrorMsg('')
                            if (scannerRef.current) {
                                scannerRef.current.stop().catch(() => { })
                                scannerRef.current = null
                            }
                            // Re-trigger useEffect bằng cách remount — dùng key trick hoặc gọi lại start
                            // Ở đây ta close rồi mở lại
                            handleClose()
                        }}
                        style={{
                            backgroundColor: '#FFC000',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px',
                            fontWeight: '700',
                            fontSize: '12px',
                            letterSpacing: '0.06em',
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        {t('retry')}
                    </button>
                )}
            </div>

            {/* CSS animation cho scan line */}
            <style>{`
        @keyframes scanline {
          0%   { top: 10px; opacity: 1; }
          50%  { top: calc(100% - 10px); opacity: 1; }
          100% { top: 10px; opacity: 1; }
        }
        /* Ẩn UI mặc định của html5-qrcode */
        #qr-reader-container > img { display: none !important; }
        #qr-reader-container__dashboard { display: none !important; }
        #qr-reader-container__status_span { display: none !important; }
        #qr-reader-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
      `}</style>
        </div>
    )
}