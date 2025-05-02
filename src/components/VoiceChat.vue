<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import AnimatedAICircle from "./AnimatedAICircle.vue";
import DottedProgressBar from "./DottedProgressBar.vue";
import ResponseUi from "./ResponseUi.vue";

// Web Speech API type definitions
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error?: Error;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
}

// Extending the global Window type
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// サーバーレスポンスの型定義
// Type definition for server response
interface ServerResponse {
  name?: string;
  url?: string;
  error?: string;
  [key: string]: unknown;
}

// データの初期化
// Initialize data
const messages = ref<{ role: string; content: string }[]>([]);
const isListening = ref(false);
const isProcessing = ref(false);
const isSendingContext = ref(false);
const serverResponse = ref<ServerResponse | null>(null);
const isAISpeaking = ref(false);
const conversationActive = ref(false);
const profileCompleteness = ref(0);
const userTopics = ref(new Set<string>());
const conversationSummary = ref("");
const conversationFinished = ref(false);
const showDebugPanel = ref(false);
const showNameInput = ref(true);
const userName = ref("");
// 会話の完了判定に必要なトピック
// Topics required for conversation completion
const requiredTopics = [
  "hobby",
  "hobbies",
  "interest",
  "interests",
  "work",
  "job",
  "profession",
  "career",
  "education",
  "school",
  "university",
  "college",
  "family",
  "relationship",
  "married",
  "children",
  "location",
  "country",
  "city",
  "live",
];

// SpeechRecognition setup
let recognition: SpeechRecognition | null = null;

// Constants for speech recognition configuration
const SPEECH_CONFIG = {
  language: 'en-US',
  continuous: false,
  interimResults: false,
  endDelay: 5000, // 5 seconds delay after recognition ends
  errorRetryDelay: 1000, // 1 second delay before retrying after error
};

// Initialize speech recognition
const initializeSpeechRecognition = () => {
  if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
    alert("This browser does not support speech recognition.");
    return;
  }

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) return;

  recognition = new SpeechRecognitionAPI();
  recognition.lang = SPEECH_CONFIG.language;
  recognition.continuous = SPEECH_CONFIG.continuous;
  recognition.interimResults = SPEECH_CONFIG.interimResults;

  setupRecognitionHandlers();
};

// Setup all recognition event handlers
const setupRecognitionHandlers = () => {
  if (!recognition) return;
  recognition.onresult = handleRecognitionResult;
  recognition.onerror = handleRecognitionError;
  recognition.onend = handleRecognitionEnd;
};

// Handle successful speech recognition
const handleRecognitionResult = (event: SpeechRecognitionEvent) => {
  const transcript = event.results[0][0].transcript;
  addMessage("user", transcript);
  getAIResponse(transcript);
};

// Handle recognition errors
const handleRecognitionError = (event: SpeechRecognitionEvent) => {
  isListening.value = false;
  if (conversationActive.value && !conversationFinished.value) {
    setTimeout(() => {
      startListening();
    }, SPEECH_CONFIG.errorRetryDelay);
  }
};

// Handle recognition end
const handleRecognitionEnd = () => {
  setTimeout(() => {
    isListening.value = false;
  }, SPEECH_CONFIG.endDelay);
};

// Start listening for speech
const startListening = () => {
  if (!canStartListening()) return;
  
  isListening.value = true;
  recognition?.start();
};

// Check if we can start listening
const canStartListening = (): boolean => {
  return Boolean(
    recognition &&
    !isListening.value &&
    !isProcessing.value &&
    conversationActive.value &&
    !conversationFinished.value
  );
};

onMounted(() => {
  initializeSpeechRecognition();
  document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  if (recognition) {
    recognition.abort();
  }
  conversationActive.value = false;
  document.removeEventListener("keydown", handleKeyDown);
});

