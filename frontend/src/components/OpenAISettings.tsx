"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, X, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { api, type OpenAIStatus, type OpenAITestResult } from "@/lib/api";

export function OpenAISettings() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OpenAIStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      console.error("Failed to load OpenAI status:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    try {
      const result = await api.generate.runTest();
      setStatus((prev) => prev ? { ...prev, lastTest: result } : null);
    } catch (err) {
      console.error("Test failed:", err);
      setError("Test request failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveApiKey() {
    setSaving(true);
    setError(null);
    try {
      const response = await api.generate.updateConfig(apiKey || null);
      setStatus(response.status);
      setApiKey("");
    } catch (err) {
      console.error("Failed to update API key:", err);
      setError("Failed to update API key");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearApiKey() {
    setSaving(true);
    setError(null);
    try {
      const response = await api.generate.updateConfig(null);
      setStatus(response.status);
    } catch (err) {
      console.error("Failed to clear API key:", err);
      setError("Failed to clear API key");
    } finally {
      setSaving(false);
    }
  }

  const lastTest = status?.lastTest;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        title="OpenAI Settings"
      >
        <Settings className="w-4 h-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="font-semibold text-lg">OpenAI Settings</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              {loading ? (
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
                        <span className={`text-sm font-medium ${status.mode === "openai" ? "text-green-600" : "text-yellow-600"}`}>
                          {status.mode === "openai" ? "OpenAI (Real)" : "Mock (Picsum)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">API Key:</span>
                        <span className="text-sm font-mono">
                          {status.apiKeyMasked || "Not set"}
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
                        placeholder="Enter OpenAI API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleSaveApiKey} disabled={saving || !apiKey}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
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

                        <div className="text-xs text-zinc-500">
                          Last tested: {new Date(lastTest.timestamp).toLocaleString()}
                        </div>

                        {/* Connection Test */}
                        {lastTest.details.connectionTest && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              {lastTest.details.connectionTest.success ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span>Connection Test</span>
                              {lastTest.details.connectionTest.responseTime && (
                                <span className="text-zinc-500">
                                  ({lastTest.details.connectionTest.responseTime}ms)
                                </span>
                              )}
                            </div>
                            {lastTest.details.connectionTest.error && (
                              <p className="text-xs text-red-500 ml-6">
                                {lastTest.details.connectionTest.error}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Image Generation Test */}
                        {lastTest.details.imageGenerationTest && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              {lastTest.details.imageGenerationTest.success ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span>Image Generation Test</span>
                              {lastTest.details.imageGenerationTest.responseTime && (
                                <span className="text-zinc-500">
                                  ({lastTest.details.imageGenerationTest.responseTime}ms)
                                </span>
                              )}
                            </div>
                            {lastTest.details.imageGenerationTest.error && (
                              <p className="text-xs text-red-500 ml-6">
                                {lastTest.details.imageGenerationTest.error}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Errors */}
                        {lastTest.errors.length > 0 && (
                          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-2">
                            <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                            <ul className="text-xs text-red-500 space-y-1">
                              {lastTest.errors.map((err, i) => (
                                <li key={i}>• {err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
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
