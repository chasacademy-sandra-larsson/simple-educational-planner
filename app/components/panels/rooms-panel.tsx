"use client";

import { useState, useRef } from 'react';
import { Plus, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/app/lib/api';
import type { CreateRoomRequest } from '@/app/lib/api/types';
import { useProject } from '@/app/projects/[id]/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RoomsPanel() {
    const { projectId, rooms, fetchRooms } = useProject();

    const [showRoomForm, setShowRoomForm] = useState(false);
    const [newRoom, setNewRoom] = useState<CreateRoomRequest>({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [roomError, setRoomError] = useState('');
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // CSV-import (skördad ur wizardens RoomsStep): salsnummer, kapacitet, [typ]
    // Varje rad sparas direkt via API:t (inkrementell sparning).
    const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            setImporting(true);
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());
                const startIndex = lines[0]?.toLowerCase().includes('namn') ||
                    lines[0]?.toLowerCase().includes('kapacitet') ? 1 : 0;

                let created = 0;
                let skipped = 0;
                for (let i = startIndex; i < lines.length; i++) {
                    const parts = lines[i].split(/[,;\t]/).map(p => p.trim());
                    if (parts.length < 1 || !parts[0]) { skipped++; continue; }
                    try {
                        await api.rooms.create(projectId, {
                            roomNumber: parts[0],
                            capacity: parseInt(parts[1]) || 30,
                            roomType: parts[2] || undefined,
                        });
                        created++;
                    } catch {
                        skipped++;
                    }
                }

                await fetchRooms();
                if (created > 0) toast.success(`${created} salar importerade`);
                if (skipped > 0) toast.warning(`${skipped} rader hoppades över`);
            } catch {
                toast.error('Kunde inte läsa filen. Kontrollera formatet.');
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingRoom(true);
        setRoomError('');

        try {
            await api.rooms.create(projectId, newRoom);
            setShowRoomForm(false);
            setNewRoom({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
            await fetchRooms();
        } catch (err) {
            if (err instanceof ApiError) {
                setRoomError(err.message);
            } else {
                setRoomError('Failed to create room');
            }
        } finally {
            setCreatingRoom(false);
        }
    };

    const resetForm = () => {
        setShowRoomForm(false);
        setNewRoom({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
        setRoomError('');
    };

    return (
        <div>
            {/* Create Room Form */}
            <div className="mb-6">
                {!showRoomForm ? (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 h-auto p-4 border-2 border-dashed"
                            onClick={() => setShowRoomForm(true)}
                        >
                            <Plus className="w-5 h-5" />
                            Lägg till sal
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto p-4 border-2 border-dashed"
                            disabled={importing}
                            onClick={() => fileInputRef.current?.click()}
                            title="CSV: salsnummer, kapacitet, [typ]"
                        >
                            <Upload className="w-5 h-5" />
                            {importing ? 'Importerar…' : 'Importera CSV'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleCsvImport}
                            className="hidden"
                        />
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Lägg till ny sal</CardTitle>
                                <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {roomError && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{roomError}</AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleCreateRoom} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="roomNumber">Salsnummer *</Label>
                                        <Input
                                            id="roomNumber"
                                            value={newRoom.roomNumber}
                                            onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                                            required
                                            placeholder="t.ex. A101"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="roomType">Typ</Label>
                                        <select
                                            id="roomType"
                                            value={newRoom.roomType}
                                            onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                                            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                        >
                                            <option value="">Välj typ</option>
                                            <option value="Klassrum">Klassrum</option>
                                            <option value="Laboratorium">Laboratorium</option>
                                            <option value="Datorsal">Datorsal</option>
                                            <option value="Idrottshall">Idrottshall</option>
                                            <option value="Aula">Aula</option>
                                            <option value="Övrigt">Övrigt</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="capacity">Kapacitet</Label>
                                    <Input
                                        id="capacity"
                                        type="number"
                                        min="1"
                                        value={newRoom.capacity || ''}
                                        onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                                        placeholder="Max antal elever"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="roomNotes">Anteckningar</Label>
                                    <Textarea
                                        id="roomNotes"
                                        value={newRoom.notes}
                                        onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                                        rows={2}
                                        placeholder="Ytterligare information..."
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Avbryt
                                    </Button>
                                    <Button type="submit" disabled={creatingRoom}>
                                        {creatingRoom ? 'Lägger till...' : 'Lägg till sal'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Rooms List */}
            {rooms.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rooms.map((room) => (
                        <Card key={room.id} size="sm">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle>{room.roomNumber}</CardTitle>
                                    {room.roomType && (
                                        <Badge variant="secondary">{room.roomType}</Badge>
                                    )}
                                </div>
                                {room.capacity && (
                                    <CardDescription>Kapacitet: {room.capacity}</CardDescription>
                                )}
                            </CardHeader>
                            {room.notes && (
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">{room.notes}</p>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    Inga salar tillagda ännu.
                </div>
            )}
        </div>
    );
}
