"use client";

import { useRef, useEffect, useCallback } from "react";
import { Bold, Italic, Underline, Link2, List, X } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minRows?: number;
  placeholder?: string;
}

type ExecCommand = "bold" | "italic" | "underline" | "insertUnorderedList" | "removeFormat";

function ToolbarBtn({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent editor losing focus on toolbar click
        e.preventDefault();
        if (!disabled) onClick();
      }}
      title={title}
      disabled={disabled}
      className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
  minRows = 6,
  placeholder = "Enter content...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // Track whether the last innerHTML change came from the user typing
  const suppressSync = useRef(false);

  // Sync external value → editor (only when value changes externally)
  useEffect(() => {
    if (!editorRef.current) return;
    if (suppressSync.current) {
      suppressSync.current = false;
      return;
    }
    // Only update if content actually differs to avoid caret reset
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback(
    (command: ExecCommand) => {
      if (disabled || !editorRef.current) return;
      document.execCommand(command, false);
      suppressSync.current = true;
      onChange(editorRef.current.innerHTML);
    },
    [disabled, onChange]
  );

  const handleLink = useCallback(() => {
    if (disabled || !editorRef.current) return;
    const sel = window.getSelection();
    const selectedText = sel?.toString() || "";
    const url = prompt("Enter URL:", "https://");
    if (!url) return;
    if (selectedText) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
      );
    }
    suppressSync.current = true;
    onChange(editorRef.current.innerHTML);
  }, [disabled, onChange]);

  const handleRemoveLink = useCallback(() => {
    if (disabled || !editorRef.current) return;
    document.execCommand("unlink", false);
    suppressSync.current = true;
    onChange(editorRef.current.innerHTML);
  }, [disabled, onChange]);

  const handleInput = useCallback(() => {
    suppressSync.current = true;
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange]);

  const minHeight = `${minRows * 1.625}rem`;

  return (
    <div
      className={`rounded-lg border border-white/10 overflow-hidden transition-colors focus-within:border-indigo-500/50 ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/[0.03]">
        <ToolbarBtn onClick={() => exec("bold")} title="Bold" disabled={disabled}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("italic")} title="Italic" disabled={disabled}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("underline")} title="Underline" disabled={disabled}>
          <Underline className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Bullet List" disabled={disabled}>
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <ToolbarBtn onClick={handleLink} title="Insert / Edit Link" disabled={disabled}>
          <Link2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={handleRemoveLink} title="Remove Link" disabled={disabled}>
          <X className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <ToolbarBtn onClick={() => exec("removeFormat")} title="Clear Formatting" disabled={disabled}>
          <span className="text-[10px] font-bold leading-none">Tx</span>
        </ToolbarBtn>
      </div>

      {/* Editable content area */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        suppressContentEditableWarning
        style={{ minHeight }}
        data-placeholder={placeholder}
        className={[
          "px-4 py-3 text-sm text-white bg-white/5 focus:outline-none",
          // Prose-like styles for rendered HTML content
          "[&_b]:font-bold [&_strong]:font-bold",
          "[&_i]:italic [&_em]:italic",
          "[&_u]:underline",
          "[&_a]:text-indigo-400 [&_a]:underline [&_a:hover]:text-indigo-300",
          "[&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1",
          "[&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1",
          "[&_p]:mb-2 [&_br]:leading-relaxed",
          // Placeholder via CSS
          "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500 empty:before:pointer-events-none",
        ].join(" ")}
      />
    </div>
  );
}
