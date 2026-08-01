"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isIosDevice = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
};

const detectInstalled = () => {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return standaloneMedia || iosStandalone;
};

export function useAddToHomeScreen() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    setIsInstalled(detectInstalled());
    setIsIos(isIosDevice());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanPrompt(true);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setCanPrompt(false);
      setDeferredPrompt(null);
    };

    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsInstalled(true);
        setCanPrompt(false);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt || isPrompting) {
      return { outcome: "dismissed" as const };
    }

    setIsPrompting(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setCanPrompt(false);
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      return { outcome: choice.outcome };
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt, isPrompting]);

  return {
    isInstalled,
    canPrompt,
    isIos,
    isPrompting,
    promptInstall,
  };
}
