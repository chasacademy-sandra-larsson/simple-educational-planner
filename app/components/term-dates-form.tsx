"use client";

import { useState, useEffect } from 'react';
import type { TermDates, CreateTermDatesRequest, ProjectWithDetails } from '@/app/lib/api/types';
import { api, ApiError } from '@/app/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface TermDatesFormProps {
    project: ProjectWithDetails;
    onUpdate?: () => void;
}

type GymnasiumYear = 1 | 2 | 3;

export default function TermDatesForm({ project, onUpdate }: TermDatesFormProps) {
    const [termDates, setTermDates] = useState<TermDates[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedYear, setSelectedYear] = useState<GymnasiumYear>(1);
    const [isEditing, setIsEditing] = useState(false);

    // Form data for creating/editing term dates
    const [formData, setFormData] = useState<CreateTermDatesRequest>({
        academicYear: '',
        year: 1,
        fallTermStart: '',
        fallTermEnd: '',
        springTermStart: '',
        springTermEnd: '',
    });

    // Calculate available academic years based on classes
    const getAcademicYears = (): string[] => {
        const years = new Set<string>();
        project.classes.forEach(cls => {
            // Each class runs for 3 years
            for (let gymYear = 1; gymYear <= 3; gymYear++) {
                const startYear = cls.startYear + gymYear - 1;
                years.add(`${startYear}/${startYear + 1}`);
            }
        });
        return Array.from(years).sort();
    };

    // Get term name for display
    const getTermNames = (gymYear: GymnasiumYear): { fall: string; spring: string } => {
        const termMap: Record<GymnasiumYear, { fall: string; spring: string }> = {
            1: { fall: 'Termin 1 (HT)', spring: 'Termin 2 (VT)' },
            2: { fall: 'Termin 3 (HT)', spring: 'Termin 4 (VT)' },
            3: { fall: 'Termin 5 (HT)', spring: 'Termin 6 (VT)' },
        };
        return termMap[gymYear];
    };

    // Load term dates
    useEffect(() => {
        const loadTermDates = async () => {
            try {
                setLoading(true);
                const dates = await api.termDates.getAll(project.id);
                setTermDates(dates);

                // Set default academic year if we have classes
                const academicYears = getAcademicYears();
                if (academicYears.length > 0 && !formData.academicYear) {
                    setFormData(prev => ({ ...prev, academicYear: academicYears[0] }));
                }
            } catch (err) {
                console.error('Failed to load term dates:', err);
                setError('Kunde inte ladda terminstider');
            } finally {
                setLoading(false);
            }
        };

        loadTermDates();
    }, [project.id]);

    // Get existing term dates for the selected year
    const getExistingTermDates = (academicYear: string, year: GymnasiumYear): TermDates | undefined => {
        return termDates.find(td => td.academicYear === academicYear && td.year === year);
    };

    // Format date for display
    const formatDate = (dateString: string): string => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Handle starting to edit/create term dates
    const handleStartEdit = (academicYear: string, year: GymnasiumYear) => {
        const existing = getExistingTermDates(academicYear, year);
        if (existing) {
            setFormData({
                academicYear: existing.academicYear,
                year: existing.year as GymnasiumYear,
                fallTermStart: existing.fallTermStart.split('T')[0],
                fallTermEnd: existing.fallTermEnd.split('T')[0],
                springTermStart: existing.springTermStart.split('T')[0],
                springTermEnd: existing.springTermEnd.split('T')[0],
            });
        } else {
            // Set default dates based on typical Swedish school year
            const [startYear] = academicYear.split('/').map(Number);
            setFormData({
                academicYear,
                year,
                fallTermStart: `${startYear}-08-19`,
                fallTermEnd: `${startYear}-12-20`,
                springTermStart: `${startYear + 1}-01-08`,
                springTermEnd: `${startYear + 1}-06-14`,
            });
        }
        setSelectedYear(year);
        setIsEditing(true);
        setError('');
        setSuccess('');
    };

    // Handle save
    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const existing = getExistingTermDates(formData.academicYear, formData.year as GymnasiumYear);

            if (existing) {
                await api.termDates.update(existing.id, formData);
                setSuccess('Terminstider uppdaterade!');
            } else {
                await api.termDates.create(project.id, formData);
                setSuccess('Terminstider sparade!');
            }

            // Reload term dates
            const dates = await api.termDates.getAll(project.id);
            setTermDates(dates);
            setIsEditing(false);
            onUpdate?.();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Kunde inte spara terminstider');
            }
        } finally {
            setSaving(false);
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!confirm('Är du säker på att du vill ta bort dessa terminstider?')) return;

        try {
            await api.termDates.delete(id);
            const dates = await api.termDates.getAll(project.id);
            setTermDates(dates);
            setSuccess('Terminstider borttagna');
            onUpdate?.();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Kunde inte ta bort terminstider');
        }
    };

    const academicYears = getAcademicYears();

    if (loading) {
        return (
            <div className="rounded-xl border bg-card p-6 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (isEditing) {
        const termNames = getTermNames(formData.year as GymnasiumYear);
        return (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-6">
                        {getExistingTermDates(formData.academicYear, formData.year as GymnasiumYear) ? 'Redigera' : 'Skapa'} terminstider
                    </h2>

                    {error && (
                        <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Läsår
                                </label>
                                <p className="text-lg font-semibold text-foreground">
                                    {formData.academicYear}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Gymnasieår
                                </label>
                                <p className="text-lg font-semibold text-foreground">
                                    År {formData.year}
                                </p>
                            </div>
                        </div>

                        {/* Fall Term */}
                        <div className="p-4 bg-accent rounded-lg border border-border">
                            <h3 className="font-medium text-accent-foreground mb-4">
                                {termNames.fall} - Hösttermin
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        Startdatum
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.fallTermStart}
                                        onChange={(e) => setFormData({ ...formData, fallTermStart: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        Slutdatum
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.fallTermEnd}
                                        onChange={(e) => setFormData({ ...formData, fallTermEnd: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Spring Term */}
                        <div className="p-4 bg-primary/10 rounded-lg border border-border">
                            <h3 className="font-medium text-primary mb-4">
                                {termNames.spring} - Vårtermin
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        Startdatum
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.springTermStart}
                                        onChange={(e) => setFormData({ ...formData, springTermStart: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        Slutdatum
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.springTermEnd}
                                        onChange={(e) => setFormData({ ...formData, springTermEnd: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Sparar...' : 'Spara'}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                            >
                                Avbryt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                    Terminstider
                </h2>

                {error && (
                    <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-primary/10 border border-primary rounded-lg text-primary">
                        {success}
                    </div>
                )}

                {academicYears.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Inga klasser har lagts till ännu.</p>
                        <p className="text-sm mt-2">Lägg till klasser för att kunna ställa in terminstider.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {academicYears.map(academicYear => (
                            <div key={academicYear} className="border border-border rounded-lg overflow-hidden">
                                <div className="bg-muted px-4 py-3 border-b border-border">
                                    <h3 className="font-semibold text-foreground">
                                        Läsår {academicYear}
                                    </h3>
                                </div>
                                <div className="divide-y divide-border">
                                    {([1, 2, 3] as GymnasiumYear[]).map(gymYear => {
                                        const existing = getExistingTermDates(academicYear, gymYear);
                                        const termNames = getTermNames(gymYear);
                                        return (
                                            <div key={gymYear} className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-foreground">
                                                        År {gymYear}
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleStartEdit(academicYear, gymYear)}
                                                            className="text-sm px-3 py-1 bg-accent text-primary rounded hover:bg-accent/80 transition-colors"
                                                        >
                                                            {existing ? 'Redigera' : 'Lägg till'}
                                                        </button>
                                                        {existing && (
                                                            <button
                                                                onClick={() => handleDelete(existing.id)}
                                                                className="text-sm px-3 py-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                                                            >
                                                                Ta bort
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {existing ? (
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div className="p-2 bg-accent rounded">
                                                            <span className="text-accent-foreground font-medium">{termNames.fall}:</span>
                                                            <span className="text-muted-foreground ml-2">
                                                                {formatDate(existing.fallTermStart)} - {formatDate(existing.fallTermEnd)}
                                                            </span>
                                                        </div>
                                                        <div className="p-2 bg-primary/10 rounded">
                                                            <span className="text-primary font-medium">{termNames.spring}:</span>
                                                            <span className="text-muted-foreground ml-2">
                                                                {formatDate(existing.springTermStart)} - {formatDate(existing.springTermEnd)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        Terminstider ej inställda
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
