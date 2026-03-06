import React from "react";

interface StructuredDataProps {
    data: {
        title: string;
        source: string;
        link: string;
        exam_date?: string;
        deadline?: string;
        ai_summary: string;
        direct_answer?: string;
    };
}

export default function StructuredData({ data }: StructuredDataProps) {
    // We use Schema.org 'Event' for exam dates or 'JobPosting' for notifications
    const schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": data.title,
        "description": data.ai_summary,
        "author": {
            "@type": "Organization",
            "name": "Rizz Jobs"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Rizz Jobs"
        },
        "datePublished": new Date().toISOString(),
        "url": data.link,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": data.link
        }
    };

    // If it's a job/exam with a deadline, we can add more specific schema
    if (data.deadline) {
        // Add specifically for job postings or application windows
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
