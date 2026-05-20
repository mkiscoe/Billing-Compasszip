import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight,
  ImageIcon, Highlighter, List, ListOrdered,
} from "lucide-react";

const HIGHLIGHT_COLORS = [
  { label: "Yellow", color: "#fef08a" },
  { label: "Green", color: "#bbf7d0" },
  { label: "Blue", color: "#bfdbfe" },
  { label: "Pink", color: "#fbcfe8" },
  { label: "Orange", color: "#fed7aa" },
];

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  minHeight?: number;
  disabled?: boolean;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str ?? "");
}

function plainToHtml(text: string): string {
  if (!text?.trim()) return "";
  return text
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function RichTextEditor({
  value,
  onChange,
  onImageUpload,
  minHeight = 280,
  disabled = false,
}: RichTextEditorProps) {
  const [showHighlights, setShowHighlights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TiptapImage.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ],
    content: isHtml(value) ? value : plainToHtml(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = isHtml(value) ? value : plainToHtml(value);
    if (editor.getHTML() !== incoming) {
      editor.commands.setContent(incoming, false);
    }
  }, [value]);

  useEffect(() => {
    if (!showHighlights) return;
    function onClickOutside(e: MouseEvent) {
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) {
        setShowHighlights(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showHighlights]);

  async function handleImageFile(file: File) {
    if (!onImageUpload) return;
    setUploading(true);
    try {
      const url = await onImageUpload(file);
      editor?.chain().focus().setImage({ src: url }).run();
    } finally {
      setUploading(false);
    }
  }

  if (!editor) return null;

  const ToolBtn = ({
    active,
    onClick,
    title,
    children,
    disabled: btnDisabled,
  }: {
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={btnDisabled}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded text-sm transition-colors disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent text-foreground"
      )}
    >
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;

  const currentColor = editor.getAttributes("textStyle").color ?? "#000000";

  return (
    <div className={cn("border rounded-md overflow-hidden flex flex-col", disabled && "opacity-60 pointer-events-none")}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40 select-none">
        <select
          className="h-7 text-xs border rounded px-1.5 bg-background mr-1 cursor-pointer"
          value={
            editor.isActive("heading", { level: 1 }) ? "1" :
            editor.isActive("heading", { level: 2 }) ? "2" :
            editor.isActive("heading", { level: 3 }) ? "3" : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setHeading({ level: Number(v) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="p">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <Sep />

        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>

        <Sep />

        <ToolBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Center">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>

        <Sep />

        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>

        <Sep />

        <div className="relative flex items-center" title="Text color">
          <button
            type="button"
            className="h-7 w-7 flex flex-col items-center justify-center rounded hover:bg-accent gap-0.5"
            onClick={() => colorInputRef.current?.click()}
            title="Text color"
          >
            <span className="text-xs font-bold leading-none" style={{ color: currentColor }}>A</span>
            <span className="w-4 h-1 rounded-sm" style={{ backgroundColor: currentColor }} />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            value={currentColor}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </div>

        <div className="relative" ref={highlightRef}>
          <ToolBtn
            active={editor.isActive("highlight")}
            onClick={() => setShowHighlights((v) => !v)}
            title="Highlight"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </ToolBtn>
          {showHighlights && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-1.5 flex items-center gap-1">
              <button
                type="button"
                title="Remove highlight"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlights(false); }}
                className="h-5 w-5 rounded border text-[10px] flex items-center justify-center text-muted-foreground hover:bg-accent"
              >✕</button>
              {HIGHLIGHT_COLORS.map((h) => (
                <button
                  key={h.color}
                  type="button"
                  title={h.label}
                  onClick={() => { editor.chain().focus().setHighlight({ color: h.color }).run(); setShowHighlights(false); }}
                  className="h-5 w-5 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: h.color }}
                />
              ))}
            </div>
          )}
        </div>

        {onImageUpload && (
          <>
            <Sep />
            <ToolBtn
              onClick={() => imageInputRef.current?.click()}
              title="Insert image"
              disabled={uploading}
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolBtn>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageFile(f);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      <EditorContent editor={editor} className="rich-editor" style={{ minHeight }} />
    </div>
  );
}

export function RichTextViewer({ html, className }: { html: string; className?: string }) {
  const isRich = isHtml(html);
  if (!isRich) {
    return <p className={cn("whitespace-pre-wrap text-sm text-muted-foreground", className)}>{html}</p>;
  }
  return (
    <div
      className={cn("rich-content text-sm", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
