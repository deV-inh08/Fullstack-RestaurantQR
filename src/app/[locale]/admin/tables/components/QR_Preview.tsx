import envConfig from "@/src/config"
import { QRCodeSVG } from "qrcode.react"

const QRPreview = ({ tableId }: { tableId: number }) => {
    const url = `${envConfig.NEXT_PUBLIC_URL}/table/${tableId}/welcome`
    return (
        <div className="flex h-14 w-14 items-center justify-center bg-white p-1 rounded-sm">
            <QRCodeSVG value={url} size={48} level="M" bgColor="#FFFFFF" fgColor="#000000" />
        </div>
    )
}

export default QRPreview;