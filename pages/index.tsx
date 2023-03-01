import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { OpenAIModel, TNSChunk } from "@/types";
import { IconArrowRight, IconExternalLink, IconSearch } from "@tabler/icons-react";
import endent from "endent";
import Head from "next/head";
import { KeyboardEvent, useEffect, useRef, useState } from "react";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState<string>("");
  const [chunks, setChunks] = useState<TNSChunk[]>([]);
  const [answer, setAnswer] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [searchMessage, setSearchMessage] = useState<string>("");

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [mode, setMode] = useState<"search" | "chat">("chat");
  const [matchCount, setMatchCount] = useState<number>(3);
  const [model, setModel] = useState<OpenAIModel>(OpenAIModel.DAVINCI_TEXT);
  const [apiKey, setApiKey] = useState<string>("");

  const handleSearch = async () => {
    if (!apiKey) {
      alert("Please enter an API key.");
      return;
    }

    if (!query) {
      alert("Please enter a query.");
      return;
    }

    setAnswer("");
    setChunks([]);

    setLoading(true);
    setSearchMessage("Embedding query...");

    const searchResponse = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, apiKey, matches: matchCount })
    });

    if (!searchResponse.ok) {
      setLoading(false);
      throw new Error(searchResponse.statusText);
    }

    const results: TNSChunk[] = await searchResponse.json();

    setChunks(results);

    setLoading(false);

    inputRef.current?.focus();

    return results;
  };

  const handleAnswer = async () => {
    const results = await handleSearch();

    setSearchMessage("Generating answer...");

    const prompt = endent`
    Given the following passages from "The Network State" by Balaji Srinivasan, provide an answer to the query: "${query}"

    ${results?.map((d: any) => d.content).join("\n\n")}

    Answer:
    `;

    const answerResponse = await fetch("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt, model, apiKey })
    });

    if (!answerResponse.ok) {
      setLoading(false);
      throw new Error(answerResponse.statusText);
    }

    const data = answerResponse.body;

    if (!data) {
      return;
    }

    setLoading(false);

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      setAnswer((prev) => prev + chunkValue);
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (mode === "search") {
        handleSearch();
      } else {
        handleAnswer();
      }
    }
  };

  const handleSave = () => {
    if (apiKey.length !== 51) {
      alert("Please enter a valid API key.");
      return;
    }

    if (!model) {
      alert("Please select a model.");
      return;
    }

    localStorage.setItem("TNS_KEY", apiKey);
    localStorage.setItem("TNS_MODEL", model);
    localStorage.setItem("TNS_MATCH_COUNT", matchCount.toString());
    localStorage.setItem("TNS_MODE", mode);

    setShowSettings(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    localStorage.removeItem("TNS_KEY");
    localStorage.removeItem("TNS_MODEL");
    localStorage.removeItem("TNS_MATCH_COUNT");
    localStorage.removeItem("TNS_MODE");

    setApiKey("");
    setModel(OpenAIModel.DAVINCI_TEXT);
    setMatchCount(3);
    setMode("search");
  };

  useEffect(() => {
    if (mode === "search") {
      setMatchCount(3);
    } else {
      setMatchCount(1);
    }
  }, [mode]);

  useEffect(() => {
    const TNS_KEY = localStorage.getItem("TNS_KEY");
    const TNS_MODEL = localStorage.getItem("TNS_MODEL");
    const TNS_MATCH_COUNT = localStorage.getItem("TNS_MATCH_COUNT");
    const TNS_MODE = localStorage.getItem("TNS_MODE");

    if (TNS_KEY) {
      setApiKey(TNS_KEY);
    }

    if (TNS_MODEL) {
      setModel(TNS_MODEL as OpenAIModel);
    }

    if (TNS_MATCH_COUNT) {
      setMatchCount(parseInt(TNS_MATCH_COUNT));
    }

    if (TNS_MODE) {
      setMode(TNS_MODE as "search" | "chat");
    }

    inputRef.current?.focus();
  }, []);

  return (
    <>
      <Head>
        <title>The Network State GPT</title>
        <meta
          name="description"
          content={`AI-powered search and chat for Balaji Srinivasan's "The Network State."`}
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>

      <div className="flex flex-col h-screen">
        <Navbar />
        <div className="flex-1 overflow-auto">
          <div className="mx-auto flex h-full w-full max-w-[750px] flex-col items-center px-3 pt-4 sm:pt-8">
            <button
              className="mt-4 flex cursor-pointer items-center space-x-2 rounded-full border border-zinc-600 px-3 py-1 text-sm hover:opacity-50"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? "Hide" : "Show"} Settings
            </button>

            {showSettings && (
              <div className="w-[340px] sm:w-[400px]">
                <div>
                  <div>Mode</div>
                  <select
                    className="max-w-[400px] block w-full cursor-pointer rounded-md border border-gray-300 p-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "search" | "chat")}
                  >
                    <option value="search">Search</option>
                    <option value="chat">Chat</option>
                  </select>
                </div>

                <div className="mt-2">
                  <div>Passage Count</div>
                  <input
                    type="number"
                    min="1"
                    max={mode === "search" ? 10 : 5}
                    value={matchCount}
                    onChange={(e) => setMatchCount(Number(e.target.value))}
                    className="max-w-[400px] block w-full rounded-md border border-gray-300 p-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="mt-2">
                  <div>Model</div>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as OpenAIModel)}
                    className="max-w-[400px] block w-full cursor-pointer rounded-md border border-gray-300 p-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  >
                    {Object.values(OpenAIModel).map((model) => (
                      <option
                        key={model}
                        value={model}
                        className="bg-gray-900 text-white"
                      >
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2">
                  <div>OpenAI API Key</div>
                  <input
                    type="password"
                    placeholder="OpenAI API Key"
                    className="max-w-[400px] block w-full rounded-md border border-gray-300 p-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);

                      if (e.target.value.length !== 51) {
                        setShowSettings(true);
                      }
                    }}
                  />
                </div>

                <div className="mt-4 flex space-x-2 justify-center">
                  <div
                    className="flex cursor-pointer items-center space-x-2 rounded-full bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                    onClick={handleSave}
                  >
                    Save
                  </div>

                  <div
                    className="flex cursor-pointer items-center space-x-2 rounded-full bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                    onClick={handleClear}
                  >
                    Clear
                  </div>
                </div>
              </div>
            )}

            {apiKey.length === 51 ? (
              <div className="relative w-full mt-4">
                <IconSearch className="absolute top-3 w-10 left-1 h-6 rounded-full opacity-50 sm:left-3 sm:top-4 sm:h-8" />

                <input
                  ref={inputRef}
                  className="h-12 w-full rounded-full border border-zinc-600 pr-12 pl-11 focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 sm:h-16 sm:py-2 sm:pr-16 sm:pl-16 sm:text-lg"
                  type="text"
                  placeholder="What is a Network State?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                <button>
                  <IconArrowRight
                    onClick={mode === "search" ? handleSearch : handleAnswer}
                    className="absolute right-2 top-2.5 h-7 w-7 rounded-full bg-blue-500 p-1 hover:cursor-pointer hover:bg-blue-600 sm:right-3 sm:top-3 sm:h-10 sm:w-10 text-white"
                  />
                </button>
              </div>
            ) : (
              <div className="text-center font-bold text-3xl mt-4">Please enter your OpenAI API key in settings.</div>
            )}

            {loading ? (
              <div className="mt-8 flex items-center justify-center flex-col">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <div className="mt-8 text-xl">{searchMessage}</div>
              </div>
            ) : (
              <>
                {chunks.length > 0 ? (
                  <div className="mt-6">
                    {answer && (
                      <>
                        <div className="font-bold text-2xl">Answer</div>
                        <div className="mt-2">{answer}</div>
                      </>
                    )}

                    <div className={`${mode === "search" ? "mt-2" : "mt-6"} mb-16`}>
                      <div className="font-bold text-2xl">Passages</div>

                      {chunks.map((chunk) => (
                        <div key={chunk.chunk_num}>
                          <div className="mt-4 border border-zinc-600 rounded-lg p-4">
                            <div className="flex justify-between">
                              <div>
                                <div className="font-bold text-xl">{chunk.chapter_title}</div>
                                <div className="mt-1 font-bold">{chunk.section_title}</div>
                              </div>
                              <a
                                className="hover:opacity-50 ml-2"
                                href={chunk.section_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <IconExternalLink />
                              </a>
                            </div>
                            <div className="mt-2">{chunk.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 text-center text-lg">{`AI-powered search & chat for Balaji Srinivasan's "The Network State."`}</div>
                )}
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
