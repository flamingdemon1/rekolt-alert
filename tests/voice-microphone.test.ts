import assert from "node:assert/strict";
import test from "node:test";
import {
  microphoneErrorMessage,
  startManualSpeechRecording,
} from "../app/lib/voice-client";

type MutableGlobal = typeof globalThis & {
  window?: unknown;
  navigator?: unknown;
};

function installBrowserMocks({
  getUserMedia,
  audioContext,
}: {
  getUserMedia?: () => Promise<MediaStream>;
  audioContext?: new () => AudioContext;
}) {
  const target = globalThis as MutableGlobal;
  const windowDescriptor = Object.getOwnPropertyDescriptor(target, "window");
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    target,
    "navigator",
  );
  Object.defineProperty(target, "window", {
    configurable: true,
    value: {
      AudioContext: audioContext,
      clearTimeout,
      isSecureContext: true,
      location: { hostname: "localhost" },
      setTimeout,
    },
  });
  Object.defineProperty(target, "navigator", {
    configurable: true,
    value: getUserMedia ? { mediaDevices: { getUserMedia } } : {},
  });

  return () => {
    if (windowDescriptor) {
      Object.defineProperty(target, "window", windowDescriptor);
    } else {
      Reflect.deleteProperty(target, "window");
    }
    if (navigatorDescriptor) {
      Object.defineProperty(target, "navigator", navigatorDescriptor);
    } else {
      Reflect.deleteProperty(target, "navigator");
    }
  };
}

test("microphone permission denial is clear and leaves no pending request", async () => {
  const restore = installBrowserMocks({
    getUserMedia: () =>
      Promise.reject(
        new DOMException("Permission was denied", "NotAllowedError"),
      ),
  });
  try {
    await assert.rejects(
      startManualSpeechRecording(),
      (error: unknown) =>
        microphoneErrorMessage(error, "en") ===
        "Microphone permission was denied.",
    );
  } finally {
    restore();
  }
});

test("unsupported browser returns the documented voice error", async () => {
  const restore = installBrowserMocks({});
  try {
    await assert.rejects(
      startManualSpeechRecording(),
      (error: unknown) =>
        microphoneErrorMessage(error, "mfe") ===
        "Ou browser pa suport anrezistreman lavwa.",
    );
  } finally {
    restore();
  }
});

test("granted permission starts a cancellable recording", async () => {
  const track = { stopCalled: false, stop() { this.stopCalled = true; } };
  const stream = {
    getTracks: () => [track],
  } as unknown as MediaStream;
  const node = {
    connect() {},
    disconnect() {},
  };
  class FakeAudioContext {
    destination = {};
    sampleRate = 48_000;
    createGain() {
      return { ...node, gain: { value: 1 } };
    }
    createMediaStreamSource() {
      return node;
    }
    createScriptProcessor() {
      return { ...node, onaudioprocess: null };
    }
    async close() {}
    async resume() {}
  }
  const restore = installBrowserMocks({
    audioContext: FakeAudioContext as unknown as new () => AudioContext,
    getUserMedia: async () => stream,
  });
  try {
    const recorder = await startManualSpeechRecording();
    recorder.cancel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(track.stopCalled, true);
  } finally {
    restore();
  }
});
