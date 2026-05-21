import { useState } from 'react';
import { Plus, Trash2, DoorOpen, Upload, AlertCircle, X } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  capacity: number;
  subject?: string; // Valfritt: vilket ämne salen tillhör (t.ex. Kemi, Fysik)
}

interface RoomsStepProps {
  data: Room[];
  onChange: (data: Room[]) => void;
}

const SUBJECT_ROOMS = [
  'Kemi',
  'Fysik',
  'Biologi',
  'Musik',
  'Idrott',
  'Bild',
  'Hemkunskap',
  'Slöjd',
  'Teknik'
];

export function RoomsStep({ data, onChange }: RoomsStepProps) {
  const [rooms, setRooms] = useState<Room[]>(data.length > 0 ? data : []);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: '',
    capacity: 30,
    subject: ''
  });

  const handleAddRoom = () => {
    if (!roomForm.name) return;

    const newRoom: Room = {
      id: Date.now().toString(),
      name: roomForm.name,
      capacity: roomForm.capacity,
      subject: roomForm.subject || undefined
    };
    const updated = [...rooms, newRoom];
    setRooms(updated);
    onChange(updated);
    setShowAddRoom(false);
    setRoomForm({ name: '', capacity: 30, subject: '' });
  };

  const handleDeleteRoom = (roomId: string) => {
    const updated = rooms.filter(r => r.id !== roomId);
    setRooms(updated);
    onChange(updated);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header if present
        const startIndex = lines[0].toLowerCase().includes('namn') || 
                          lines[0].toLowerCase().includes('kapacitet') ? 1 : 0;
        
        const importedRooms: Room[] = [];
        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(/[,;\t]/).map(p => p.trim());
          if (parts.length >= 2) {
            importedRooms.push({
              id: `${Date.now()}-${i}`,
              name: parts[0],
              capacity: parseInt(parts[1]) || 30,
              subject: parts[2] || undefined
            });
          }
        }

        if (importedRooms.length > 0) {
          const updated = [...rooms, ...importedRooms];
          setRooms(updated);
          onChange(updated);
          setShowImport(false);
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Kunde inte importera filen. Kontrollera formatet.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Salar och Faciliteter</h2>
        <p className="text-gray-600">
          Skapa salar manuellt eller importera från fil
        </p>
      </div>

      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowAddRoom(!showAddRoom);
              setShowImport(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              showAddRoom 
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            Lägg till sal
          </button>
          <button
            onClick={() => {
              setShowImport(!showImport);
              setShowAddRoom(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              showImport 
                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Importera från fil
          </button>
        </div>

        {/* Add Room Form - Inline */}
        {showAddRoom && (
          <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Lägg till ny sal</h3>
              <button
                onClick={() => {
                  setShowAddRoom(false);
                  setRoomForm({ name: '', capacity: 30, subject: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700 font-medium">Salnamn</label>
                  <input
                    type="text"
                    value={roomForm.name}
                    onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="t.ex. A101 eller Kemisalen"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700 font-medium">Kapacitet (antal platser)</label>
                  <input
                    type="number"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    min="1"
                    max="200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700 font-medium">
                  Ämnessal (valfritt)
                </label>
                <select
                  value={roomForm.subject}
                  onChange={(e) => setRoomForm({ ...roomForm, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Inget specifikt ämne</option>
                  {SUBJECT_ROOMS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Välj om salen är kopplad till ett specifikt ämne (t.ex. Kemi, Fysik, Biologi)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddRoom(false);
                    setRoomForm({ name: '', capacity: 30, subject: '' });
                  }}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleAddRoom}
                  disabled={!roomForm.name}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lägg till sal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Form - Inline */}
        {showImport && (
          <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Importera salar från fil</h3>
              <button
                onClick={() => setShowImport(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900 mb-1">Format för CSV/TXT-fil:</p>
                  <p className="text-gray-700 mb-2">Varje rad: <code className="bg-gray-100 px-2 py-0.5 rounded">Salnamn, Kapacitet, Ämne (valfritt)</code></p>
                  <p className="text-gray-700 mb-2">Exempel:</p>
                  <div className="bg-gray-50 rounded px-3 py-2 font-mono text-xs text-gray-800">
                    A101, 30<br/>
                    Kemisalen, 24, Kemi<br/>
                    Fysiksalen, 28, Fysik<br/>
                    B205, 32
                  </div>
                </div>
              </div>
            </div>

            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-green-300 rounded-xl p-8 text-center hover:border-green-500 hover:bg-green-100/50 transition bg-white">
                <Upload className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-1">Klicka för att välja fil</p>
                <p className="text-sm text-gray-600">CSV eller TXT-fil</p>
              </div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Summary Card */}
        {rooms.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Översikt</h3>
                <p className="text-sm text-gray-600">
                  {rooms.length} salar • Total kapacitet: {rooms.reduce((sum, r) => sum + r.capacity, 0)} platser
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rooms List */}
        {rooms.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <DoorOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Inga salar tillagda än</p>
            <p className="text-sm text-gray-500 mt-1">Använd knapparna ovan för att lägga till salar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      room.subject ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <DoorOpen className={`w-6 h-6 ${
                        room.subject ? 'text-purple-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{room.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Kapacitet: {room.capacity} platser
                      </p>
                      {room.subject && (
                        <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {room.subject}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="text-gray-400 hover:text-red-600 transition flex-shrink-0 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
