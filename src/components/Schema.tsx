import { Helmet } from 'react-helmet-async';

export const SchemaMarkup = () => {
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Gist AI Systems",
        "url": "https://gist.ai",
        "logo": "https://gist.ai/logo.png",
        "sameAs": [
            "https://discord.com/invite/ZZx3cBrx2",
            "https://www.instagram.com/entrext.labs/#",
            "https://www.linkedin.com/company/entrext/",
            "https://entrextlabs.substack.com/subscribe"
        ],
        "contactPoint": {
            "@type": "ContactPoint",
            "email": "legal@gist.ai",
            "contactType": "customer support"
        }
    };

    const softwareAppSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Gist",
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "featureList": "Text Simplification, Jargon Translation, Contextual Analysis"
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "How does Gist work?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Gist uses advanced AI to analyze complex text and translate it into plain, 6th-grade English, preserving the meaning while removing the jargon."
                }
            },
            {
                "@type": "Question",
                "name": "Is Gist free?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, Gist offers a free 'Starter' tier. For power users and teams, we offer Pro and Enterprise plans with higher limits and advanced features."
                }
            },
            {
                "@type": "Question",
                "name": "Is my data secure?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Absolutely. We are privacy-first. We do not use your data to train public models without consent, and our Enterprise tier offers dedicated secure environments."
                }
            }
        ]
    };

    return (
        <Helmet>
            <script type="application/ld+json">
                {JSON.stringify(organizationSchema)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(softwareAppSchema)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(faqSchema)}
            </script>
        </Helmet>
    );
};
