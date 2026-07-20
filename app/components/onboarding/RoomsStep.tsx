import { useState } from 'react';
import { Plus, Trash2, DoorOpen, Upload, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

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
        toast.error('Kunde inte importera filen. Kontrollera formatet.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Salar och Faciliteter</h2>
        <p className="text-muted-foreground">
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
                ? 'bg-accent text-primary border-2 border-primary'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
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
                ? 'bg-primary/10 text-primary border-2 border-primary'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Upload className="w-4 h-4" />
            Importera från fil
          </button>
        </div>

        {/* Add Room Form - Inline */}
        {showAddRoom && (
          <div className="bg-accent rounded-xl p-6 border-2 border-primary">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Lägg till ny sal</h3>
              <button
                onClick={() => {
                  setShowAddRoom(false);
                  setRoomForm({ name: '', capacity: 30, subject: '' });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-foreground font-medium">Salnamn</label>
                  <input
                    type="text"
                    value={roomForm.name}
                    onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    placeholder="t.ex. A101 eller Kemisalen"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-foreground font-medium">Kapacitet (antal platser)</label>
                  <input
                    type="number"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    min="1"
                    max="200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-foreground font-medium">
                  Ämnessal (valfritt)
                </label>
                <select
                  value={roomForm.subject}
                  onChange={(e) => setRoomForm({ ...roomForm, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                >
                  <option value="">Inget specifikt ämne</option>
                  {SUBJECT_ROOMS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Välj om salen är kopplad till ett specifikt ämne (t.ex. Kemi, Fysik, Biologi)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddRoom(false);
                    setRoomForm({ name: '', capacity: 30, subject: '' });
                  }}
                  className="px-6 py-2.5 bg-background border border-border text-foreground rounded-lg hover:bg-muted transition"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleAddRoom}
                  disabled={!roomForm.name}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lägg till sal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Form - Inline */}
        {showImport && (
          <div className="bg-primary/10 rounded-xl p-6 border-2 border-primary">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Importera salar från fil</h3>
              <button
                onClick={() => setShowImport(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-card rounded-lg p-4 mb-4 border border-primary">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Format för CSV/TXT-fil:</p>
                  <p className="text-foreground mb-2">Varje rad: <code className="bg-muted px-2 py-0.5 rounded">Salnamn, Kapacitet, Ämne (valfritt)</code></p>
                  <p className="text-foreground mb-2">Exempel:</p>
                  <div className="bg-muted rounded px-3 py-2 font-mono text-xs text-foreground">
                    A101, 30<br/>
                    Kemisalen, 24, Kemi<br/>
                    Fysiksalen, 28, Fysik<br/>
                    B205, 32
                  </div>
                </div>
              </div>
            </div>

            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-primary rounded-xl p-8 text-center hover:border-primary hover:bg-primary/10 transition bg-card">
                <Upload className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">Klicka för att välja fil</p>
                <p className="text-sm text-muted-foreground">CSV eller TXT-fil</p>
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
          <div className="bg-accent rounded-xl p-6 border-2 border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Översikt</h3>
                <p className="text-sm text-muted-foreground">
                  {rooms.length} salar • Total kapacitet: {rooms.reduce((sum, r) => sum + r.capacity, 0)} platser
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rooms List */}
        {rooms.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted">
            <DoorOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Inga salar tillagda än</p>
            <p className="text-sm text-muted-foreground mt-1">Använd knapparna ovan för att lägga till salar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      room.subject ? 'bg-accent' : 'bg-muted'
                    }`}>
                      <DoorOpen className={`w-6 h-6 ${
                        room.subject ? 'text-accent-foreground' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Kapacitet: {room.capacity} platser
                      </p>
                      {room.subject && (
                        <span className="inline-block mt-2 px-3 py-1 bg-accent text-accent-foreground rounded-full text-xs font-medium">
                          {room.subject}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="text-muted-foreground hover:text-destructive transition flex-shrink-0 ml-2"
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
