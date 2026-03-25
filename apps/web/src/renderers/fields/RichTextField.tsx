/**
 * Rich Text Field Component
 * =========================
 * TipTap-based rich text editor with toolbar.
 *
 * Features:
 * - Bold, italic, underline formatting
 * - Ordered and unordered lists
 * - Link insertion
 * - Paragraph and heading levels
 * - Placeholder text
 * - Read-only mode with rendered HTML
 */

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, LinkIcon, Undo2Icon, Redo2Icon } from "lucide-react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";
import { cn } from "~/lib/utils";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn(
        "p-1.5 rounded text-sm transition-colors",
        "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
        active && "bg-muted text-foreground",
        !active && "text-muted-foreground",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextField({ field, value, onChange, readonly }: RendererFieldProps) {
  const fieldId = React.useId();
  const controlId = `richtext-${field.name}-${fieldId}`;

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Placeholder.configure({ placeholder: `Enter ${field.label?.toLowerCase() ?? "content"}...` }),
    ],
    content: typeof value === "string" ? value : "",
    editable: !readonly,
    onUpdate({ editor: e }) {
      onChange?.(e.getHTML());
    },
  });

  const addLink = () => {
    if (!editor) return;
    const url = window.prompt("Enter URL");
    if (!url) return;
    if (editor.state.selection.empty) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().toggleLink({ href: url }).run();
    }
  };

  if (readonly) {
    return (
      <FieldWrapper field={field}>
        <div
          id={controlId}
          className="prose prose-sm max-w-none p-3 rounded-md bg-muted min-h-[4rem]"
          dangerouslySetInnerHTML={{ __html: typeof value === "string" ? value : "" }}
          aria-label={field.label}
        />
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper field={field} htmlFor={controlId}>
      <div
        className="rounded-md border focus-within:ring-2 focus-within:ring-ring overflow-hidden"
        aria-required={field.required || undefined}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <BoldIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <ItalicIcon className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive("bulletList")}
            title="Bullet List"
          >
            <ListIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrderedIcon className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolbarButton
            onClick={addLink}
            active={editor?.isActive("link")}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo2Icon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo2Icon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Editor area */}
        <EditorContent
          id={controlId}
          editor={editor}
          className="prose prose-sm max-w-none p-3 min-h-[8rem] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[7rem]"
        />
      </div>
    </FieldWrapper>
  );
}
