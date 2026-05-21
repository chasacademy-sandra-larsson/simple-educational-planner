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
        <p className="text-gray-600">
          Konfigurera läsårets terminer, lektionstider och anpassningar
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. TERMINSTIDER FÖR KOMMANDE LÄSÅR */}
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Terminstider för läsåret</h3>
              <p className="text-sm text-gray-600">Definiera start och slut för terminerna</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {settings.termPeriods.map((term) => (
              <div key={term.id} className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700 font-medium">Terminsnamn</label>
                    <input
                      type="text"
                      value={term.name}
                      onChange={(e) => updateTermPeriod(term.id, 'name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="t.ex. Hösttermin 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-700 font-medium">Startdatum</label>
                    <input
                      type="date"
                      value={term.startDate}
                      onChange={(e) => updateTermPeriod(term.id, 'startDate', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-700 font-medium">Slutdatum</label>
                    <input
                      type="date"
                      value={term.endDate}
                      onChange={(e) => updateTermPeriod(term.id, 'endDate', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. TIDSINSTÄLLNINGAR */}
        <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tidsinställningar</h3>
                <p className="text-sm text-gray-600">Konfigurera tidsramar för schemaläggaren</p>
              </div>
            </div>
            <button
              onClick={() => setShowEditTimeSettings(!showEditTimeSettings)}
              className="flex items-center gap-2 px-4 py-2 text-purple-700 bg-white border border-purple-300 rounded-lg hover:bg-purple-100 transition"
            >
              <Edit2 className="w-4 h-4" />
              Redigera
            </button>
          </div>

          {!showEditTimeSettings ? (
            <div className="bg-white rounded-lg p-6 border border-purple-200">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Lektioner</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Tidigast start: <span className="font-medium">{settings.earliestStart}</span></p>
                    <p>Senast slut: <span className="font-medium">{settings.latestEnd}</span></p>
                    <p>Standard längd: <span className="font-medium">{settings.standardLessonDuration} min</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Lunch</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Längd: <span className="font-medium">{settings.lunchDuration} min</span></p>
                    <p>Tidigast lunch: <span className="font-medium">{settings.earliestLunch}</span></p>
                    <p>Senast lunch: <span className="font-medium">{settings.latestLunch}</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Raster</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Kortast rast: <span className="font-medium">{settings.shortestBreak} min</span></p>
                    <p>Längst rast: <span className="font-medium">{settings.longestBreak} min</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Övrigt</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Mentorstid per vecka: <span className="font-medium">{settings.mentorTimePerWeek} min</span></p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 border border-purple-200">
              <div className="space-y-6">
                {/* Lektioner */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Lektioner</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Tidigast start</label>
                      <input
                        type="time"
                        value={settings.earliestStart}
                        onChange={(e) => handleChange('earliestStart', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Senast slut</label>
                      <input
                        type="time"
                        value={settings.latestEnd}
                        onChange={(e) => handleChange('latestEnd', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Standard längd (minuter)</label>
                      <input
                        type="number"
                        value={settings.standardLessonDuration}
                        onChange={(e) => handleChange('standardLessonDuration', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="30"
                        max="120"
                      />
                    </div>
                  </div>
                </div>

                {/* Lunch */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Lunch</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Längd (minuter)</label>
                      <input
                        type="number"
                        value={settings.lunchDuration}
                        onChange={(e) => handleChange('lunchDuration', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="20"
                        max="90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Tidigast lunch</label>
                      <input
                        type="time"
                        value={settings.earliestLunch}
                        onChange={(e) => handleChange('earliestLunch', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Senast lunch</label>
                      <input
                        type="time"
                        value={settings.latestLunch}
                        onChange={(e) => handleChange('latestLunch', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Raster */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Raster</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Kortast rast (minuter)</label>
                      <input
                        type="number"
                        value={settings.shortestBreak}
                        onChange={(e) => handleChange('shortestBreak', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                        max="30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Längst rast (minuter)</label>
                      <input
                        type="number"
                        value={settings.longestBreak}
                        onChange={(e) => handleChange('longestBreak', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="5"
                        max="90"
                      />
                    </div>
                  </div>
                </div>

                {/* Övrigt */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Övrigt</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-gray-700">Mentorstid per vecka (minuter)</label>
                      <input
                        type="number"
                        value={settings.mentorTimePerWeek}
                        onChange={(e) => handleChange('mentorTimePerWeek', parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                        max="120"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setShowEditTimeSettings(false)}
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    Spara inställningar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. ANPASSADE LEKTIONER */}
        <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Anpassade lektioner</h3>
                <p className="text-sm text-gray-600">Ämnen som kräver längre eller kortare lektionstider</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddCustomLesson(!showAddCustomLesson)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              <Plus className="w-4 h-4" />
              Lägg till
            </button>
          </div>

          {showAddCustomLesson && (
            <div className="bg-white rounded-lg p-4 border-2 border-orange-300 mb-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-2 text-gray-700 font-medium">Ämnesnamn</label>
                  <input
                    type="text"
                    value={customLessonForm.subjectName}
                    onChange={(e) => setCustomLessonForm({ ...customLessonForm, subjectName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="t.ex. Idrott"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 font-medium">Lektionstid (minuter)</label>
                  <input
                    type="number"
                    value={customLessonForm.duration}
                    onChange={(e) => setCustomLessonForm({ ...customLessonForm, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="30"
                    max="180"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 font-medium">Anledning (valfritt)</label>
                  <input
                    type="text"
                    value={customLessonForm.reason}
                    onChange={(e) => setCustomLessonForm({ ...customLessonForm, reason: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="t.ex. Byte i omklädningsrum och dusch"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addCustomLessonDuration}
                    className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition font-medium"
                  >
                    Lägg till anpassning
                  </button>
                  <button
                    onClick={() => setShowAddCustomLesson(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
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
                <div key={custom.id} className="bg-white rounded-lg p-4 border border-orange-200 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{custom.subjectName}</h4>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full">
                        {custom.duration} min
                      </span>
                      <span className="text-sm text-gray-500">
                        (standard: {settings.standardLessonDuration} min)
                      </span>
                    </div>
                    {custom.reason && (
                      <p className="text-sm text-gray-600 mt-1">💡 {custom.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeCustomLessonDuration(custom.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 border border-orange-200 text-center">
              <AlertCircle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">
                Inga anpassade lektioner ännu. Använd knappen ovan för att lägga till ämnen med avvikande lektionstider.
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Sammanfattning</h3>
          <div className="space-y-2 text-sm text-gray-700">
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