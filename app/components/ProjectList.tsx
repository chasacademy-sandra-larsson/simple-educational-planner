import { useState } from 'react';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import type { Project } from '@/app/lib/api/types';

interface ProjectListProps {
  projects: Project[];
  loading?: boolean;
  error?: string;
  onCreateProject: (projectData: { name: string; description?: string }) => void;
  onSelectProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  getProjectProgress: (project: Project) => number;
  formatDate: (dateString: string) => string;
}

export function ProjectList({ 
  projects, 
  loading = false,
  error,
  onCreateProject, 
  onSelectProject,
  onDeleteProject,
  getProjectProgress,
  formatDate
}: ProjectListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [createError, setCreateError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      await onCreateProject(formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
    } catch (err) {
      setCreateError('Kunde inte skapa projektet');
    }
  };

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    onDeleteProject(projectId);
  };

  const getStatusColor = (progress: number) => {
    if (progress < 30) return 'bg-orange-100 text-orange-700';
    if (progress < 60) return 'bg-blue-100 text-blue-700';
    if (progress < 90) return 'bg-green-100 text-green-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = (progress: number) => {
    if (progress < 30) return 'Kom igång';
    if (progress < 60) return 'Pågående';
    if (progress < 90) return 'Nästan klart';
    return 'Klart';
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl mb-2">Mina Skolor</h1>
            <p className="text-gray-600">Hantera och skapa scheman för olika terminer</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Skapa Skola
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl mb-2 text-gray-900">Inga projekt än</h3>
            <p className="text-gray-600 mb-6">Kom igång genom att skapa ditt första schema för en skola</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Skapa Skola
            </button>
          </div>
        ) : (
          !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const progress = getProjectProgress(project);
                const status = getStatusText(progress);
                const statusColor = getStatusColor(progress);
                
                return (
                  <div
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer group relative"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full ${statusColor}`}>
                          {status}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                          title="Radera projekt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg mb-1 font-semibold">{project.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description || 'Ingen beskrivning'}
                    </p>
                    
                    {/* Progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Framsteg</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-gray-500 mt-3">
                      Skapad {formatDate(project.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl">Skapa Nytt Projekt</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '' });
                    setCreateError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{createError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="projectName" className="block text-sm mb-2 text-gray-700">
                    Projektnamn *
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="t.ex. Hösttermin 2026"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm mb-2 text-gray-700">
                    Beskrivning
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Beskriv ditt projekt..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', description: '' });
                      setCreateError('');
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition"
                  >
                    Skapa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}