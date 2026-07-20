"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { api, ApiError } from '@/app/lib/api';
import { AuthLayout, AuthCard, AuthInput, AuthButton, StepIndicator } from '@/app/components/auth/auth-layout';

export default function RegisterPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        school: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const updateFormData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleStepOne = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password.length < 6) {
            setError('Lösenordet måste vara minst 6 tecken');
            return;
        }

        setCurrentStep(2);
    };

    const handleStepTwo = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.auth.register({
                email: formData.email,
                password: formData.password,
                name: formData.name,
            });
            router.push('/dashboard');
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Ett oväntat fel uppstod');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Schemaläggning"
            subtitle="Skapa ditt konto för att komma igång"
        >
            <StepIndicator currentStep={currentStep} totalSteps={2} />

            <AuthCard>
                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Step 1: Account Details */}
                {currentStep === 1 && (
                    <form onSubmit={handleStepOne} className="space-y-5">
                        <AuthInput
                            label="E-postadress"
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => updateFormData('email', e.target.value)}
                            placeholder="admin@skola.se"
                        />

                        <AuthInput
                            label="Lösenord"
                            id="password"
                            type="password"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) => updateFormData('password', e.target.value)}
                            placeholder="Minst 6 tecken"
                        />

                        <AuthButton type="submit" className="w-full">
                            Fortsätt
                            <ChevronRight className="w-4 h-4" />
                        </AuthButton>
                    </form>
                )}

                {/* Step 2: Profile Details */}
                {currentStep === 2 && (
                    <form onSubmit={handleStepTwo} className="space-y-5">
                        <AuthInput
                            label="Ditt namn"
                            id="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => updateFormData('name', e.target.value)}
                            placeholder="Anna Andersson"
                        />

                        <AuthInput
                            label="Skola"
                            id="school"
                            type="text"
                            required
                            value={formData.school}
                            onChange={(e) => updateFormData('school', e.target.value)}
                            placeholder="Stockholms Gymnasium"
                        />

                        <div className="flex gap-3">
                            <AuthButton
                                type="button"
                                variant="secondary"
                                onClick={() => setCurrentStep(1)}
                                className="flex-1"
                            >
                                Tillbaka
                            </AuthButton>
                            <AuthButton
                                type="submit"
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? 'Skapar...' : 'Skapa konto'}
                            </AuthButton>
                        </div>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Har du redan ett konto?{' '}
                        <Link href="/auth/login" className="text-primary hover:underline font-medium">
                            Logga in
                        </Link>
                    </p>
                </div>
            </AuthCard>
        </AuthLayout>
    );
}
