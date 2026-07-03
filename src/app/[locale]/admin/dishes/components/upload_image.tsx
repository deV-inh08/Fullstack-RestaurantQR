import { Upload, X } from "lucide-react"
import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from "react"

interface ImageUploadProps {
    value: File | null
    existingUrl?: string | null  // URL of the current saved image (for edit mode)
    onChange: (file: File | null) => void
}

const ImageUpload = ({ value, existingUrl, onChange }: ImageUploadProps) => {
    const [isDragging, setIsDragging] = useState(false)
    // preview: object URL for new file, or existingUrl for current image
    const [preview, setPreview] = useState<string | null>(null)
    const [isObjectUrl, setIsObjectUrl] = useState(false)  // track if we need to revoke
    const inputRef = useRef<HTMLInputElement>(null)

    // Sync preview when existingUrl changes (e.g., opening a different dish dialog)
    useEffect(() => {
        if (value) {
            // New file takes precedence — createObjectURL
            const url = URL.createObjectURL(value)
            setPreview(url)
            setIsObjectUrl(true)
        } else {
            // No new file: show existing URL if available
            setPreview(existingUrl ?? null)
            setIsObjectUrl(false)
        }

        return () => {
            // Cleanup object URL on unmount or value change
            if (isObjectUrl && preview) URL.revokeObjectURL(preview)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, existingUrl])

    const processFile = useCallback((file: File) => {
        if (!["image/png", "image/jpeg"].includes(file.type)) {
            alert("Only PNG and JPG are allowed")
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            alert("File size must be under 10MB")
            return
        }
        onChange(file)
        // Preview is handled by the useEffect above
    }, [onChange])

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) processFile(file)
    }
    const handleClick = () => inputRef.current?.click()
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processFile(file)
        e.target.value = ""
    }

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isObjectUrl && preview) URL.revokeObjectURL(preview)
        setPreview(existingUrl ?? null)  // fall back to existing URL
        setIsObjectUrl(false)
        onChange(null)
    }

    return (
        <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
        relative flex h-32 cursor-pointer flex-col items-center justify-center 
        rounded-md border-2 border-dashed transition-colors
        ${isDragging
                    ? "border-gold-primary bg-gold-subtle"
                    : "border-gold-border bg-gold-subtle/20 hover:border-gold-primary hover:bg-gold-subtle"
                }
      `}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleInputChange}
                className="hidden"
            />

            {preview ? (
                <>
                    <img src={preview} alt="Preview" className="h-full w-full rounded-md object-cover" />
                    {/* Only show remove if user uploaded a new file OR there's an existing image */}
                    <button
                        onClick={handleRemove}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                        title={value ? "Xóa ảnh mới" : "Giữ ảnh hiện tại"}
                    >
                        <X className="h-3 w-3" />
                    </button>
                    {/* Badge to indicate source */}
                    {!value && existingUrl && (
                        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            Ảnh hiện tại
                        </span>
                    )}
                    {value && (
                        <span className="absolute bottom-2 left-2 rounded bg-primary/80 px-1.5 py-0.5 text-[10px] text-black font-bold">
                            Ảnh mới
                        </span>
                    )}
                </>
            ) : (
                <>
                    <Upload className={`mb-2 h-8 w-8 ${isDragging ? "text-gold-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm text-muted-foreground">
                        {isDragging ? "Drop to upload" : "Click to upload or drag and drop"}
                    </span>
                    <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
                </>
            )}
        </div>
    )
}

export default ImageUpload