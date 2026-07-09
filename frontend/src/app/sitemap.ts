import { MetadataRoute } from 'next'
import { routing } from '@/src/i18n/routing'

const baseUrl = 'https://fe-restaurant-qr.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
    return routing.locales.map((locale) => ({
        url: `${baseUrl}/${locale}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 1,
    }))
}