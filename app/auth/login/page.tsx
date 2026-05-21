"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { api, ApiError } from '@/app/lib/api';
import { AuthLayout, AuthCard, AuthInput, AuthButton } from '@/app/components/auth/auth-layout';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.auth.login({ email, password });
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
            subtitle="Logga in på ditt konto"
        >
            <AuthCard>
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <AuthInput
                        label="E-postadress"
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@skola.se"
                    />

                    <AuthInput
                        label="Lösenord"
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <AuthButton
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Loggar in...' : 'Logga in'}
                        {!loading && <ChevronRight className="w-4 h-4" />}
                    </AuthButton>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Inget konto?{' '}
                        <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
                            Skapa ett nu
                        </Link>
                    </p>
                </div>
            </AuthCard>
        </AuthLayout>
    );
}
