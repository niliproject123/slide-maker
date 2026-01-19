"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, Images, Trash2, X } from "lucide-react";
import { mockApi } from "@/lib/mockApi";
import type { Image as ImageType, ProjectWithVideos } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function GalleryPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectWithVideos | null>(null);
  const [images, setImages] = useState<ImageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    const [projectData, galleryImages] = await Promise.all([
      mockApi.projects.get(projectId),
      mockApi.gallery.list(projectId),
    ]);
    setProject(projectData);
    setImages(galleryImages);
    setLoading(false);
  }

  async function handleRemoveFromGallery(imageId: string) {
    await mockApi.gallery.removeImage(projectId, imageId);
    loadData();
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
  }

  async function handleDeleteImage(imageId: string) {
    await mockApi.images.delete(imageId);
    loadData();
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
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
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{project.name}</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 sm:gap-3">
                <Images className="w-6 h-6 sm:w-8 sm:h-8" />
                Gallery
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-1">
                {images.length} {images.length === 1 ? "image" : "images"} saved
              </p>
            </div>
          </div>
        </div>

        {images.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Images className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
              <p className="text-zinc-500 dark:text-zinc-400 mb-2">
                No images in gallery yet
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                Images you save from your video frames will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className={cn(
                  "group relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                  selectedImage?.id === image.id
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
                onClick={() => setSelectedImage(image)}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromGallery(image.id);
                    }}
                    className="bg-white/90 h-7 px-2"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline ml-1">Remove</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(image.id);
                    }}
                    className="h-7 px-2"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image preview modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-0 sm:p-8"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative w-full h-full sm:max-w-5xl sm:h-auto sm:aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage.url}
                alt=""
                fill
                className="object-contain"
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 bg-white/90 h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-white text-xs sm:text-sm">
                  Created: {new Date(selectedImage.createdAt).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveFromGallery(selectedImage.id)}
                    className="bg-white/90 h-8"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Remove from Gallery</span>
                    <span className="sm:hidden ml-1">Remove</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteImage(selectedImage.id)}
                    className="h-8"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Delete Permanently</span>
                    <span className="sm:hidden ml-1">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
