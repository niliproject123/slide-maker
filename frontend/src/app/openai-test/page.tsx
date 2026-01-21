"use client";

import { useEffect, useState } from "react";

interface TestResult {
  test: string;
  status: "pending" | "success" | "error";
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

interface TestResponse {
  summary: {
    total: number;
    passed: number;
    failed: number;
    allPassed: boolean;
  };
  results: TestResult[];
  error?: string;
}

type TestType = "openai" | "api";

export default function OpenAITestPage() {
  const [testType, setTestType] = useState<TestType>("openai");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async (type: TestType) => {
    setLoading(true);
    setData(null);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const endpoint = type === "openai" ? "/openai-test" : "/api-generate-test";
      const response = await fetch(`${apiUrl}${endpoint}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || `HTTP ${response.status}`);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests(testType);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <span className="text-green-500 text-xl">✓</span>;
      case "error":
        return <span className="text-red-500 text-xl">✗</span>;
      default:
        return <span className="text-yellow-500 text-xl">○</span>;
    }
  };

  const getImageUrls = (result: TestResult): { input?: string; output?: string } => {
    const urls: { input?: string; output?: string } = {};

    if (result.request?.input_image_url) {
      urls.input = result.request.input_image_url as string;
    }

    if (result.response) {
      if (result.response.input_image_url) {
        urls.input = result.response.input_image_url as string;
      }
      if (result.response.url) {
        urls.output = result.response.url as string;
      }
      if (result.response.output_image_url) {
        urls.output = result.response.output_image_url as string;
      }
      if (result.response.generated_url) {
        urls.output = result.response.generated_url as string;
      }
      if (result.response.imageUrl) {
        urls.output = result.response.imageUrl as string;
      }
    }

    return urls;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">OpenAI API Test</h1>
        <p className="text-gray-400 mb-6">
          Testing OpenAI integration
        </p>

        {/* Test Type Selection */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setTestType("openai");
              runTests("openai");
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              testType === "openai"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Raw OpenAI Tests
          </button>
          <button
            onClick={() => {
              setTestType("api");
              runTests("api");
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              testType === "api"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            API Generate Tests
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          {testType === "openai"
            ? "Tests raw OpenAI API calls (chat, DALL-E, vision)"
            : "Tests the generate API endpoints with OpenAI service integration"}
        </p>

        {loading && (
          <div className="flex items-center gap-3 text-yellow-400">
            <div className="animate-spin h-5 w-5 border-2 border-yellow-400 border-t-transparent rounded-full" />
            Running tests... (this may take 30-60 seconds for image generation)
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <h2 className="text-red-400 font-semibold">Error</h2>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {data && (
          <>
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-semibold mb-2">Summary</h2>
              <div className="flex gap-6">
                <div>
                  <span className="text-gray-400">Total:</span>{" "}
                  <span className="font-mono">{data.summary.total}</span>
                </div>
                <div>
                  <span className="text-green-400">Passed:</span>{" "}
                  <span className="font-mono">{data.summary.passed}</span>
                </div>
                <div>
                  <span className="text-red-400">Failed:</span>{" "}
                  <span className="font-mono">{data.summary.failed}</span>
                </div>
              </div>
              <div className="mt-2">
                {data.summary.allPassed ? (
                  <span className="text-green-400 font-semibold">
                    All tests passed!
                  </span>
                ) : (
                  <span className="text-red-400 font-semibold">
                    Some tests failed
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {data.results.map((result, index) => {
                const imageUrls = getImageUrls(result);

                return (
                  <div
                    key={index}
                    className={`bg-gray-800 rounded-lg p-4 border ${
                      result.status === "success"
                        ? "border-green-500/30"
                        : result.status === "error"
                        ? "border-red-500/30"
                        : "border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(result.status)}
                      <h3 className="text-lg font-semibold">{result.test}</h3>
                      {result.duration && (
                        <span className="text-gray-500 text-sm ml-auto">
                          {(result.duration / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>

                    {result.error && (
                      <div className="bg-red-900/30 rounded p-3 mb-3">
                        <span className="text-red-400 font-mono text-sm">
                          {result.error}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-gray-400 text-sm mb-1">Request</h4>
                        <pre className="bg-gray-900 rounded p-3 text-xs overflow-auto max-h-48">
                          {JSON.stringify(result.request, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-gray-400 text-sm mb-1">Response</h4>
                        <pre className="bg-gray-900 rounded p-3 text-xs overflow-auto max-h-48">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {(imageUrls.input || imageUrls.output) && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {imageUrls.input && (
                          <div>
                            <h4 className="text-gray-400 text-sm mb-2">
                              Input Image
                            </h4>
                            <img
                              src={imageUrls.input}
                              alt="Input"
                              className="rounded-lg max-w-full border border-gray-700"
                            />
                          </div>
                        )}
                        {imageUrls.output && (
                          <div>
                            <h4 className="text-gray-400 text-sm mb-2">
                              Output Image
                            </h4>
                            <img
                              src={imageUrls.output}
                              alt="Output"
                              className="rounded-lg max-w-full border border-gray-700"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-gray-700">
          <a
            href="/projects"
            className="text-blue-400 hover:text-blue-300 transition"
          >
            ← Back to Projects
          </a>
        </div>
      </div>
    </div>
  );
}
