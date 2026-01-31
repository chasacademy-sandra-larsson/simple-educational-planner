import { useState } from 'react';
import { Calendar, Download, RefreshCw, Eye, Grid, Settings } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  term: string;
  year: string;
}

interface ScheduleViewProps {
  project: Project;
  onEditConfiguration?: () => void;
}

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'] as const;
type Weekday = typeof WEEKDAYS[number];
const TIME_SLOTS = [
  '08:00 - 09:00',
  '09:10 - 10:10',
  '10:20 - 11:20',
  '11:30 - 12:30',
  '13:10 - 14:10',
  '14:20 - 15:20',
  '15:30 - 16:30'
];

// Mock schedule data
const MOCK_SCHEDULE = {
  'TE21A': {
    'Måndag': [
      { subject: 'Matematik', teacher: 'Anna Andersson', room: 'A201' },
      { subject: 'Fysik', teacher: 'Bengt Berg', room: 'B103' },
      { subject: 'Svenska', teacher: 'Cecilia Carlsson', room: 'A305' },
      { subject: 'LUNCH', teacher: '', room: '' },
      { subject: 'Programmering', teacher: 'David Davidsson', room: 'D201' },
      { subject: 'Programmering', teacher: 'David Davidsson', room: 'D201' },
      null
    ],
    'Tisdag': [
      { subject: 'Engelska', teacher: 'Eva Eriksson', room: 'A302' },
      { subject: 'Matematik', teacher: 'Anna Andersson', room: 'A201' },
      { subject: 'Idrott', teacher: 'Fredrik Fransson', room: 'Gym' },
      { subject: 'LUNCH', teacher: '', room: '' },
      { subject: 'Webbutveckling', teacher: 'Gustav Gustafsson', room: 'D202' },
      { subject: 'Webbutveckling', teacher: 'Gustav Gustafsson', room: 'D202' },
      null
    ],
    'Onsdag': [
      { subject: 'Fysik', teacher: 'Bengt Berg', room: 'B103' },
      { subject: 'Kemi', teacher: 'Helena Hansson', room: 'B201' },
      { subject: 'Matematik', teacher: 'Anna Andersson', room: 'A201' },
      { subject: 'LUNCH', teacher: '', room: '' },
      { subject: 'Svenska', teacher: 'Cecilia Carlsson', room: 'A305' },
      { subject: 'Historia', teacher: 'Ingrid Isaksson', room: 'C102' },
      null
    ],
    'Torsdag': [
      { subject: 'Programmering', teacher: 'David Davidsson', room: 'D201' },
      { subject: 'Databaser', teacher: 'Johan Johansson', room: 'D203' },
      { subject: 'Engelska', teacher: 'Eva Eriksson', room: 'A302' },
      { subject: 'LUNCH', teacher: '', room: '' },
      { subject: 'Matematik', teacher: 'Anna Andersson', room: 'A201' },
      { subject: 'Fysik', teacher: 'Bengt Berg', room: 'B103' },
      null
    ],
    'Fredag': [
      { subject: 'Webbutveckling', teacher: 'Gustav Gustafsson', room: 'D202' },
      { subject: 'Svenska', teacher: 'Cecilia Carlsson', room: 'A305' },
      { subject: 'Samhällskunskap', teacher: 'Karl Karlsson', room: 'C201' },
      { subject: 'LUNCH', teacher: '', room: '' },
      { subject: 'Idrott', teacher: 'Fredrik Fransson', room: 'Gym' },
      null,
      null
    ]
  }
};

export function ScheduleView({ project, onEditConfiguration }: ScheduleViewProps) {
  const [selectedClass, setSelectedClass] = useState('TE21A');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const schedule = MOCK_SCHEDULE[selectedClass as keyof typeof MOCK_SCHEDULE];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl mb-2">{project.name}</h1>
            <p className="text-gray-600">Schema för {selectedClass}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Genererar...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Regenerera Schema
                </>
              )}
            </button>
            <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
              <Download className="w-5 h-5" />
              Exportera
            </button>
            {onEditConfiguration && (
              <button
                onClick={onEditConfiguration}
                className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
              >
                <Settings className="w-5 h-5" />
                Konfiguration
              </button>
            )}
          </div>
        </div>

        {/* Class Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700">Välj klass:</label>
            <div className="flex gap-2">
              {['TE21A', 'TE21B', 'NA21A'].map((className) => (
                <button
                  key={className}
                  onClick={() => setSelectedClass(className)}
                  className={`px-4 py-2 rounded-lg text-sm transition ${
                    selectedClass === className
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {className}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-4 text-left text-sm text-gray-700 w-32">
                    Tid
                  </th>
                  {WEEKDAYS.map((day) => (
                    <th
                      key={day}
                      className="px-4 py-4 text-left text-sm text-gray-700"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time, timeIndex) => (
                  <tr key={time} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-4 py-3 text-sm text-gray-600 bg-gray-50">
                      {time}
                    </td>
                    {WEEKDAYS.map((day) => {
                      const lesson = schedule?.[day as Weekday]?.[timeIndex];
                      const isLunch = lesson?.subject === 'LUNCH';
                      
                      return (
                        <td key={day} className="px-2 py-2">
                          {lesson ? (
                            <div
                              className={`p-3 rounded-lg text-sm ${
                                isLunch
                                  ? 'bg-orange-50 border border-orange-200'
                                  : 'bg-blue-50 border border-blue-200'
                              }`}
                            >
                              <div className={isLunch ? 'text-orange-700 font-medium' : 'text-blue-900 font-medium'}>
                                {lesson.subject}
                              </div>
                              {!isLunch && (
                                <>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {lesson.teacher}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Sal: {lesson.room}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="h-20"></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-6 mt-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl">32</p>
                <p className="text-sm text-gray-600">Lektioner/vecka</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Grid className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl">8</p>
                <p className="text-sm text-gray-600">Olika ämnen</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl">95%</p>
                <p className="text-sm text-gray-600">Schemaeffektivitet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}