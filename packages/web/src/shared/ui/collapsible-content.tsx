"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleContentProps {
  children: ReactNode;
  /** Maximum height in pixels when collapsed. Default: 150 */
  maxHeight?: number;
  defaultExpanded?: boolean;
  className?: string;
}

export function CollapsibleContent({
  children,
  maxHeight = 150,
  defaultExpanded = false,
  className,
}: CollapsibleContentProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setIsOverflowing(el.scrollHeight > maxHeight);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);

    return () => observer.disconnect();
  }, [children, maxHeight]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={contentRef}
        style={{
          maxHeight: expanded ? "none" : `${maxHeight}px`,
          overflow: "hidden",
        }}
        className="transition-[max-height] duration-200"
      >
        {children}
      </div>
      {isOverflowing && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}
