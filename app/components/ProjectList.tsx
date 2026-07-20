import { useEffect, useState } from 'react';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import type { Project } from '@/app/lib/api/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ProjectListProps {
  projects: Project[];
  loading?: boolean;
  error?: string;
  onCreateProject: (projectData: { name: string; description?: string }) => void;
  onSelectProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  formatDate: (dateString: string) => string;
  autoOpenCreate?: boolean;
}

export function ProjectList({
  projects,
  loading = false,
  error,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  formatDate,
  autoOpenCreate = false
}: ProjectListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (autoOpenCreate) {
      setShowCreateModal(true);
    }
  }, [autoOpenCreate]);

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

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl mb-2">Mina Skolor</h1>
            <p className="text-muted-foreground">Hantera och skapa scheman för olika terminer</p>
          </div>
          <Button size="lg" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-5 h-5" />
            Skapa Skola
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && projects.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border-2 border-dashed border-border">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl mb-2">Inga projekt än</h3>
            <p className="text-muted-foreground mb-6">Kom igång genom att skapa ditt första schema för en skola</p>
            <Button size="lg" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-5 h-5" />
              Skapa Skola
            </Button>
          </div>
        ) : (
          !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                return (
                  <Card
                    key={project.id}
                    className="cursor-pointer transition hover:shadow-lg group"
                    onClick={() => onSelectProject(project)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="opacity-0 group-hover:opacity-100 text-destructive"
                                  onClick={(e) => handleDelete(e, project.id)}
                                />
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </TooltipTrigger>
                            <TooltipContent>Radera projekt</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <CardTitle className="mt-3">{project.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {project.description || 'Ingen beskrivning'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground">
                        Skapad {formatDate(project.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {/* Create Project Dialog */}
        <Dialog
          open={showCreateModal}
          onOpenChange={(open) => {
            setShowCreateModal(open);
            if (!open) {
              setFormData({ name: '', description: '' });
              setCreateError('');
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Skapa Nytt Projekt</DialogTitle>
              <DialogDescription>
                Skapa ett nytt schemaläggningsprojekt för en skola eller termin.
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="projectName">Projektnamn *</Label>
                <Input
                  id="projectName"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="t.ex. Hösttermin 2026"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Beskriv ditt projekt..."
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '' });
                    setCreateError('');
                  }}
                >
                  Avbryt
                </Button>
                <Button type="submit">
                  Skapa
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
