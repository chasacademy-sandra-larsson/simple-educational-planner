"use client";

// Djuplänk (Fas 2, ADR-0009): lärarhanteringen bor nu som drawer i kontrollrummet.
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function TeachersRedirect() {
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        router.replace(`/projects/${params.id}?panel=teachers`);
    }, [router, params.id]);

    return null;
}
