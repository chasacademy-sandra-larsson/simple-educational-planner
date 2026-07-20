"use client";

// Djuplänk (Fas 2, ADR-0009): inställningarna bor nu som drawer i kontrollrummet.
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function SettingsRedirect() {
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        router.replace(`/projects/${params.id}?panel=settings`);
    }, [router, params.id]);

    return null;
}
