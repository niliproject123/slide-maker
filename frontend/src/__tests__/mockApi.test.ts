jest.mock("uuid", () => ({
  v4: () => "test-uuid-" + Math.random().toString(36).substring(7),
}));

import { mockApi } from "@/lib/mockApi";

describe("mockApi", () => {
  describe("projects", () => {
    it("should list projects", async () => {
      const projects = await mockApi.projects.list();
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    it("should create a project", async () => {
      const name = "Test Project " + Date.now();
      const project = await mockApi.projects.create(name);
      expect(project).toBeDefined();
      expect(project.name).toBe(name);
      expect(project.id).toBeDefined();
    });

    it("should get a project by id", async () => {
      const projects = await mockApi.projects.list();
      const project = await mockApi.projects.get(projects[0].id);
      expect(project).toBeDefined();
      expect(project?.id).toBe(projects[0].id);
      expect(project?.videos).toBeDefined();
    });

    it("should update a project", async () => {
      const project = await mockApi.projects.create("Update Test");
      const newName = "Updated Name";
      const updated = await mockApi.projects.update(project.id, newName);
      expect(updated?.name).toBe(newName);
    });

    it("should delete a project", async () => {
      const project = await mockApi.projects.create("Delete Test");
      const result = await mockApi.projects.delete(project.id);
      expect(result).toBe(true);
      const deleted = await mockApi.projects.get(project.id);
      expect(deleted).toBeNull();
    });
  });

  describe("videos", () => {
    it("should create a video in a project", async () => {
      const project = await mockApi.projects.create("Video Test Project");
      const video = await mockApi.videos.create(project.id, "Test Video");
      expect(video).toBeDefined();
      expect(video.name).toBe("Test Video");
      expect(video.projectId).toBe(project.id);
    });

    it("should list videos in a project", async () => {
      const project = await mockApi.projects.create("Video List Project");
      await mockApi.videos.create(project.id, "Video 1");
      await mockApi.videos.create(project.id, "Video 2");
      const videos = await mockApi.videos.list(project.id);
      expect(videos.length).toBeGreaterThanOrEqual(2);
    });

    it("should get video with details", async () => {
      const project = await mockApi.projects.create("Video Details Project");
      const video = await mockApi.videos.create(project.id, "Details Video");
      const details = await mockApi.videos.get(video.id);
      expect(details).toBeDefined();
      expect(details?.context).toBeDefined();
      expect(details?.frames).toBeDefined();
    });
  });

  describe("frames", () => {
    it("should create a frame in a video", async () => {
      const project = await mockApi.projects.create("Frame Test Project");
      const video = await mockApi.videos.create(project.id, "Frame Video");
      const frame = await mockApi.frames.create(video.id, "Test Frame");
      expect(frame).toBeDefined();
      expect(frame.title).toBe("Test Frame");
      expect(frame.videoId).toBe(video.id);
    });

    it("should reorder frames", async () => {
      const project = await mockApi.projects.create("Reorder Project");
      const video = await mockApi.videos.create(project.id, "Reorder Video");
      const frame1 = await mockApi.frames.create(video.id, "Frame 1");
      const frame2 = await mockApi.frames.create(video.id, "Frame 2");
      const frame3 = await mockApi.frames.create(video.id, "Frame 3");

      // Move frame3 to position 0
      const reordered = await mockApi.frames.reorder(frame3.id, 0);
      expect(reordered[0].id).toBe(frame3.id);
    });
  });

  describe("context", () => {
    it("should get and update context", async () => {
      const project = await mockApi.projects.create("Context Project");
      const video = await mockApi.videos.create(project.id, "Context Video");

      const context = await mockApi.context.get(video.id);
      expect(context).toBeDefined();
      expect(context?.content).toBe("");

      await mockApi.context.update(video.id, "New context content");
      const updated = await mockApi.context.get(video.id);
      expect(updated?.content).toBe("New context content");
    });
  });

  describe("image generation", () => {
    it("should generate images for a frame", async () => {
      const project = await mockApi.projects.create("Generate Project");
      const video = await mockApi.videos.create(project.id, "Generate Video");
      const frame = await mockApi.frames.create(video.id, "Generate Frame");

      const message = await mockApi.generate.images(
        frame.id,
        "A beautiful sunset"
      );
      expect(message).toBeDefined();
      expect(message.images).toHaveLength(4);
      expect(message.images[0].url).toContain("picsum.photos");
    });
  });

  describe("image operations", () => {
    it("should select an image for a frame", async () => {
      const project = await mockApi.projects.create("Select Project");
      const video = await mockApi.videos.create(project.id, "Select Video");
      const frame = await mockApi.frames.create(video.id, "Select Frame");
      const message = await mockApi.generate.images(frame.id, "test");

      const updated = await mockApi.images.select(
        frame.id,
        message.images[0].id
      );
      expect(updated?.selectedImageId).toBe(message.images[0].id);
    });

    it("should copy an image to gallery", async () => {
      const project = await mockApi.projects.create("Copy Project");
      const video = await mockApi.videos.create(project.id, "Copy Video");
      const frame = await mockApi.frames.create(video.id, "Copy Frame");
      const message = await mockApi.generate.images(frame.id, "test");

      await mockApi.images.copy(message.images[0].id, "gallery", project.id);
      const gallery = await mockApi.gallery.list(project.id);
      expect(gallery.some((img) => img.id === message.images[0].id)).toBe(true);
    });

    it("should remove an image from a frame", async () => {
      const project = await mockApi.projects.create("Remove Project");
      const video = await mockApi.videos.create(project.id, "Remove Video");
      const frame = await mockApi.frames.create(video.id, "Remove Frame");
      const message = await mockApi.generate.images(frame.id, "test");

      await mockApi.images.remove(message.images[0].id, "frame", frame.id);
      const frames = await mockApi.frames.list(video.id);
      const updatedFrame = frames.find((f) => f.id === frame.id);
      expect(
        updatedFrame?.images.some((img) => img.id === message.images[0].id)
      ).toBe(false);
    });
  });
});
