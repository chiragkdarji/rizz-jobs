import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: [
            'https://rizzjobs.in/sitemap.xml',
            'https://rizzjobs.in/news-sitemap.xml',
        ],
    }
}
