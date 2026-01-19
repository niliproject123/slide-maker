// Re-export from the real API layer
// This file maintains backwards compatibility with existing imports
// To switch back to mock mode, replace this with the original mock implementation

export { api as mockApi } from "./api";
export { default } from "./api";
