import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'GovExam.ai',
        short_name: 'GovExam',
        description: 'Autonomous Government Exam Updates & Alerts',
        start_url: '/',
        display: 'standalone',
        background_color: '#030712',
        theme_color: '#6366f1',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    }
}
