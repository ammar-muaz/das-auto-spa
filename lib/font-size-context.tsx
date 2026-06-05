"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type FontSize = "small" | "medium" | "large";

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType>({
  fontSize: "medium",
  setFontSize: () => {},
});

const fontSizePx: Record<FontSize, string> = {
  small: "13px",
  medium: "16px",
  large: "19px",
};

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");

  useEffect(() => {
    const saved = localStorage.getItem("fontSize") as FontSize | null;
    if (saved === "small" || saved === "medium" || saved === "large") {
      setFontSizeState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSizePx[fontSize];
    localStorage.setItem("fontSize", fontSize);
  }, [fontSize]);

  const setFontSize = (size: FontSize) => setFontSizeState(size);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export const useFontSize = () => useContext(FontSizeContext);
