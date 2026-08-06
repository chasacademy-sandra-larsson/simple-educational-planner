"use client";

// Djuplänk (Fas 3, ADR-0009): arbetsbelastnings-underlaget bor nu som drawer i kontrollrummet.
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ScheduleRedirect() {
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        router.replace(`/projects/${params.id}?panel=workload`);
    }, [router, params.id]);

    return null;
}