// キーボードショートカットハンドラー
// Keyboard shortcut handler
const handleKeyDown = (event: KeyboardEvent) => {
  // Cmd + . (Macの場合はmetaKey、Windowsの場合はctrlKey)
  if ((event.metaKey || event.ctrlKey) && event.key === ".") {
    showDebugPanel.value = !showDebugPanel.value;
  }
};

// AI発話終了時に自動的に次の音声認識を開始するための監視
// Monitor to automatically start next speech recognition when AI speech ends
watch(isAISpeaking, (newValue) => {
  if (
    !newValue &&
    conversationActive.value &&
    !conversationFinished.value &&
    !isListening.value &&
    !isProcessing.value
  ) {
    // AI発話が終わったら少し待ってから音声認識再開
    setTimeout(() => {
      startListening();
    }, 800);
  }
});

// 会話開始関数（テンプレートから呼び出されるため、外部に公開）
// Conversation start function (exposed for template use)
const startConversation = () => {
  conversationActive.value = true;
  conversationFinished.value = false;
  profileCompleteness.value = 0;
  userTopics.value.clear();
  messages.value = [];
  serverResponse.value = null;
  startListening();
};

// 会話を一時停止/再開する関数
// Function to pause/resume conversation
const toggleConversation = () => {
  if (conversationActive.value) {
    // 会話を一時停止
    conversationActive.value = false;
    isListening.value = false;
    if (recognition) {
      recognition.stop();
    }
    if (window.speechSynthesis && isAISpeaking.value) {
      window.speechSynthesis.cancel();
      isAISpeaking.value = false;
    }
  } else {
    // 会話を再開
    conversationActive.value = true;
    conversationFinished.value = false;
    startListening();
  }
};

const addMessage = (role: "user" | "assistant", content: string) => {
  messages.value.push({ role, content });

  // ユーザーメッセージの場合、プロファイル完全性を評価
  if (role === "user") {
    updateProfileCompleteness(content);
  }
};

// ユーザーの発言からプロファイル完全性を評価する
// Evaluate profile completeness from user's speech
const updateProfileCompleteness = (userMessage: string) => {
  // 文字数の目標値（1000文字で100%とする）
  const targetCharCount = 100;
  const targetMessageCount = 5;

  // すべてのユーザーメッセージを集計
  const allUserMessages = messages.value
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content)
    .join(" ");

  // 現在の文字数を計算
  const currentCharCount = allUserMessages.length;
  const currentMessageCount = messages.value.filter(
    (msg) => msg.role === "user"
  ).length;

  // 文字数による進捗率（50%）
  const charCompleteness = Math.min(
    50,
    Math.floor((currentCharCount / targetCharCount) * 50)
  );

  // メッセージ数による進捗率（50%）
  const messageCompleteness = Math.min(
    50,
    Math.floor((currentMessageCount / targetMessageCount) * 50)
  );

  // 合計進捗率
  const completenessPercentage = charCompleteness + messageCompleteness;

  // 進捗を更新
  profileCompleteness.value = completenessPercentage;

  // デバッグ用にトピックも検出しておく（UI表示用）
  requiredTopics.forEach((topic) => {
    if (userMessage.toLowerCase().includes(topic)) {
      userTopics.value.add(topic);
    }
  });

  // Add debug logging
  console.log("Profile Completeness:", {
    charCompleteness,
    messageCompleteness,
    totalPercentage: completenessPercentage,
    currentCharCount,
    currentMessageCount,
    targetCharCount,
    targetMessageCount
  });

  if (completenessPercentage >= 100) {
    console.log("Conversation finished - Conditions met");
    finishConversation();
  }
};

