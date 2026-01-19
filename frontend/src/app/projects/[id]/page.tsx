"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { mockApi } from "@/lib/mockApi";
import type { ProjectWithVideos, Video as VideoType } from "@/lib/types";
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

  useEffect(() => {
    loadProject();
  }, [projectId]);

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
      </div>
    </div>
  );
}
