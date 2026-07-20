import { useState } from 'react';
import { Clock, Calendar, Settings, AlertCircle, Plus, X, Edit2 } from 'lucide-react';

interface TermPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface CustomLessonDuration {
  id: string;
  subjectName: string;
  duration: number;
  reason?: string;
}

interface TimeSettings {
  // Term dates
  termPeriods: TermPeriod[];
  
  // Time settings
  earliestStart: string;
  latestEnd: string;
  standardLessonDuration: number;
  lunchDuration: number;
  earliestLunch: string;
  latestLunch: string;
  shortestBreak: number;
  longestBreak: number;
  mentorTimePerWeek: number;
  
  // Custom lesson durations
  customLessonDurations: CustomLessonDuration[];
}

interface TimeSettingsStepProps {
  data: TimeSettings | {};
  onChange: (data: TimeSettings) => void;
}

const WEEKDAYS = [
  { id: 'monday', label: 'Måndag' },
  { id: 'tuesday', label: 'Tisdag' },
  { id: 'wednesday', label: 'Onsdag' },
  { id: 'thursday', label: 'Torsdag' },
  { id: 'friday', label: 'Fredag' }
];

export function TimeSettingsStep({ data, onChange }: TimeSettingsStepProps) {
  const defaultSettings: TimeSettings = {
    termPeriods: [
      { id: '1', name: 'Hösttermin 2025', startDate: '2025-08-18', endDate: '2025-12-20' },
      { id: '2', name: 'Vårtermin 2026', startDate: '2026-01-08', endDate: '2026-06-12' }
    ],
    earliestStart: '08:00',
    latestEnd: '16:00',
    standardLessonDuration: 60,
    lunchDuration: 45,
    earliestLunch: '11:00',
    latestLunch: '13:00',
    shortestBreak: 5,
    longestBreak: 60,
    mentorTimePerWeek: 30,
    customLessonDurations: []
  };

  const [settings, setSettings] = useState<TimeSettings>({
    ...defaultSettings,
    ...(data && Object.keys(data).length > 0 ? data as TimeSettings : {})
  });

  const [showAddCustomLesson, setShowAddCustomLesson] = useState(false);
  const [showEditTimeSettings, setShowEditTimeSettings] = useState(false);
  const [customLessonForm, setCustomLessonForm] = useState({
    subjectName: '',
    duration: 90,
    reason: ''
  });

  const handleChange = (field: keyof TimeSettings, value: any) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    onChange(updated);
  };

  const updateTermPeriod = (id: string, field: keyof TermPeriod, value: string) => {
    const updated = settings.termPeriods.map(term => 
      term.id === id ? { ...term, [field]: value } : term
    );
    handleChange('termPeriods', updated);
  };

  const addCustomLessonDuration = () => {
    if (!customLessonForm.subjectName || !customLessonForm.duration) return;
    
    const newCustom: CustomLessonDuration = {
      id: Date.now().toString(),
      subjectName: customLessonForm.subjectName,
      duration: customLessonForm.duration,
      reason: customLessonForm.reason
    };
    
    handleChange('customLessonDurations', [...settings.customLessonDurations, newCustom]);
    setCustomLessonForm({ subjectName: '', duration: 90, reason: '' });
    setShowAddCustomLesson(false);
  };

  const removeCustomLessonDuration = (id: string) => {
    handleChange('customLessonDurations', settings.customLessonDurations.filter(c => c.id !== id));
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Tid- och Datuminställningar</h2>
        <p className="text-muted-foreground">
          Konfigurera läsårets terminer, lektionstider och anpassningar
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. TERMINSTIDER FÖR KOMMANDE LÄSÅR */}
        <div className="bg-accent rounded-xl p-6 border-2 border-primary">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Terminstider för läsåret</h3>
              <p className="text-sm text-muted-foreground">Definiera start och slut för terminerna</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {settings.termPeriods.map((term) => (
              <div key={term.id} className="bg-card rounded-lg p-4 border border-primary">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-foreground font-medium">Terminsnamn</label>
                    <input
                      type="text"
                      value={term.name}
                      onChange={(e) => updateTermPeriod(term.id, 'name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                      placeholder="t.ex. Hösttermin 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-foreground font-medium">Startdatum</label>
                    <input
                      type="date"
                      value={term.startDate}
                      onChange={(e) => updateTermPeriod(term.id, 'startDate', e.target.value)}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-foreground font-medium">Slutdatum</label>
                    <input
                      type="date"
                      value={term.endDate}
                      onChange={(e) => updateTermPeriod(term.id, 'endDate', e.target.value)}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. TIDSINSTÄLLNINGAR */}
        <div className="bg-muted rounded-xl p-6 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Tidsinställningar</h3>
                <p className="text-sm text-muted-foreground">Konfigurera tidsramar för schemaläggaren</p>
              </div>
            </div>
            <button
              onClick={() => setShowEditTimeSettings(!showEditTimeSettings)}
              className="flex items-center gap-2 px-4 py-2 text-accent-foreground bg-card border border-border rounded-lg hover:bg-muted transition"
            >
              <Edit2 className="w-4 h-4" />
              Redigera
            </button>
          </div>

          {!showEditTimeSettings ? (
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Lektioner</h4>
                  <div className="space-y-2 text-sm text-foreground">
                    <p>Tidigast start: <span className="font-medium">{settings.earliestStart}</span></p>
                    <p>Senast slut: <span className="font-medium">{settings.latestEnd}</span></p>
                    <p>Standard längd: <span className="font-medium">{settings.standardLessonDuration} min</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Lunch</h4>
                  <div className="space-y-2 text-sm text-foreground">
                    <p>Längd: <span className="font-medium">{settings.lunchDuration} min</span></p>
                    <p>Tidigast lunch: <span className="font-medium">{settings.earliestLunch}</span></p>
                    <p>Senast lunch: <span className="font-medium">{settings.latestLunch}</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Raster</h4>
                  <div className="space-y-2 text-sm text-foreground">
                    <p>Kortast rast: <span className="font-medium">{settings.shortestBreak} min</span></p>
                    <p>Längst rast: <span className="font-medium">{settings.longestBreak} min</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Övrigt</h4>
                  <div className="space-y-2 text-sm text-foreground">
                    <p>Mentorstid per vecka: <span className="font-medium">{settings.mentorTimePerWeek} min</span></p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="space-y-6">
                {/* Lektioner */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Lektioner</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Tidigast start</label>
                      <input
                        type="time"
                        value={settings.earliestStart}
                        onChange={(e) => handleChange('earliestStart', e.target.value)}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Senast slut</label>
                      <input
                        type="time"
                        value={settings.latestEnd}
                        onChange={(e) => handleChange('latestEnd', e.target.value)}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Standard längd (minuter)</label>
                      <input
                        type="number"
                        value={settings.standardLessonDuration}
                        onChange={(e) => handleChange('standardLessonDuration', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        min="30"
                        max="120"
                      />
                    </div>
                  </div>
                </div>

                {/* Lunch */}
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-foreground mb-3">Lunch</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Längd (minuter)</label>
                      <input
                        type="number"
                        value={settings.lunchDuration}
                        onChange={(e) => handleChange('lunchDuration', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        min="20"
                        max="90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Tidigast lunch</label>
                      <input
                        type="time"
                        value={settings.earliestLunch}
                        onChange={(e) => handleChange('earliestLunch', e.target.value)}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Senast lunch</label>
                      <input
                        type="time"
                        value={settings.latestLunch}
                        onChange={(e) => handleChange('latestLunch', e.target.value)}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                      />
                    </div>
                  </div>
                </div>

                {/* Raster */}
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-foreground mb-3">Raster</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Kortast rast (minuter)</label>
                      <input
                        type="number"
                        value={settings.shortestBreak}
                        onChange={(e) => handleChange('shortestBreak', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        min="0"
                        max="30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Längst rast (minuter)</label>
                      <input
                        type="number"
                        value={settings.longestBreak}
                        onChange={(e) => handleChange('longestBreak', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        min="5"
                        max="90"
                      />
                    </div>
                  </div>
                </div>

                {/* Övrigt */}
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-foreground mb-3">Övrigt</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-foreground">Mentorstid per vecka (minuter)</label>
                      <input
                        type="number"
                        value={settings.mentorTimePerWeek}
                        onChange={(e) => handleChange('mentorTimePerWeek', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        min="0"
                        max="120"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setShowEditTimeSettings(false)}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                  >
                    Spara inställningar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. ANPASSADE LEKTIONER */}
        <div className="bg-accent rounded-xl p-6 border-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Anpassade lektioner</h3>
                <p className="text-sm text-muted-foreground">Ämnen som kräver längre eller kortare lektionstider</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddCustomLesson(!showAddCustomLesson)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              Lägg till
            </button>
          </div>

          {showAddCustomLesson && (
            <div className="bg-card rounded-lg p-4 border-2 border-border mb-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-2 text-foreground font-medium">Ämnesnamn</label>
                  <input
                    type="text"
                    value={customLessonForm.subjectName}
                    onChange={(e) => setCustomLessonForm({ ...customLessonForm, subjectName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="t.ex. Idrott"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-foreground font-medium">Lektionstid (minuter)</label>
                  <input
                    type="number"
                    value={customLessonForm.duration}
                    onChange={(e) => setCustomLessonForm({ ...customLessonForm, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    min="30"
                    max="180"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-foreground font-medium">Anledning (valfritt)</label>
                  <input
                    type="text"
                    value={customLessonForm.reason}
                    onChange={(e) => setCustomLessonForm({ ...customLessonForm, reason: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="t.ex. Byte i omklädningsrum och dusch"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addCustomLessonDuration}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition font-medium"
                  >
                    Lägg till anpassning
                  </button>
                  <button
                    onClick={() => setShowAddCustomLesson(false)}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          )}

          {settings.customLessonDurations.length > 0 ? (
            <div className="space-y-2">
              {settings.customLessonDurations.map((custom) => (
                <div key={custom.id} className="bg-card rounded-lg p-4 border border-border flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-foreground">{custom.subjectName}</h4>
                      <span className="px-3 py-1 bg-accent text-accent-foreground text-sm font-medium rounded-full">
                        {custom.duration} min
                      </span>
                      <span className="text-sm text-muted-foreground">
                        (standard: {settings.standardLessonDuration} min)
                      </span>
                    </div>
                    {custom.reason && (
                      <p className="text-sm text-muted-foreground mt-1">💡 {custom.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeCustomLessonDuration(custom.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg p-6 border border-border text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Inga anpassade lektioner ännu. Använd knappen ovan för att lägga till ämnen med avvikande lektionstider.
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-primary/10 rounded-xl p-6 border-2 border-primary">
          <h3 className="text-lg font-semibold text-foreground mb-3">Sammanfattning</h3>
          <div className="space-y-2 text-sm text-foreground">
            <p>📅 Terminer: {settings.termPeriods.map(t => t.name).join(', ')}</p>
            <p>⏰ Lektionstider: {settings.earliestStart} - {settings.latestEnd}</p>
            <p>📚 Standard lektionstid: {settings.standardLessonDuration} min</p>
            <p>🍽️ Lunch: {settings.lunchDuration} min (kl {settings.earliestLunch} - {settings.latestLunch})</p>
            <p>☕ Raster: {settings.shortestBreak} - {settings.longestBreak} min</p>
            <p>👥 Mentorstid: {settings.mentorTimePerWeek} min/vecka</p>
            {settings.customLessonDurations.length > 0 && (
              <p>⚙️ Anpassade lektioner: {settings.customLessonDurations.length} ämne(n)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}