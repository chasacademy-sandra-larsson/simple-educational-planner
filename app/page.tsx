-"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';

export default function LandingPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // If user is already logged in, redirect to dashboard
        const user = api.auth.getCurrentUser();
        if (user) {
            router.push('/dashboard');
        }
    }, [router]);

    if (!mounted) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-800">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🎓</span>
                            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                Educational Planner
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/auth/login')}
                                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                Logga in
                            </button>
                            <button
                                onClick={() => router.push('/auth/register')}
                                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Registrera
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-16">
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Hero Illustration */}
                        <div className="mb-8 flex justify-center">
                            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                                <span className="text-6xl">🗓️</span>
                            </div>
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
                            Planera gymnasieschemat smidigt
                        </h1>
                        
                        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">
                            Ett komplett verktyg för utbildningsplanering med kurser, 
                            tjänstefördelning och automatisk schemaläggning
                        </p>

                        <button
                            onClick={() => router.push('/auth/register')}
                            className="px-8 py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            🚀 Kom igång gratis
                        </button>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-800/50">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-12">
                            Allt du behöver för utbildningsplanering
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Feature 1 */}
                            <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                                    <span className="text-2xl">📚</span>
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                    Kursplaner
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Planera kurser per termin med drag-and-drop. Validera poäng automatiskt.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                    Tjänstefördelning
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Fördela tjänster enkelt. Se överblick av lärarbelastning per läsår.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                                    <span className="text-2xl">🏫</span>
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                    Salar
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Hantera lokaler och kapacitet. Undvik dubbelbokningar automatiskt.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                                    <span className="text-2xl">📅</span>
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                    Schemaläggning
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Generera schema automatiskt med AI-optimering. Exportera till olika format.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
                            Redo att börja planera?
                        </h2>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
                            Skapa ditt konto idag och börja planera nästa läsårs schema på några minuter.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => router.push('/auth/register')}
                                className="px-6 py-3 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Skapa konto
                            </button>
                            <button
                                onClick={() => router.push('/auth/login')}
                                className="px-6 py-3 font-semibold border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Logga in
                            </button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="max-w-7xl mx-auto text-center">
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">
                            © 2026 Educational Planner. Ett verktyg för svenska gymnasieskolor.
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    );
}