// 会話を終了し、サーバーにコンテキストを送信
// End conversation and send context to server
const finishConversation = async () => {
  if (conversationFinished.value) return;

  conversationFinished.value = true;
  conversationActive.value = false;

  if (recognition) {
    recognition.stop();
  }

  isListening.value = false;

  // AIに最後のメッセージ（会話終了の通知）を追加
  addMessage(
    "assistant",
    "Thank you for chatting with me! I've learned a lot about you. Let me summarize what I know so far.",
  );

  try {
    // 会話を要約するためにAIを呼び出す
    await summarizeConversation();

    // サーバーにユーザーコンテキストを送信
    await sendUserContext();
  } catch (error) {
    console.error("Error in conversation finish process:", error);
    addMessage(
      "assistant",
      "I encountered an error while processing your information. Please try again later."
    );
  }
};

// 会話の要約を作成
// Create conversation summary
const summarizeConversation = async () => {
  isProcessing.value = true;

  try {
    const conversationHistory = messages.value.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch("/api/chat-completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "Summarize what you've learned about the user in a concise, structured format. Include their hobbies, work, education, family, and location information if available. Format the summary as bullet points. After the summary, generate a list of relevant tags (single words) that describe the user's interests, skills, and background. Format the tags as a comma-separated list at the end of your response, prefixed with 'TAGS:'",
          },
          ...conversationHistory,
        ],
        model: "gpt-4",
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const fullResponse = data.choices[0].message.content.trim();
    
    // Extract tags from the response
    const tagsMatch = fullResponse.match(/TAGS:(.*)/);
    if (tagsMatch) {
      const tagsString = tagsMatch[1].trim();
      const extractedTags = tagsString.split(',').map((tag: string) => tag.trim().toLowerCase());
      userTopics.value = new Set([...userTopics.value, ...extractedTags]);
    }
    
    // Remove the TAGS: part from the summary
    conversationSummary.value = fullResponse.replace(/TAGS:.*/, '').trim();

    isAISpeaking.value = true;
    await speakText(conversationSummary.value);
    isAISpeaking.value = false;
  } catch (error) {
    conversationSummary.value = "Could not generate summary.";
  } finally {
    isProcessing.value = false;
  }
};

