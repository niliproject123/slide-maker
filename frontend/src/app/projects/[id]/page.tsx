"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Video,
  ArrowLeft,
  Loader2,
  Images,
  Edit2,
  Check,
  X,
  Users,
  ImageIcon,
  MoreVertical,
} from "lucide-react";
import { mockApi } from "@/lib/mockApi";
import { api } from "@/lib/api";
import type { ProjectWithVideos, Video as VideoType, CharacterWithImages, Image as ImageType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectWithVideos | null>(null);
  const [loading, setLoading] = useState(true);
  const [newVideoName, setNewVideoName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [projectName, setProjectName] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"videos" | "characters">("videos");

  // Character state
  const [characters, setCharacters] = useState<CharacterWithImages[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterDescription, setNewCharacterDescription] = useState("");
  const [createCharacterDialogOpen, setCreateCharacterDialogOpen] = useState(false);
  const [creatingCharacter, setCreatingCharacter] = useState(false);
  const [deletingCharacterId, setDeletingCharacterId] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterWithImages | null>(null);
  const [characterDetailOpen, setCharacterDetailOpen] = useState(false);
  const [editingCharacterName, setEditingCharacterName] = useState(false);
  const [editCharacterName, setEditCharacterName] = useState("");
  const [editCharacterDescription, setEditCharacterDescription] = useState("");

  useEffect(() => {
    loadProject();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "characters") {
      loadCharacters();
    }
  }, [activeTab, projectId]);

  async function loadProject() {
    setLoading(true);
    const data = await mockApi.projects.get(projectId);
    setProject(data);
    if (data) setProjectName(data.name);
    setLoading(false);
  }

  async function handleCreateVideo() {
    if (!newVideoName.trim()) return;
    setCreating(true);
    await mockApi.videos.create(projectId, newVideoName.trim());
    setNewVideoName("");
    setCreateDialogOpen(false);
    setCreating(false);
    loadProject();
  }

  async function handleDeleteVideo(id: string) {
    setDeletingId(id);
    await mockApi.videos.delete(id);
    setDeletingId(null);
    loadProject();
  }

  async function handleUpdateProjectName() {
    if (!projectName.trim() || projectName === project?.name) {
      setEditingName(false);
      if (project) setProjectName(project.name);
      return;
    }
    await mockApi.projects.update(projectId, projectName.trim());
    setEditingName(false);
    loadProject();
  }

  async function loadCharacters() {
    setCharactersLoading(true);
    try {
      const data = await api.characters.list(projectId);
      setCharacters(data);
    } catch (error) {
      console.error("Failed to load characters:", error);
    } finally {
      setCharactersLoading(false);
    }
  }

  async function handleCreateCharacter() {
    if (!newCharacterName.trim()) return;
    setCreatingCharacter(true);
    try {
      await api.characters.create(projectId, newCharacterName.trim(), newCharacterDescription.trim());
      setNewCharacterName("");
      setNewCharacterDescription("");
      setCreateCharacterDialogOpen(false);
      loadCharacters();
    } catch (error) {
      console.error("Failed to create character:", error);
    } finally {
      setCreatingCharacter(false);
    }
  }

  async function handleDeleteCharacter(id: string) {
    setDeletingCharacterId(id);
    try {
      await api.characters.delete(id);
      loadCharacters();
      if (selectedCharacter?.id === id) {
        setSelectedCharacter(null);
        setCharacterDetailOpen(false);
      }
    } catch (error) {
      console.error("Failed to delete character:", error);
    } finally {
      setDeletingCharacterId(null);
    }
  }

  async function handleUpdateCharacter() {
    if (!selectedCharacter || !editCharacterName.trim()) return;
    try {
      const updated = await api.characters.update(selectedCharacter.id, {
        name: editCharacterName.trim(),
        description: editCharacterDescription.trim(),
      });
      if (updated) {
        setSelectedCharacter(updated);
        setEditingCharacterName(false);
        loadCharacters();
      }
    } catch (error) {
      console.error("Failed to update character:", error);
    }
  }

  function openCharacterDetail(character: CharacterWithImages) {
    setSelectedCharacter(character);
    setEditCharacterName(character.name);
    setEditCharacterDescription(character.description);
    setEditingCharacterName(false);
    setCharacterDetailOpen(true);
  }

  async function handleRemoveCharacterImage(imageId: string) {
    if (!selectedCharacter) return;
    try {
      await api.characters.removeImage(selectedCharacter.id, imageId);
      // Refresh character
      const updated = await api.characters.get(selectedCharacter.id);
      if (updated) {
        setSelectedCharacter(updated);
        loadCharacters();
      }
    } catch (error) {
      console.error("Failed to remove image:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">
          Project not found
        </p>
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Projects
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateProjectName();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setProjectName(project.name);
                      }
                    }}
                    className="text-xl sm:text-2xl font-bold h-auto py-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={handleUpdateProjectName}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => {
                      setEditingName(false);
                      setProjectName(project.name);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {project.name}
                  </h1>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => setEditingName(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href={`/projects/${projectId}/gallery`}>
                <Button variant="outline" size="sm" className="h-9">
                  <Images className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Gallery</span>
                  {project.galleryImages.length > 0 && (
                    <span className="ml-1 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-xs">
                      {project.galleryImages.length}
                    </span>
                  )}
                </Button>
              </Link>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">New Video</span>
                    <span className="sm:hidden ml-1">New</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Video</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Input
                      placeholder="Video name"
                      value={newVideoName}
                      onChange={(e) => setNewVideoName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateVideo()}
                      autoFocus
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateVideo}
                      disabled={!newVideoName.trim() || creating}
                    >
                      {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
          <button
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-[2px]",
              activeTab === "videos"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
            onClick={() => setActiveTab("videos")}
          >
            <Video className="w-4 h-4" />
            Videos
            {project.videos.length > 0 && (
              <span className="bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-xs">
                {project.videos.length}
              </span>
            )}
          </button>
          <button
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-[2px]",
              activeTab === "characters"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
            onClick={() => setActiveTab("characters")}
          >
            <Users className="w-4 h-4" />
            Characters
            {characters.length > 0 && (
              <span className="bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-xs">
                {characters.length}
              </span>
            )}
          </button>
        </div>

        {/* Videos Tab */}
        {activeTab === "videos" && (
          <>
            {project.videos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Video className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                    No videos in this project
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Create your first video
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {project.videos.map((video) => (
                  <Link key={video.id} href={`/videos/${video.id}`} className="block">
                    <Card className="group hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 flex-1 min-w-0">
                            <Video className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{video.name}</span>
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity -mt-1 -mr-2 h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteVideo(video.id);
                            }}
                            disabled={deletingId === video.id}
                          >
                            {deletingId === video.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                          Updated {formatRelativeTime(video.updatedAt)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Characters Tab */}
        {activeTab === "characters" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-500">
                Create characters to maintain visual consistency across your videos.
                Add reference images to help AI generate consistent characters.
              </p>
              <Dialog open={createCharacterDialogOpen} onOpenChange={setCreateCharacterDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                    New Character
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Character</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Name</label>
                      <Input
                        placeholder="Character name"
                        value={newCharacterName}
                        onChange={(e) => setNewCharacterName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Description</label>
                      <Input
                        placeholder="Optional description (e.g., 'Main hero, wears blue cape')"
                        value={newCharacterDescription}
                        onChange={(e) => setNewCharacterDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateCharacterDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCharacter}
                      disabled={!newCharacterName.trim() || creatingCharacter}
                    >
                      {creatingCharacter && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {charactersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            ) : characters.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                    No characters yet
                  </p>
                  <Button onClick={() => setCreateCharacterDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Create your first character
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {characters.map((character) => (
                  <Card
                    key={character.id}
                    className="group hover:shadow-md transition-shadow cursor-pointer h-full"
                    onClick={() => openCharacterDetail(character)}
                  >
                    <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 flex-1 min-w-0">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{character.name}</span>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity -mt-1 -mr-2 h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteCharacter(character.id);
                          }}
                          disabled={deletingCharacterId === character.id}
                        >
                          {deletingCharacterId === character.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                      {character.description && (
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-2 line-clamp-2">
                          {character.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-3 h-3 text-zinc-400" />
                        <span className="text-xs text-zinc-400">
                          {character.referenceImages.length} reference images
                        </span>
                      </div>
                      {character.referenceImages.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {character.referenceImages.slice(0, 4).map((img) => (
                            <div
                              key={img.id}
                              className="w-10 h-10 rounded overflow-hidden flex-shrink-0"
                            >
                              <Image
                                src={img.url}
                                alt=""
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {character.referenceImages.length > 4 && (
                            <div className="w-10 h-10 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-zinc-500">
                                +{character.referenceImages.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Character Detail Modal */}
        {characterDetailOpen && selectedCharacter && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-950 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {editingCharacterName ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editCharacterName}
                        onChange={(e) => setEditCharacterName(e.target.value)}
                        className="text-lg font-semibold h-auto py-1"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleUpdateCharacter}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingCharacterName(false);
                          setEditCharacterName(selectedCharacter.name);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold truncate">{selectedCharacter.name}</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => setEditingCharacterName(true)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setCharacterDetailOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Input
                    placeholder="Add a description..."
                    value={editCharacterDescription}
                    onChange={(e) => setEditCharacterDescription(e.target.value)}
                    onBlur={handleUpdateCharacter}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Reference Images</label>
                  <p className="text-xs text-zinc-500 mb-3">
                    Add reference images to help AI maintain visual consistency when generating this character.
                    These will be used with models that support IP-Adapter.
                  </p>
                  {selectedCharacter.referenceImages.length === 0 ? (
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center">
                      <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                      <p className="text-sm text-zinc-500 mb-2">No reference images yet</p>
                      <p className="text-xs text-zinc-400">
                        Generate images for this character, then copy them here from the Gallery or Frame
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {selectedCharacter.referenceImages.map((img) => (
                        <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group">
                          <Image src={img.url} alt="" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7"
                              onClick={() => handleRemoveCharacterImage(img.id)}
                            >
                              <X className="w-3 h-3" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
