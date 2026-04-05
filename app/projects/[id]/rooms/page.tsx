"use client";

import { useState } from 'react';
import { api, ApiError } from '@/app/lib/api';
import type { CreateRoomRequest } from '@/app/lib/api/types';
import { useProject } from '../ProjectContext';

export default function RoomsPage() {
    const { projectId, rooms, fetchRooms } = useProject();

    const [showRoomForm, setShowRoomForm] = useState(false);
    const [newRoom, setNewRoom] = useState<CreateRoomRequest>({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [roomError, setRoomError] = useState('');

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

    return (
        <div>
            {/* Create Room Form */}
            <div className="mb-6">
                {!showRoomForm ? (
                    <button
                        onClick={() => setShowRoomForm(true)}
                        className="w-full p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                    >
                        <div className="flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="font-medium">Lägg till sal</span>
                        </div>
                    </button>
                ) : (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg border border-zinc-200 dark:border-zinc-600">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Lägg till ny sal</h4>
                            <button
                                onClick={() => {
                                    setShowRoomForm(false);
                                    setNewRoom({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
                                    setRoomError('');
                                }}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {roomError && (
                            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                                {roomError}
                            </div>
                        )}

                        <form onSubmit={handleCreateRoom} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Salsnummer *
                                    </label>
                                    <input
                                        type="text"
                                        value={newRoom.roomNumber}
                                        onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                        placeholder="t.ex. A101"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Typ
                                    </label>
                                    <select
                                        value={newRoom.roomType}
                                        onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                                        className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
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
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Kapacitet
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newRoom.capacity || ''}
                                    onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                    placeholder="Max antal elever"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Anteckningar
                                </label>
                                <textarea
                                    value={newRoom.notes}
                                    onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none"
                                    placeholder="Ytterligare information..."
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRoomForm(false);
                                        setNewRoom({ roomNumber: '', roomType: '', capacity: undefined, notes: '' });
                                        setRoomError('');
                                    }}
                                    className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingRoom}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded"
                                >
                                    {creatingRoom ? 'Lägger till...' : 'Lägg till sal'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Rooms List */}
            {rooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {room.roomNumber}
                                </div>
                                {room.roomType && (
                                    <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                        {room.roomType}
                                    </span>
                                )}
                            </div>
                            {room.capacity && (
                                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                    Kapacitet: {room.capacity}
                                </div>
                            )}
                            {room.notes && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                                    {room.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
                    Inga salar tillagda ännu.
                </div>
            )}
        </div>
    );
}
