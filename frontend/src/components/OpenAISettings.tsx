"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, X, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { api, type OpenAIStatus, type OpenAITestResult } from "@/lib/api";

export function OpenAISettings() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OpenAIStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  // Reload status when dialog opens
  useEffect(() => {
    if (open) {
      loadStatus();
    }
  }, [open]);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const s = await api.generate.getStatus();
      setStatus(s);
      console.log("[OpenAI Status]", s);
    } catch (err) {
      console.error("[OpenAI Status] Failed to load:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    console.log("[OpenAI Test] Starting test...");
    try {
      const result = await api.generate.runTest();
      console.log("[OpenAI Test] Result:", result);
      setStatus((prev) => prev ? { ...prev, lastTest: result } : null);
    } catch (err) {
      console.error("[OpenAI Test] Failed:", err);
      setError("Test request failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveApiKey() {
    setSaving(true);
    setError(null);
    console.log("[OpenAI Config] Updating API key...");
    try {
      const response = await api.generate.updateConfig(apiKey || null);
      console.log("[OpenAI Config] Updated:", response);
      setStatus(response.status);
      setApiKey("");
    } catch (err) {
      console.error("[OpenAI Config] Failed to update:", err);
      setError("Failed to update API key");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearApiKey() {
    setSaving(true);
    setError(null);
    console.log("[OpenAI Config] Clearing API key...");
    try {
      const response = await api.generate.updateConfig(null);
      console.log("[OpenAI Config] Cleared:", response);
      setStatus(response.status);
    } catch (err) {
      console.error("[OpenAI Config] Failed to clear:", err);
      setError("Failed to clear API key");
    } finally {
      setSaving(false);
    }
  }

  const lastTest = status?.lastTest;

  // Determine status indicator
  const getStatusIndicator = () => {
    if (loading) return { color: "bg-gray-400", text: "Loading..." };
    if (!status) return { color: "bg-red-500", text: "Error" };
    if (status.mode === "openai") {
      if (lastTest?.success) return { color: "bg-green-500", text: "OpenAI OK" };
      if (lastTest && !lastTest.success) return { color: "bg-red-500", text: "OpenAI Error" };
      return { color: "bg-green-500", text: "OpenAI" };
    }
    return { color: "bg-yellow-500", text: "Mock" };
  };

  const indicator = getStatusIndicator();

  return (
    <>
      {/* Status indicator button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-2"
        onClick={() => setOpen(true)}
        title="OpenAI Settings"
      >
        <span className={`w-2 h-2 rounded-full ${indicator.color}`} />
        <span className="text-xs hidden sm:inline">{indicator.text}</span>
        <Settings className="w-4 h-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="font-semibold text-lg">OpenAI Settings</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={loadStatus}
                  disabled={loading}
                  title="Refresh status"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {loading && !status ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : error && !status ? (
                <div className="text-center py-8">
                  <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-500">{error}</p>
                  <Button variant="outline" onClick={loadStatus} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : status ? (
                <>
                  {/* Current Status */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Current Status</h3>
                    <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Mode:</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${status.mode === "openai" ? "bg-green-500" : "bg-yellow-500"}`} />
                          <span className={`text-sm font-medium ${status.mode === "openai" ? "text-green-600" : "text-yellow-600"}`}>
                            {status.mode === "openai" ? "OpenAI (Real)" : "Mock (Picsum)"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">API Key:</span>
                        <span className="text-sm font-mono">
                          {status.apiKeyMasked || "Not set"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Available:</span>
                        <span className={`text-sm font-medium ${status.available ? "text-green-600" : "text-zinc-500"}`}>
                          {status.available ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* API Key Configuration */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Configure API Key</h3>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Enter OpenAI API key (sk-...)"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button onClick={handleSaveApiKey} disabled={saving || !apiKey}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Test"}
                      </Button>
                    </div>
                    {status.apiKeySet && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearApiKey}
                        disabled={saving}
                        className="text-red-600"
                      >
                        Clear API Key (Switch to Mock)
                      </Button>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </div>

                  {/* Test Connection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Connection Test</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTest}
                        disabled={testing}
                      >
                        {testing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            Testing...
                          </>
                        ) : (
                          "Run Test"
                        )}
                      </Button>
                    </div>

                    {lastTest && (
                      <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4 space-y-3">
                        {/* Overall Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {lastTest.success ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : lastTest.mode === "mock" ? (
                              <AlertCircle className="w-5 h-5 text-yellow-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="font-medium">
                              {lastTest.success
                                ? "Test Passed"
                                : lastTest.mode === "mock"
                                ? "Mock Mode Active"
                                : "Test Failed"}
                            </span>
                          </div>
                          <span className="text-xs bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded">
                            {lastTest.testType}
                          </span>
                        </div>

                        <div className="text-xs text-zinc-500">
                          Tested: {new Date(lastTest.timestamp).toLocaleString()}
                        </div>

                        {/* Detailed Results */}
                        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-2">
                          {/* Connection Test */}
                          {lastTest.details.connectionTest && (
                            <div className="flex items-start gap-2">
                              {lastTest.details.connectionTest.success ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Connection Test</span>
                                  {lastTest.details.connectionTest.responseTime && (
                                    <span className="text-xs text-zinc-500">
                                      {lastTest.details.connectionTest.responseTime}ms
                                    </span>
                                  )}
                                </div>
                                {lastTest.details.connectionTest.error && (
                                  <p className="text-xs text-red-500 mt-1 font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
                                    {lastTest.details.connectionTest.error}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Image Generation Test */}
                          {lastTest.details.imageGenerationTest && (
                            <div className="flex items-start gap-2">
                              {lastTest.details.imageGenerationTest.success ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Image Generation Test</span>
                                  {lastTest.details.imageGenerationTest.responseTime && (
                                    <span className="text-xs text-zinc-500">
                                      {lastTest.details.imageGenerationTest.responseTime}ms
                                    </span>
                                  )}
                                </div>
                                {lastTest.details.imageGenerationTest.error && (
                                  <p className="text-xs text-red-500 mt-1 font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
                                    {lastTest.details.imageGenerationTest.error}
                                  </p>
                                )}
                                {lastTest.details.imageGenerationTest.imageUrl && (
                                  <div className="mt-2">
                                    <p className="text-xs text-zinc-500 mb-1">Generated test image:</p>
                                    <img
                                      src={lastTest.details.imageGenerationTest.imageUrl}
                                      alt="Test image"
                                      className="w-32 h-32 object-cover rounded border"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Errors */}
                        {lastTest.errors.length > 0 && (
                          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                            <p className="text-sm font-medium text-red-600 mb-2">Errors:</p>
                            <ul className="space-y-1">
                              {lastTest.errors.map((err, i) => (
                                <li key={i} className="text-xs text-red-500 font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
                                  {err}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Raw JSON Toggle */}
                        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRawJson(!showRawJson)}
                            className="text-xs"
                          >
                            {showRawJson ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                            {showRawJson ? "Hide" : "Show"} Raw JSON
                          </Button>
                          {showRawJson && (
                            <pre className="mt-2 text-xs font-mono bg-zinc-200 dark:bg-zinc-800 p-3 rounded overflow-x-auto max-h-60">
                              {JSON.stringify(lastTest, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full Status JSON (collapsible) */}
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs w-full justify-start"
                    >
                      {showRawJson ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                      {showRawJson ? "Hide" : "Show"} Full Status JSON
                    </Button>
                    {showRawJson && (
                      <pre className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900 p-3 rounded overflow-x-auto max-h-60">
                        {JSON.stringify(status, null, 2)}
                      </pre>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
