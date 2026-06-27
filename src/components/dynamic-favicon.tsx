'use client';

import { useEffect } from 'react';

interface DynamicFaviconProps {
    schoolLogo?: string;
}

export default function DynamicFavicon({ schoolLogo }: DynamicFaviconProps) {
    useEffect(() => {
        // Update favicon dynamically based on school logo
        const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;

        if (schoolLogo && schoolLogo !== '/logo_placeholder.png') {
            // Use school logo as favicon
            if (favicon) {
                favicon.href = schoolLogo;
            } else {
                const newFavicon = document.createElement('link');
                newFavicon.rel = 'icon';
                newFavicon.href = schoolLogo;
                document.head.appendChild(newFavicon);
            }
        } else {
            // Use default KuMMi icon
            if (favicon) {
                favicon.href = '/kummi-icon.svg';
            }
        }
    }, [schoolLogo]);

    return null; // This component doesn't render anything
}
