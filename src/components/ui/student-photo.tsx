"use client";

import React, { useState, useEffect } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentPhotoProps {
    src?: string | null;
    alt?: string;
    className?: string;
    fallbackClassName?: string;
    fallbackIcon?: React.ReactNode;
}

export function StudentPhoto({
    src,
    alt = "Student",
    className = "w-full h-full object-cover",
    fallbackClassName = "bg-slate-100 text-slate-300 flex items-center justify-center w-full h-full",
    fallbackIcon,
}: StudentPhotoProps) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    if (!src || hasError) {
        return (
            <div className={cn(fallbackClassName)}>
                {fallbackIcon || (
                    <svg className="w-1/2 h-1/2 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                )}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={cn(className)}
            onError={() => setHasError(true)}
        />
    );
}