const getAIResponse = async (userText: string) => {
  isProcessing.value = true;

  try {
    const conversationHistory = messages.value
      .slice(-6)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    if (
      conversationHistory.length > 0 &&
      conversationHistory[conversationHistory.length - 1].role === "user"
    ) {
      conversationHistory.pop();
    }

    const response = await fetch("/api/chat-completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `Hi, I want you to ask questions about my interests, skills, and background. So, that you can pin point the industries and missions that I am interested in.
            Ask questions one at a time and keep an conversational flow after each response. Ensure every response has a follow up questions that dives deeper into learning about the user. Don't ask me things that won't help you learn about me.`,
          },
          ...conversationHistory,
          { role: "user", content: userText },
        ],
        model: "gpt-4",
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    addMessage("assistant", aiResponse);
    handleAIResponse(aiResponse);
  } catch (error) {
    addMessage("assistant", "Sorry, an error occurred. Please try again.");
    isAISpeaking.value = false;
  } finally {
    isProcessing.value = false;
  }
};

const handleAIResponse = (response: string) => {
  // AI発話状態をアクティブにする
  isAISpeaking.value = true;

  // 音声合成でAIの返答を読み上げる
  speakText(response).finally(() => {
    isAISpeaking.value = false;
  });
};

const speakText = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";

      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find((voice) => voice.lang.includes("en-US"));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      resolve();
    }
  });
};

const sendUserContext = async () => {
  isSendingContext.value = true;
  serverResponse.value = null;

  try {
    const userInfo =
      conversationSummary.value ||
      messages.value
        .filter((msg) => msg.role === "user")
        .map((msg) => msg.content)
        .join(" ");

    const response = await fetch('/api/user-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userName.value || "Anonymous User",
        user_context: userInfo || "No information is available about this user yet.",
        tags: Array.from(userTopics.value)
      }),
    });

    if (!response.ok) {
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    serverResponse.value = data;
  } catch (error) {
    serverResponse.value = {
      error: "An error occurred while communicating with the server.",
    };
  } finally {
    isSendingContext.value = false;
  }
};

const handleNameSubmit = () => {
  if (userName.value.trim()) {
    showNameInput.value = false;
    startConversation();
  }
};
</script>

<template>
  <div class="flex h-screen bg-[#A7C2D3]">
    <!-- Name Input Modal -->
    <div v-if="showNameInput" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4 text-gray-800">Welcome to Peer</h2>
        <p class="text-gray-600 mb-6">Please enter your name to start the conversation</p>
        <p class="text-sm text-gray-500 mb-4">After starting, say "Hello Peer!" to begin the conversation</p>
        <div class="flex gap-4">
          <input
            v-model="userName"
            type="text"
            placeholder="Enter your name"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="handleNameSubmit"
          />
          <button
            @click="handleNameSubmit"
            class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    </div>

    <!-- プロファイル完成度インジケーター（固定位置：画面下部中央） -->
    <div
      v-if="!conversationFinished && !serverResponse"
      class="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 w-64"
    >
      <DottedProgressBar :progress="profileCompleteness" />
    </div>
    <!-- メインコンテンツ -->
    <div class="flex-1 flex flex-col">
      <header class="border-b p-4">
        <h1 class="text-2xl font-bold text-white">Peer</h1>
      </header>
      <main class="flex-1 overflow-y-auto p-4">
        <div
          class="max-w-3xl mx-auto flex justify-center items-center h-full overflow-y-auto"
        >
          <!-- AI発話時のアニメーション円 - クリックでスタート（初期状態） -->
          <div
            v-if="
              !conversationActive &&
              !conversationFinished &&
              messages.length === 0 &&
              !serverResponse
            "
            class="w-full h-full flex justify-center items-center cursor-pointer"
            @click="startConversation"
          >
            <AnimatedAICircle :is-active="false" />
          </div>

          <!-- 会話進行中のアニメーション円 -->
          <div
            v-else-if="
              conversationActive && !conversationFinished && !serverResponse
            "
            class="flex flex-col justify-center items-center my-10"
            @click="toggleConversation"
          >
            <AnimatedAICircle :is-active="isAISpeaking" />
            <div class="mt-4 text-white text-sm font-medium">
              Conversing - Tap to pause
            </div>
          </div>

          <!-- 会話一時停止中のアニメーション円 -->
          <div
            v-else-if="
              !conversationActive &&
              !conversationFinished &&
              messages.length > 0 &&
              !serverResponse
            "
            class="flex flex-col justify-center items-center my-10"
            @click="toggleConversation"
          >
            <AnimatedAICircle :is-active="false" />
            <div class="mt-4 text-white text-sm font-medium">
              Paused - Tap to resume
            </div>
          </div>

          <!-- ResponseUiコンポーネントを使用 -->
          <ResponseUi
            v-if="
              serverResponse || (conversationFinished && conversationSummary)
            "
            :conversation-summary="conversationSummary"
            :conversation-finished="conversationFinished"
            :server-response="serverResponse"
          />
        </div>
      </main>
    </div>

    <!-- デバッグパネル (Cmd+.で表示/非表示) -->
    <div
      v-if="showDebugPanel"
      class="w-1/3 border-l border-gray-200 bg-gray-50 overflow-auto"
    >
      <div class="p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">Debug Panel</h2>
          <div class="text-xs text-gray-500">Press Cmd+. to close</div>
        </div>

        <div class="mb-4 bg-white rounded-lg p-3 shadow-sm">
          <div class="text-sm font-semibold mb-2">Status</div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              Active: <span class="font-mono">{{ conversationActive }}</span>
            </div>
            <div>
              Finished:
              <span class="font-mono">{{ conversationFinished }}</span>
            </div>
            <div>
              Listening: <span class="font-mono">{{ isListening }}</span>
            </div>
            <div>
              Speaking: <span class="font-mono">{{ isAISpeaking }}</span>
            </div>
            <div>
              Processing: <span class="font-mono">{{ isProcessing }}</span>
            </div>
            <div>
              Sending: <span class="font-mono">{{ isSendingContext }}</span>
            </div>
            <div>
              Profile completeness:
              <span class="font-mono">{{ profileCompleteness }}%</span>
            </div>
          </div>
          <div class="mt-3 flex justify-end gap-2">
            <button
              v-if="!conversationFinished && messages.length > 0"
              class="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
              @click="finishConversation"
            >
              End Conversation
            </button>
            <button
              v-if="!conversationActive && !conversationFinished"
              class="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded"
              @click="toggleConversation"
            >
              Resume
            </button>
            <button
              v-if="conversationActive && !conversationFinished"
              class="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded"
              @click="toggleConversation"
            >
              Pause
            </button>
            <button
              v-if="messages.length > 0"
              class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
              :disabled="isSendingContext"
              @click="sendUserContext"
            >
              Send User Context
            </button>
          </div>
        </div>

        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <div class="text-sm font-semibold">Conversation Log</div>
            <div class="text-xs text-gray-500">
              {{ messages.length }} messages
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm h-96 overflow-y-auto">
            <div
              v-if="messages.length === 0"
              class="p-4 text-center text-gray-400 text-sm"
            >
              No conversation started
            </div>
            <div v-else>
              <div
                v-for="(message, index) in messages"
                :key="index"
                class="border-b last:border-0 p-3"
              >
                <div
                  class="font-semibold text-xs mb-1"
                  :class="
                    message.role === 'user' ? 'text-blue-600' : 'text-green-600'
                  "
                >
                  {{ message.role === "user" ? "User" : "AI" }}
                </div>
                <div class="text-sm whitespace-pre-wrap">
                  {{ message.content }}
                </div>
                <div class="text-xs text-gray-400 mt-1 text-right">
                  {{ new Date().toLocaleTimeString() }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <div class="text-sm font-semibold mb-2">Detected Topics</div>
          <div class="bg-white rounded-lg p-3 shadow-sm">
            <div v-if="userTopics.size === 0" class="text-gray-400 text-sm">
              No topics detected
            </div>
            <div v-else class="flex flex-wrap gap-1">
              <div
                v-for="topic in Array.from(userTopics)"
                :key="topic"
                class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
              >
                {{ topic }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: #f9f9f9;
}

.message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  max-width: 80%;
}

.user-message {
  align-self: flex-end;
  margin-left: auto;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
}

.assistant-message {
  align-self: flex-start;
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
}

.listening-indicator,
.processing-indicator {
  text-align: center;
  color: #1890ff;
  margin: 0.5rem 0;
  font-style: italic;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.text-input-container {
  display: flex;
  width: 100%;
}

.text-input {
  flex: 1;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #d9d9d9;
  border-radius: 2rem 0 0 2rem;
  outline: none;
}

.text-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.send-button {
  padding: 0.75rem 1.5rem;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 0 2rem 2rem 0;
  cursor: pointer;
  transition: all 0.3s;
}

.send-button:hover:not(:disabled) {
  background-color: #096dd9;
}

.send-button:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.voice-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.mic-button,
.send-context-button {
  font-size: 1.2rem;
  padding: 0.75rem 2rem;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 2rem;
  cursor: pointer;
  transition: all 0.3s;
}

.mic-button:hover:not(:disabled),
.send-context-button:hover:not(:disabled) {
  background-color: #096dd9;
  transform: scale(1.05);
}

.mic-button:disabled,
.send-context-button:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.send-context-button {
  background-color: #52c41a;
}

.send-context-button:hover:not(:disabled) {
  background-color: #389e0d;
}

.server-response {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f0f0f0;
  border-radius: 0.5rem;
  border: 1px solid #d9d9d9;
}

.server-response pre {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
  background-color: #fff;
  padding: 0.5rem;
  border-radius: 0.3rem;
}
</style>
