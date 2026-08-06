"use client";

// Djuplänk (Fas 3, ADR-0009): generering + preflight bor nu i kontrollrummet.
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function SchedulingRedirect() {
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        router.replace(`/projects/${params.id}`);
    }, [router, params.id]);

    return null;
}
