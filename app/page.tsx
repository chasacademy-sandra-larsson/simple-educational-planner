"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { Calendar, Users, BookOpen, Sparkles, ChevronRight, Clock, CheckCircle, TrendingUp, DoorOpen, ClipboardList } from 'lucide-react';


export default function LandingPage() {
    const features = [
        {
          icon: Sparkles,
          title: 'Guidad Onboarding',
          description: 'Steg-för-steg wizard som guidar dig genom hela konfigurationen utan risk för dataförlust.',
          color: 'bg-purple-100 text-purple-600'
        },
        {
          icon: ClipboardList,
          title: 'Poängbaserat System',
          description: 'Modernare tilldelning med poäng istället för timmar. Heltid = 600p, kurser 50-150p.',
          color: 'bg-blue-100 text-blue-600'
        },
        {
          icon: Users,
          title: 'Smart Resursanalys',
          description: 'Automatisk analys av lärarbehov och kapacitet med OR-Tools optimering.',
          color: 'bg-green-100 text-green-600'
        },
        {
          icon: BookOpen,
          title: 'Ämnesbehörigheter',
          description: 'Koppla lärare till ämnesområden och kurser med intelligent matchning.',
          color: 'bg-orange-100 text-orange-600'
        },
        {
          icon: Clock,
          title: 'Flexibel Tidskonfiguration',
          description: 'Anpassa tider, pass och terminer efter din skolas behov.',
          color: 'bg-indigo-100 text-indigo-600'
        },
        {
          icon: DoorOpen,
          title: 'Salhantering',
          description: 'Konfigurera salar med kapacitet och utrustning för optimal tilldelning.',
          color: 'bg-pink-100 text-pink-600'
        }
      ];
    
      const steps = [
        {
          number: '01',
          title: 'Skapa Klasser',
          description: 'Lägg till klasser och planera kurserna för terminen'
        },
        {
          number: '02',
          title: 'Lägg till Lärare',
          description: 'Registrera lärare med ämnesbehörigheter och tjänstgöringsgrad'
        },
        {
          number: '03',
          title: 'Fördela Tjänster',
          description: 'Tilldela lärare till kurser och mentorskap med poängsystem'
        },
        {
          number: '04',
          title: 'Konfigurera Tid & Salar',
          description: 'Ställ in tider och konfigurera tillgängliga salar'
        },
        {
          number: '05',
          title: 'Generera Schema',
          description: 'Låt systemet skapa ett optimerat schema automatiskt'
        }
      ];

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
              {/* Navigation */}
                <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-semibold">Schemaläggning</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/auth/login')}
                            className="px-5 py-2 text-gray-700 hover:text-gray-900 transition"
                        >
                        Logga in
                        </button>
                        <button
                            onClick={() => router.push('/auth/register')}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                        Registrera dig
                        </button>
                    </div>
                    </div>
                </nav>
                
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              Intelligent schemaläggning för gymnasieskolor
            </div>
            <h1 className="text-5xl mb-6 leading-tight">
              Skapa perfekta schema med automatisk optimering
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              En komplett lösning för gymnasieskoladministratörer som kombinerar guidad konfiguration, 
              poängbaserad tjänstefördelning och automatisk schemaläggning med OR-Tools.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/auth/register')}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
              >
                Kom igång gratis
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition"
              >
                Se demo
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-gray-200">
              <div>
                <div className="text-3xl font-semibold text-blue-600 mb-1">600</div>
                <div className="text-sm text-gray-600">Poäng per heltid</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-blue-600 mb-1">5</div>
                <div className="text-sm text-gray-600">Enkla steg</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-blue-600 mb-1">100%</div>
                <div className="text-sm text-gray-600">Automatiserad optimering</div>
              </div>
            </div>
          </div>
          
          {/* Hero Visual */}
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">Klasser & Kurser</div>
                    <div className="text-xs text-gray-600">12 klasser • 48 kurser</div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">Lärare & Behörighet</div>
                    <div className="text-xs text-gray-600">28 lärare • 15 ämnesområden</div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">Schema Genereras</div>
                    <div className="text-xs text-gray-600">Optimering pågår...</div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-200 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-60"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4">Kraftfulla funktioner för modern schemaläggning</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Allt du behöver för att skapa optimerade schema för din gymnasieskola
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition">
                  <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl mb-4">Så här fungerar det</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Från start till färdigt schema på fem enkla steg
          </p>
        </div>
        
        <div className="grid md:grid-cols-5 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-blue-300 transition h-full">
                <div className="text-5xl font-bold text-blue-100 mb-3">{step.number}</div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-blue-200 z-10"></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="max-w-4xl mx-auto px-8 text-center text-white">
          <h2 className="text-4xl mb-6">Redo att skapa ditt första schema?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Kom igång på några minuter med vår guidade onboarding. Ingen kreditkort krävs.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => router.push('/auth/register')}
              className="flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-gray-50 transition shadow-lg hover:shadow-xl font-semibold"
            >
              Skapa ditt konto nu
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              className="px-8 py-4 border-2 border-white/30 text-white rounded-xl hover:bg-white/10 transition"
            >
              Har redan konto
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold">Schemaläggning</span>
            </div>
            <div className="text-sm">
              © 2026 Schemaläggning. Byggd för gymnasieskolor.
            </div>
          </div>
        </div>
      </footer>
    </div>
    );
}
