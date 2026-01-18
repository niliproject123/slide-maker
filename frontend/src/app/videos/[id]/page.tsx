"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Send,
  Check,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  X,
  Copy,
  Move,
  FileText,
} from "lucide-react";
import { mockApi } from "@/lib/mockApi";
import type {
  VideoWithDetails,
  FrameWithImages,
  ContextWithImages,
  Image as ImageType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function VideoEditorPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoWithDetails | null>(null);
  const [context, setContext] = useState<ContextWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);

  // Frame creation
  const [newFrameTitle, setNewFrameTitle] = useState("");
  const [creatingFrame, setCreatingFrame] = useState(false);

  // Generation
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [useContext, setUseContext] = useState(false);

  // Context editing
  const [contextContent, setContextContent] = useState("");
  const [savingContext, setSavingContext] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [videoId]);

  async function loadVideo() {
    setLoading(true);
    const [videoData, contextData] = await Promise.all([
      mockApi.videos.get(videoId),
      mockApi.context.get(videoId),
    ]);
    setVideo(videoData);
    setContext(contextData);
    if (contextData) setContextContent(contextData.content);
    if (videoData && videoData.frames.length > 0 && !selectedFrameId) {
      setSelectedFrameId(videoData.frames[0].id);
    }
    setLoading(false);
  }

  async function handleCreateFrame() {
    if (!newFrameTitle.trim()) return;
    setCreatingFrame(true);
    const frame = await mockApi.frames.create(videoId, newFrameTitle.trim());
    setNewFrameTitle("");
    setCreatingFrame(false);
    setSelectedFrameId(frame.id);
    loadVideo();
  }

  async function handleDeleteFrame(frameId: string) {
    await mockApi.frames.delete(frameId);
    if (selectedFrameId === frameId) {
      setSelectedFrameId(null);
    }
    loadVideo();
  }

  async function handleGenerate() {
    if (!prompt.trim() || !selectedFrameId) return;
    setGenerating(true);
    await mockApi.generate.images(selectedFrameId, prompt.trim(), useContext);
    setPrompt("");
    setGenerating(false);
    loadVideo();
  }

  async function handleSelectImage(frameId: string, imageId: string) {
    await mockApi.images.select(frameId, imageId);
    loadVideo();
  }

  async function handleRemoveImage(
    imageId: string,
    sourceType: "frame" | "context",
    sourceId: string
  ) {
    await mockApi.images.remove(imageId, sourceType, sourceId);
    loadVideo();
  }

  async function handleCopyToGallery(imageId: string) {
    if (!video) return;
    const projectId = video.projectId;
    await mockApi.images.copy(imageId, "gallery", projectId);
  }

  async function handleSaveContext() {
    setSavingContext(true);
    await mockApi.context.update(videoId, contextContent);
    setSavingContext(false);
    loadVideo();
  }

  async function handleMoveFrame(frameId: string, direction: "up" | "down") {
    if (!video) return;
    const frame = video.frames.find((f) => f.id === frameId);
    if (!frame) return;
    const newOrder =
      direction === "up"
        ? Math.max(0, frame.order - 1)
        : Math.min(video.frames.length - 1, frame.order + 1);
    if (newOrder === frame.order) return;
    await mockApi.frames.reorder(frameId, newOrder);
    loadVideo();
  }

  const selectedFrame = video?.frames.find((f) => f.id === selectedFrameId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">Video not found</p>
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${video.projectId}`}
              className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {video.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${video.projectId}/gallery`}>
              <Button variant="outline" size="sm">
                <ImageIcon className="w-4 h-4" />
                Gallery
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Frames sidebar */}
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Frames
            </h2>
            <div className="flex gap-2">
              <Input
                placeholder="New frame title"
                value={newFrameTitle}
                onChange={(e) => setNewFrameTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFrame()}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={handleCreateFrame}
                disabled={!newFrameTitle.trim() || creatingFrame}
                className="h-8 px-2"
              >
                {creatingFrame ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {video.frames.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">
                No frames yet
              </p>
            ) : (
              <div className="space-y-1">
                {video.frames.map((frame, index) => (
                  <div
                    key={frame.id}
                    className={cn(
                      "group flex items-center gap-1 p-2 rounded-md cursor-pointer transition-colors",
                      selectedFrameId === frame.id
                        ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                    onClick={() => setSelectedFrameId(frame.id)}
                  >
                    <GripVertical className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {index + 1}. {frame.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {frame.images.length} images
                        {frame.selectedImage && " | 1 selected"}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveFrame(frame.id, "up");
                        }}
                        disabled={index === 0}
                      >
                        <ChevronDown className="w-3 h-3 rotate-180" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveFrame(frame.id, "down");
                        }}
                        disabled={index === video.frames.length - 1}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFrame(frame.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context section */}
          <div className="border-t border-zinc-200 dark:border-zinc-800">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              onClick={() => setContextExpanded(!contextExpanded)}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Context</span>
              </div>
              {contextExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {contextExpanded && (
              <div className="p-3 pt-0 space-y-2">
                <Textarea
                  placeholder="Add context for image generation..."
                  value={contextContent}
                  onChange={(e) => setContextContent(e.target.value)}
                  className="text-sm min-h-[100px]"
                />
                <Button
                  size="sm"
                  onClick={handleSaveContext}
                  disabled={savingContext || contextContent === context?.content}
                  className="w-full"
                >
                  {savingContext && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Context
                </Button>
                {context && context.images.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-zinc-500 mb-1">
                      Reference images ({context.images.length})
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {context.images.slice(0, 6).map((img) => (
                        <div
                          key={img.id}
                          className="relative aspect-video rounded overflow-hidden"
                        >
                          <Image
                            src={img.url}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900">
          {selectedFrame ? (
            <>
              {/* Frame header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4">
                <h2 className="text-lg font-semibold">{selectedFrame.title}</h2>
                <p className="text-sm text-zinc-500">
                  {selectedFrame.images.length} images generated
                </p>
              </div>

              {/* Images grid */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedFrame.images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                    <ImageIcon className="w-12 h-12 mb-4" />
                    <p>No images yet. Generate some below!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {selectedFrame.images.map((image) => (
                      <div
                        key={image.id}
                        className={cn(
                          "group relative aspect-video rounded-lg overflow-hidden border-2 transition-all",
                          selectedFrame.selectedImageId === image.id
                            ? "border-green-500 ring-2 ring-green-500/20"
                            : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <Image
                          src={image.url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                        {selectedFrame.selectedImageId === image.id && (
                          <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              handleSelectImage(selectedFrame.id, image.id)
                            }
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                            Select
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyToGallery(image.id)}
                            className="bg-white/90"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleRemoveImage(
                                image.id,
                                "frame",
                                selectedFrame.id
                              )
                            }
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generation input */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Describe the image you want to generate..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && !e.shiftKey && handleGenerate()
                        }
                        disabled={generating}
                        className="pr-24"
                      />
                      <label className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-zinc-500">
                        <input
                          type="checkbox"
                          checked={useContext}
                          onChange={(e) => setUseContext(e.target.checked)}
                          className="rounded"
                        />
                        Use context
                      </label>
                    </div>
                    <Button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || generating}
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Press Enter to generate 4 images. Select the best one for
                    your video.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p className="text-lg">Select a frame to start editing</p>
              <p className="text-sm mt-1">
                Or create a new frame from the sidebar
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
