"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  showCursor?: boolean;
  onComplete?: () => void;
}

export function Typewriter({
  text,
  speed = 50,
  delay = 0,
  className = "",
  showCursor = true,
  onComplete,
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setHasStarted(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!hasStarted) return;

    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [displayedText, text, speed, hasStarted, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {showCursor && !isComplete && (
        <span className="typewriter-cursor" />
      )}
    </span>
  );
}

interface TypewriterLinesProps {
  lines: { text: string; className?: string }[];
  lineDelay?: number;
  typeSpeed?: number;
  className?: string;
}

export function TypewriterLines({
  lines,
  lineDelay = 500,
  typeSpeed = 30,
  className = "",
}: TypewriterLinesProps) {
  const [currentLine, setCurrentLine] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);

  const handleLineComplete = () => {
    setCompletedLines((prev) => [...prev, lines[currentLine].text]);
    if (currentLine < lines.length - 1) {
      setTimeout(() => {
        setCurrentLine((prev) => prev + 1);
      }, lineDelay);
    }
  };

  return (
    <div className={className}>
      {completedLines.map((line, index) => (
        <div key={index} className={lines[index].className}>
          {line}
        </div>
      ))}
      {currentLine < lines.length && (
        <Typewriter
          text={lines[currentLine].text}
          speed={typeSpeed}
          className={lines[currentLine].className}
          onComplete={handleLineComplete}
          showCursor={currentLine === lines.length - 1}
        />
      )}
    </div>
  );
}

interface AnimatedTerminalProps {
  lines: { prefix?: string; text: string; color?: string }[];
  className?: string;
}

export function AnimatedTerminal({ lines, className = "" }: AnimatedTerminalProps) {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [typingLine, setTypingLine] = useState(0);

  useEffect(() => {
    if (typingLine >= lines.length) return;

    const timeout = setTimeout(() => {
      setVisibleLines((prev) => [...prev, typingLine]);
      setTypingLine((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timeout);
  }, [typingLine, lines.length]);

  return (
    <div className={`font-mono text-sm ${className}`}>
      {lines.map((line, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={
            visibleLines.includes(index)
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: -10 }
          }
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`flex items-center gap-3 ${line.color || "text-text-secondary"}`}
        >
          {line.prefix && (
            <span className="text-text-muted select-none">{line.prefix}</span>
          )}
          <span>{line.text}</span>
        </motion.div>
      ))}
    </div>
  );
}
