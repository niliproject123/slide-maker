"use client";

import { useEffect, useState, useRef } from "react";
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
  FileText,
  Upload,
  Maximize2,
  Minimize2,
  Paperclip,
  User,
  Bot,
  ArrowRightLeft,
  MessageSquare,
  Menu,
  Settings,
  DollarSign,
  Zap,
} from "lucide-react";
import { mockApi } from "@/lib/mockApi";
import { api } from "@/lib/api";
import type {
  VideoWithDetails,
  ContextWithImages,
  Image as ImageType,
  MessageWithImages,
  MainChatWithMessages,
  ModelInfo,
  ModelsResponse,
  CharacterWithImages,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [attachedImages, setAttachedImages] = useState<ImageType[]>([]);

  // Context generation
  const [contextPrompt, setContextPrompt] = useState("");
  const [generatingContext, setGeneratingContext] = useState(false);
  const [contextAttachedImages, setContextAttachedImages] = useState<ImageType[]>([]);

  // Context editing
  const [contextContent, setContextContent] = useState("");
  const [savingContext, setSavingContext] = useState(false);
  const [contextMaximized, setContextMaximized] = useState(false);

  // Prompt maximized
  const [promptMaximized, setPromptMaximized] = useState(false);

  // Fullscreen image viewer
  const [fullscreenImage, setFullscreenImage] = useState<ImageType | null>(null);

  // Image picker modal
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState<"frame" | "context" | "mainChat">("frame");
  const [imagePickerTab, setImagePickerTab] = useState<"current" | "gallery" | "characters">("current");

  // Copy to frame modal
  const [copyToFrameOpen, setCopyToFrameOpen] = useState(false);
  const [imageToCopy, setImageToCopy] = useState<ImageType | null>(null);

  // Gallery images
  const [galleryImages, setGalleryImages] = useState<ImageType[]>([]);

  // Characters
  const [characters, setCharacters] = useState<CharacterWithImages[]>([]);

  // Main view tab: "frames" or "mainChat"
  const [mainView, setMainView] = useState<"frames" | "mainChat">("frames");

  // Main Chat state
  const [selectedMainChatId, setSelectedMainChatId] = useState<string | null>(null);
  const [mainChatPrompt, setMainChatPrompt] = useState("");
  const [generatingMainChat, setGeneratingMainChat] = useState(false);
  const [mainChatAttachedImages, setMainChatAttachedImages] = useState<ImageType[]>([]);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Model selection
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Chat scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mainChatEndRef = useRef<HTMLDivElement>(null);

  // Upload refs
  const frameUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVideo();
    loadModels();
  }, [videoId]);

  async function loadModels() {
    setModelsLoading(true);
    try {
      const response: ModelsResponse = await api.models.list();
      setModels(response.models);
      setDefaultModel(response.default);
      if (response.default && !selectedModel) {
        setSelectedModel(response.default);
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setModelsLoading(false);
    }
  }

  useEffect(() => {
    // Scroll to bottom of chat when messages change
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [video, selectedFrameId]);

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
    // Set first main chat if available
    if (videoData && videoData.mainChats.length > 0 && !selectedMainChatId) {
      setSelectedMainChatId(videoData.mainChats[0].id);
    }
    // Load gallery images and characters
    if (videoData) {
      const [gallery, chars] = await Promise.all([
        mockApi.gallery.list(videoData.projectId),
        api.characters.list(videoData.projectId),
      ]);
      setGalleryImages(gallery);
      setCharacters(chars);
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
    const attachedImageIds = attachedImages.map((img) => img.id);
    await mockApi.generate.images(
      selectedFrameId,
      prompt.trim(),
      useContext,
      attachedImageIds,
      { model: selectedModel || undefined }
    );
    setPrompt("");
    setAttachedImages([]);
    setGenerating(false);
    loadVideo();
  }

  async function handleGenerateContext() {
    if (!contextPrompt.trim() || !context) return;
    setGeneratingContext(true);
    const attachedImageIds = contextAttachedImages.map((img) => img.id);
    await mockApi.generate.contextImages(
      context.id,
      contextPrompt.trim(),
      attachedImageIds,
      { model: selectedModel || undefined }
    );
    setContextPrompt("");
    setContextAttachedImages([]);
    setGeneratingContext(false);
    loadVideo();
  }

  async function handleGenerateMainChat() {
    if (!mainChatPrompt.trim() || !selectedMainChatId) return;
    setGeneratingMainChat(true);
    const attachedImageIds = mainChatAttachedImages.map((img) => img.id);
    await mockApi.generate.mainChatImages(
      selectedMainChatId,
      mainChatPrompt.trim(),
      attachedImageIds,
      { model: selectedModel || undefined }
    );
    setMainChatPrompt("");
    setMainChatAttachedImages([]);
    setGeneratingMainChat(false);
    loadVideo();
    // Scroll to bottom after generation
    setTimeout(() => mainChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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
    loadVideo();
  }

  async function handleCopyToFrame(imageId: string, targetFrameId: string) {
    await mockApi.images.copy(imageId, "frame", targetFrameId);
    setCopyToFrameOpen(false);
    setImageToCopy(null);
    loadVideo();
  }

  function openCopyToFrameModal(image: ImageType) {
    setImageToCopy(image);
    setCopyToFrameOpen(true);
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

  async function handleUploadToFrame() {
    if (!selectedFrameId) return;
    await mockApi.images.upload("frame", selectedFrameId);
    loadVideo();
  }

  function openImagePicker(target: "frame" | "context" | "mainChat") {
    setImagePickerTarget(target);
    setImagePickerTab("current");
    setImagePickerOpen(true);
  }

  function handleSelectFromPicker(image: ImageType) {
    if (imagePickerTarget === "frame") {
      if (!attachedImages.find((img) => img.id === image.id)) {
        setAttachedImages((prev) => [...prev, image]);
      }
    } else if (imagePickerTarget === "mainChat") {
      if (!mainChatAttachedImages.find((img) => img.id === image.id)) {
        setMainChatAttachedImages((prev) => [...prev, image]);
      }
    } else {
      if (!contextAttachedImages.find((img) => img.id === image.id)) {
        setContextAttachedImages((prev) => [...prev, image]);
      }
    }
  }

  function removeAttachedImage(imageId: string) {
    setAttachedImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  function removeContextAttachedImage(imageId: string) {
    setContextAttachedImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  const selectedFrame = video?.frames.find((f) => f.id === selectedFrameId);
  const selectedMainChat = video?.mainChats.find((mc) => mc.id === selectedMainChatId);
  const currentModel = models.find((m) => m.id === selectedModel);

  // Get available images for picker
  const availableImages = imagePickerTarget === "frame"
    ? selectedFrame?.images || []
    : imagePickerTarget === "mainChat"
    ? selectedMainChat?.images || []
    : context?.images || [];

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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative w-full h-full p-4">
            <Image
              src={fullscreenImage.url}
              alt=""
              fill
              className="object-contain"
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 bg-white/90"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Image Picker Modal */}
      {imagePickerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-0 sm:p-8">
          <div className="bg-white dark:bg-zinc-950 sm:rounded-lg w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold">Select Reference Image</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setImagePickerOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
              <button
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  imagePickerTab === "current"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setImagePickerTab("current")}
              >
                {imagePickerTarget === "frame" ? "Frame" : imagePickerTarget === "mainChat" ? "Chat" : "Context"}
              </button>
              <button
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  imagePickerTab === "gallery"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setImagePickerTab("gallery")}
              >
                Gallery
              </button>
              <button
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  imagePickerTab === "characters"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setImagePickerTab("characters")}
              >
                Characters
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {imagePickerTab === "current" ? (
                availableImages.length === 0 ? (
                  <p className="text-center text-zinc-500 py-8">
                    No images available. Generate some first!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableImages.map((img) => {
                      const isSelected = imagePickerTarget === "frame"
                        ? attachedImages.some((a) => a.id === img.id)
                        : imagePickerTarget === "mainChat"
                        ? mainChatAttachedImages.some((a) => a.id === img.id)
                        : contextAttachedImages.some((a) => a.id === img.id);
                      return (
                        <div
                          key={img.id}
                          className={cn(
                            "relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-500/20"
                              : "border-transparent hover:border-zinc-300"
                          )}
                          onClick={() => handleSelectFromPicker(img)}
                        >
                          <Image src={img.url} alt="" fill className="object-cover" />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : imagePickerTab === "gallery" ? (
                galleryImages.length === 0 ? (
                  <p className="text-center text-zinc-500 py-8">
                    No gallery images. Copy images to the gallery first!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryImages.map((img) => {
                      const isSelected = imagePickerTarget === "frame"
                        ? attachedImages.some((a) => a.id === img.id)
                        : imagePickerTarget === "mainChat"
                        ? mainChatAttachedImages.some((a) => a.id === img.id)
                        : contextAttachedImages.some((a) => a.id === img.id);
                      return (
                        <div
                          key={img.id}
                          className={cn(
                            "relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-500/20"
                              : "border-transparent hover:border-zinc-300"
                          )}
                          onClick={() => handleSelectFromPicker(img)}
                        >
                          <Image src={img.url} alt="" fill className="object-cover" />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Characters tab */
                characters.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-zinc-500 mb-2">No characters yet</p>
                    <p className="text-xs text-zinc-400">
                      Create characters in the project page to use their reference images here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {characters.map((character) => (
                      <div key={character.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                        <p className="font-medium text-sm mb-1">{character.name}</p>
                        {character.description && (
                          <p className="text-xs text-zinc-500 mb-2">{character.description}</p>
                        )}
                        {character.referenceImages.length === 0 ? (
                          <p className="text-xs text-zinc-400">No reference images</p>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {character.referenceImages.map((img) => {
                              const isSelected = imagePickerTarget === "frame"
                                ? attachedImages.some((a) => a.id === img.id)
                                : imagePickerTarget === "mainChat"
                                ? mainChatAttachedImages.some((a) => a.id === img.id)
                                : contextAttachedImages.some((a) => a.id === img.id);
                              return (
                                <div
                                  key={img.id}
                                  className={cn(
                                    "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                    isSelected
                                      ? "border-blue-500 ring-2 ring-blue-500/20"
                                      : "border-transparent hover:border-zinc-300"
                                  )}
                                  onClick={() => handleSelectFromPicker(img)}
                                >
                                  <Image src={img.url} alt="" fill className="object-cover" />
                                  {isSelected && (
                                    <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-0.5">
                                      <Check className="w-2 h-2" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <Button onClick={() => setImagePickerOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* Copy to Frame Modal */}
      {copyToFrameOpen && imageToCopy && video && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-0 sm:p-8">
          <div className="bg-white dark:bg-zinc-950 sm:rounded-lg w-full h-full sm:h-auto sm:max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold">Copy to Frame</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCopyToFrameOpen(false);
                  setImageToCopy(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {video.frames.length === 0 ? (
                <p className="text-center text-zinc-500 py-4">No frames available</p>
              ) : (
                video.frames.map((frame) => (
                  <button
                    key={frame.id}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      frame.id === selectedFrameId
                        ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                    onClick={() => handleCopyToFrame(imageToCopy.id, frame.id)}
                  >
                    {frame.selectedImage ? (
                      <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={frame.selectedImage.url}
                          alt=""
                          width={48}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-4 h-4 text-zinc-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{frame.title}</p>
                      <p className="text-xs text-zinc-500">{frame.images.length} images</p>
                    </div>
                    {frame.id === selectedFrameId && (
                      <span className="text-xs text-blue-600">Current</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Maximized Context Modal */}
      {contextMaximized && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-0 sm:p-8">
          <div className="bg-white dark:bg-zinc-950 sm:rounded-lg w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold">Context</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setContextMaximized(false)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <Textarea
                placeholder="Add context for image generation..."
                value={contextContent}
                onChange={(e) => setContextContent(e.target.value)}
                className="min-h-[300px] h-full"
              />
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setContextMaximized(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleSaveContext();
                  setContextMaximized(false);
                }}
                disabled={savingContext || contextContent === context?.content}
              >
                {savingContext && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Maximized Prompt Modal */}
      {promptMaximized && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-0 sm:p-8">
          <div className="bg-white dark:bg-zinc-950 sm:rounded-lg w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold">Image Prompt</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPromptMaximized(false)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <Textarea
                placeholder="Describe the image you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px]"
              />
              {attachedImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-zinc-500 mb-2">Attached reference images:</p>
                  <div className="flex gap-2 flex-wrap">
                    {attachedImages.map((img) => (
                      <div key={img.id} className="relative w-20 h-14 rounded overflow-hidden group">
                        <Image src={img.url} alt="" fill className="object-cover" />
                        <button
                          className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100"
                          onClick={() => removeAttachedImage(img.id)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm text-zinc-500">
                  <input
                    type="checkbox"
                    checked={useContext}
                    onChange={(e) => setUseContext(e.target.checked)}
                    className="rounded"
                  />
                  Use context
                </label>
                <Button variant="outline" size="sm" onClick={() => openImagePicker("frame")}>
                  <Paperclip className="w-4 h-4" />
                  Attach Image
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPromptMaximized(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleGenerate();
                    setPromptMaximized(false);
                  }}
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
            </div>
          </div>
        </div>
      )}

      {/* Model Selector Modal */}
      {modelSelectorOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-0 sm:p-8">
          <div className="bg-white dark:bg-zinc-950 sm:rounded-lg w-full h-full sm:h-auto sm:max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold">Select Model</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModelSelectorOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {modelsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
              ) : models.length === 0 ? (
                <p className="text-center text-zinc-500 py-4">
                  No models available. Check API configuration.
                </p>
              ) : (
                models.map((model) => (
                  <button
                    key={model.id}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                      selectedModel === model.id
                        ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"
                    )}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setModelSelectorOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{model.name}</p>
                        {model.id === defaultModel && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {model.cost}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {model.speed}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {model.supportsImageReference
                          ? `Supports up to ${model.maxReferenceImages} reference images`
                          : "Text-to-image only"}
                      </p>
                    </div>
                    {selectedModel === model.id && (
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link
              href={`/projects/${video.projectId}`}
              className="hidden sm:inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <Link
              href={`/projects/${video.projectId}`}
              className="sm:hidden inline-flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-500" />
            </Link>
            <h1 className="text-base sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {video.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/projects/${video.projectId}/gallery`}>
              <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3">
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Gallery</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Frames sidebar */}
        <aside
          className={cn(
            "w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col",
            "fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out",
            "md:relative md:translate-x-0 md:transform-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Frames
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-6 w-6"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
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
                      "group flex items-start gap-1 p-2 rounded-md cursor-pointer transition-colors",
                      selectedFrameId === frame.id
                        ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                    onClick={() => {
                      setSelectedFrameId(frame.id);
                      setMainView("frames");
                      setSidebarOpen(false);
                    }}
                  >
                    <GripVertical className="w-4 h-4 text-zinc-300 dark:text-zinc-700 mt-1 flex-shrink-0" />

                    {/* Selected image thumbnail */}
                    {frame.selectedImage ? (
                      <div
                        className="w-12 h-8 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFullscreenImage(frame.selectedImage);
                        }}
                      >
                        <Image
                          src={frame.selectedImage.url}
                          alt=""
                          width={48}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-4 h-4 text-zinc-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {index + 1}. {frame.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {frame.messages.length} prompts
                        {frame.selectedImage && (
                          <span className="text-green-600"> • selected</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
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
                {context && context.messages.length > 0 && (
                  <span className="text-xs bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                    {context.messages.length}
                  </span>
                )}
              </div>
              {contextExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {contextExpanded && (
              <div className="p-3 pt-0 space-y-2 max-h-96 overflow-y-auto">
                {/* Context text */}
                <div className="relative">
                  <Textarea
                    placeholder="Add context for image generation..."
                    value={contextContent}
                    onChange={(e) => setContextContent(e.target.value)}
                    className="text-sm min-h-[60px] pr-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setContextMaximized(true)}
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveContext}
                  disabled={savingContext || contextContent === context?.content}
                  className="w-full"
                >
                  {savingContext && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Context
                </Button>

                {/* Context chat history */}
                {context && context.messages.length > 0 && (
                  <div className="mt-3 space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                    <p className="text-xs font-medium text-zinc-500">Chat History</p>
                    {context.messages.map((msg) => (
                      <div key={msg.id} className="space-y-2">
                        {/* User prompt */}
                        <div className="flex gap-2">
                          <User className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">{msg.prompt}</p>
                            {msg.attachedImages && msg.attachedImages.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {msg.attachedImages.map((img) => (
                                  <div
                                    key={img.id}
                                    className="w-8 h-6 rounded overflow-hidden cursor-pointer"
                                    onClick={() => setFullscreenImage(img)}
                                  >
                                    <Image src={img.url} alt="" width={32} height={24} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Generated images */}
                        <div className="flex gap-2">
                          <Bot className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div className="grid grid-cols-4 gap-1 flex-1">
                            {msg.images.map((img) => (
                              <div
                                key={img.id}
                                className="aspect-video rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
                                onClick={() => setFullscreenImage(img)}
                              >
                                <Image src={img.url} alt="" width={80} height={45} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Context generation input */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 space-y-2">
                  {contextAttachedImages.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {contextAttachedImages.map((img) => (
                        <div key={img.id} className="relative w-10 h-7 rounded overflow-hidden group">
                          <Image src={img.url} alt="" fill className="object-cover" />
                          <button
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100"
                            onClick={() => removeContextAttachedImage(img.id)}
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Input
                      placeholder="Generate context images..."
                      value={contextPrompt}
                      onChange={(e) => setContextPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGenerateContext()}
                      disabled={generatingContext}
                      className="h-7 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openImagePicker("context")}
                      title="Attach reference image from context or gallery"
                    >
                      <Paperclip className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleGenerateContext}
                      disabled={!contextPrompt.trim() || generatingContext}
                    >
                      {generatingContext ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main content - Chat view */}
        <main className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
          {/* View Tabs */}
          <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <div className="flex">
              <button
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  mainView === "frames"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setMainView("frames")}
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Frames</span>
              </button>
              <button
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  mainView === "mainChat"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setMainView("mainChat")}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Main Chat</span>
              </button>
            </div>
          </div>

          {/* Frames View */}
          {mainView === "frames" && selectedFrame ? (
            <>
              {/* Frame header */}
              <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">{selectedFrame.title}</h2>
                    <p className="text-xs sm:text-sm text-zinc-500">
                      {selectedFrame.messages.length} prompts, {selectedFrame.images.length} images
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={frameUploadRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleUploadToFrame}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => frameUploadRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Upload</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat history - scrollable container */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 min-h-0">
                {selectedFrame.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                    <ImageIcon className="w-12 h-12 mb-4" />
                    <p>No images yet. Start by describing what you want!</p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {selectedFrame.messages.map((msg) => (
                      <div key={msg.id} className="space-y-3">
                        {/* User message */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">You</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{msg.prompt}</p>
                            {msg.withContext && (
                              <span className="inline-block mt-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                with context
                              </span>
                            )}
                            {msg.attachedImages && msg.attachedImages.length > 0 && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {msg.attachedImages.map((img) => (
                                  <div
                                    key={img.id}
                                    className="w-16 h-12 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
                                    onClick={() => setFullscreenImage(img)}
                                  >
                                    <Image src={img.url} alt="" width={64} height={48} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI response - Generated images */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Generated</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                              {msg.images.map((image) => (
                                <div
                                  key={image.id}
                                  className={cn(
                                    "group relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                                    selectedFrame.selectedImageId === image.id
                                      ? "border-green-500 ring-2 ring-green-500/20"
                                      : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                                  )}
                                  onClick={() => setFullscreenImage(image)}
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
                                  <div
                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleSelectImage(selectedFrame.id, image.id)}
                                      className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"
                                      title="Select for frame"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openCopyToFrameModal(image)}
                                      className="bg-white/90 h-7 px-2"
                                      title="Copy to another frame"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCopyToGallery(image.id)}
                                      className="bg-white/90 h-7 px-2"
                                      title="Copy to gallery"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRemoveImage(image.id, "frame", selectedFrame.id)}
                                      className="h-7 px-2"
                                      title="Remove"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Generation input - fixed at bottom */}
              <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 sm:p-4">
                <div className="max-w-3xl mx-auto">
                  {/* Attached images preview */}
                  {attachedImages.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {attachedImages.map((img) => (
                        <div key={img.id} className="relative w-12 h-9 sm:w-16 sm:h-12 rounded overflow-hidden group">
                          <Image src={img.url} alt="" fill className="object-cover" />
                          <button
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                            onClick={() => removeAttachedImage(img.id)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Describe the image..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && !e.shiftKey && handleGenerate()
                        }
                        disabled={generating}
                        className="pr-8 sm:pr-32"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPromptMaximized(true)}
                        >
                          <Maximize2 className="w-3 h-3" />
                        </Button>
                        <label className="flex items-center gap-1 text-xs text-zinc-500">
                          <input
                            type="checkbox"
                            checked={useContext}
                            onChange={(e) => setUseContext(e.target.checked)}
                            className="rounded"
                          />
                          Context
                        </label>
                      </div>
                      {/* Mobile expand button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setPromptMaximized(true)}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      onClick={() => setModelSelectorOpen(true)}
                      title="Select model"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      onClick={() => openImagePicker("frame")}
                      title="Attach reference image"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || generating}
                      className="h-10 px-3 sm:px-4 flex-shrink-0"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline ml-1">Generate</span>
                    </Button>
                  </div>
                  {/* Model indicator */}
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <p className="text-zinc-400 hidden sm:block">
                      Press Enter to generate. Hover images for actions.
                    </p>
                    {currentModel && (
                      <button
                        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        onClick={() => setModelSelectorOpen(true)}
                      >
                        <span className="font-medium">{currentModel.name}</span>
                        <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                          <DollarSign className="w-3 h-3" />
                          {currentModel.cost}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : mainView === "frames" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p className="text-lg">Select a frame to start editing</p>
              <p className="text-sm mt-1">
                Or create a new frame from the sidebar
              </p>
            </div>
          ) : (
            /* Main Chat View */
            <>
              {selectedMainChat ? (
                <>
                  {/* Main Chat header */}
                  <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base sm:text-lg font-semibold">{selectedMainChat.name}</h2>
                        <p className="text-xs sm:text-sm text-zinc-500">
                          {selectedMainChat.messages.length} prompts, {selectedMainChat.images.length} images
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main Chat history - scrollable container */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                    {selectedMainChat.messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                        <MessageSquare className="w-12 h-12 mb-4" />
                        <p>No messages yet. Start a conversation!</p>
                        <p className="text-sm mt-1">Generate images and copy them to frames</p>
                      </div>
                    ) : (
                      <div className="max-w-4xl mx-auto space-y-6">
                        {selectedMainChat.messages.map((msg) => (
                          <div key={msg.id} className="space-y-3">
                            {/* User message */}
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">You</p>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{msg.prompt}</p>
                                {msg.attachedImages && msg.attachedImages.length > 0 && (
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {msg.attachedImages.map((img) => (
                                      <div
                                        key={img.id}
                                        className="w-16 h-12 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
                                        onClick={() => setFullscreenImage(img)}
                                      >
                                        <Image src={img.url} alt="" width={64} height={48} className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* AI response - Generated images */}
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                  {msg.images.map((image) => (
                                    <div
                                      key={image.id}
                                      className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                                      onClick={() => setFullscreenImage(image)}
                                    >
                                      <Image src={image.url} alt="" fill className="object-cover" />
                                      <div
                                        className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openCopyToFrameModal(image)}
                                          className="bg-white/90 h-7 px-2"
                                          title="Copy to frame"
                                        >
                                          <ArrowRightLeft className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleCopyToGallery(image.id)}
                                          className="bg-white/90 h-7 px-2"
                                          title="Copy to gallery"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={mainChatEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Main Chat Generation input - fixed at bottom */}
                  <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 sm:p-4">
                    <div className="max-w-3xl mx-auto">
                      {/* Attached images preview */}
                      {mainChatAttachedImages.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {mainChatAttachedImages.map((img) => (
                            <div key={img.id} className="relative w-12 h-9 sm:w-16 sm:h-12 rounded overflow-hidden group">
                              <Image src={img.url} alt="" fill className="object-cover" />
                              <button
                                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                                onClick={() => setMainChatAttachedImages((prev) => prev.filter((i) => i.id !== img.id))}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Describe images..."
                            value={mainChatPrompt}
                            onChange={(e) => setMainChatPrompt(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && !e.shiftKey && handleGenerateMainChat()
                            }
                            disabled={generatingMainChat}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 flex-shrink-0"
                          onClick={() => setModelSelectorOpen(true)}
                          title="Select model"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 flex-shrink-0"
                          onClick={() => openImagePicker("mainChat")}
                          title="Attach reference image"
                        >
                          <Paperclip className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleGenerateMainChat}
                          disabled={!mainChatPrompt.trim() || generatingMainChat}
                          className="h-10 px-3 sm:px-4 flex-shrink-0"
                        >
                          {generatingMainChat ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline ml-1">Generate</span>
                        </Button>
                      </div>
                      {/* Model indicator */}
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <p className="text-zinc-400 hidden sm:block">
                          Generate images here and copy them to frames.
                        </p>
                        {currentModel && (
                          <button
                            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            onClick={() => setModelSelectorOpen(true)}
                          >
                            <span className="font-medium">{currentModel.name}</span>
                            <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                              <DollarSign className="w-3 h-3" />
                              {currentModel.cost}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                  <MessageSquare className="w-16 h-16 mb-4" />
                  <p className="text-lg">No main chat available</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
