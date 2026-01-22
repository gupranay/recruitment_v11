import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { Button } from "./ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Quote,
  LucideIcon,
} from "lucide-react";
import { useEffect } from "react";

// Simple markdown to HTML converter for paste
function markdownToHTML(text: string): string {
  // Split into lines for processing
  const lines = text.split("\n");
  const processedLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmedLine = line.trim();

    // Handle code blocks first
    if (trimmedLine.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        processedLines.push(`<pre><code>${codeBlockContent.join("\n")}</code></pre>`);
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Close lists if needed (but allow empty lines within lists)
    if (trimmedLine && !trimmedLine.match(/^[-*]\s*/) && !trimmedLine.match(/^\d+\.\s*/) && !trimmedLine.match(/^#{1,6}\s/) && !trimmedLine.match(/^>\s/)) {
      if (inUnorderedList) {
        processedLines.push("</ul>");
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push("</ol>");
        inOrderedList = false;
      }
    }

    // Headers (must check before other patterns)
    if (trimmedLine.match(/^###\s/)) {
      const content = trimmedLine.replace(/^###\s+/, "");
      processedLines.push(`<h2>${processInlineMarkdown(content)}</h2>`);
      continue;
    } else if (trimmedLine.match(/^##\s/)) {
      const content = trimmedLine.replace(/^##\s+/, "");
      processedLines.push(`<h1>${processInlineMarkdown(content)}</h1>`);
      continue;
    } else if (trimmedLine.match(/^#\s/)) {
      const content = trimmedLine.replace(/^#\s+/, "");
      processedLines.push(`<h1>${processInlineMarkdown(content)}</h1>`);
      continue;
    }

    // Blockquotes
    if (trimmedLine.match(/^>\s/)) {
      const content = trimmedLine.replace(/^>\s+/, "");
      processedLines.push(`<blockquote>${processInlineMarkdown(content)}</blockquote>`);
      continue;
    }

    // Unordered lists - handle both with and without content
    const unorderedMatch = trimmedLine.match(/^[-*]\s*(.+)?$/);
    if (unorderedMatch) {
      if (!inUnorderedList) {
        if (inOrderedList) {
          processedLines.push("</ol>");
          inOrderedList = false;
        }
        processedLines.push("<ul>");
        inUnorderedList = true;
      }
      const content = unorderedMatch[1] || "";
      processedLines.push(`<li>${content ? processInlineMarkdown(content) : ""}</li>`);
      continue;
    }

    // Ordered lists - handle both with and without content
    const orderedMatch = trimmedLine.match(/^\d+\.\s*(.+)?$/);
    if (orderedMatch) {
      if (!inOrderedList) {
        if (inUnorderedList) {
          processedLines.push("</ul>");
          inUnorderedList = false;
        }
        processedLines.push("<ol>");
        inOrderedList = true;
      }
      const content = orderedMatch[1] || "";
      processedLines.push(`<li>${content ? processInlineMarkdown(content) : ""}</li>`);
      continue;
    }

    // Regular paragraphs
    if (trimmedLine) {
      processedLines.push(`<p>${processInlineMarkdown(trimmedLine)}</p>`);
    } else {
      // Empty line
      processedLines.push("");
    }
  }

  // Close any open lists
  if (inUnorderedList) processedLines.push("</ul>");
  if (inOrderedList) processedLines.push("</ol>");
  if (inCodeBlock) {
    processedLines.push(`<pre><code>${codeBlockContent.join("\n")}</code></pre>`);
  }

  return processedLines.join("\n");
}

// Process inline markdown (bold, italic, links, code)
function processInlineMarkdown(text: string): string {
  let html = text;

  // Code (do first to avoid conflicts)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold (must be before italic to avoid conflicts)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic (avoid matching bold - use negative lookahead/lookbehind)
  // First handle bold, then italic
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, "<em>$1</em>");

  return html;
}

// Check if text looks like markdown
function isMarkdown(text: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /^>\s/m, // Blockquotes
    /^[-*]\s/m, // Unordered lists
    /^\d+\.\s/m, // Ordered lists
    /\[.*?\]\(.*?\)/, // Links
    /```/, // Code blocks
    /`.*?`/, // Inline code
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}

// Toolbar item interface
export interface ToolbarItem {
  id: string;
  icon: LucideIcon;
  label: string;
  command: (editor: any) => void;
  isActive?: (editor: any) => boolean;
  isDisabled?: (editor: any) => boolean;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  toolbarItems?: ToolbarItem[];
}

// Default toolbar items
export const createDefaultToolbarItems = (): ToolbarItem[] => [
  {
    id: "bold",
    icon: Bold,
    label: "Bold",
    command: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
  },
  {
    id: "italic",
    icon: Italic,
    label: "Italic",
    command: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
  },
  {
    id: "bulletList",
    icon: List,
    label: "Bullet List",
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
  },
  {
    id: "orderedList",
    icon: ListOrdered,
    label: "Ordered List",
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
  },
  {
    id: "heading1",
    icon: Heading1,
    label: "Heading 1",
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
  },
  {
    id: "heading2",
    icon: Heading2,
    label: "Heading 2",
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
  },
  {
    id: "blockquote",
    icon: Quote,
    label: "Quote",
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
  },
  {
    id: "undo",
    icon: Undo,
    label: "Undo",
    command: (editor) => editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
  },
  {
    id: "redo",
    icon: Redo,
    label: "Redo",
    command: (editor) => editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
  },
];

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
  toolbarItems,
}: RichTextEditorProps) {
  // Use provided toolbar items or default
  const items = toolbarItems || createDefaultToolbarItems();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        bulletList: false,
        orderedList: false,
        // Enable markdown shortcuts (already enabled by default in StarterKit)
      }),
      BulletList,
      OrderedList,
      ListItem,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-2",
        placeholder: placeholder || "Start typing...",
      },
    },
  });

  // Add effect to handle content changes from parent
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Add paste handler for markdown conversion
  useEffect(() => {
    if (!editor) return;

    const handlePaste = (view: any, event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return false;

      const text = clipboardData.getData("text/plain");
      if (!text || text.trim().length < 3) return false;

      // Check if it's markdown
      if (isMarkdown(text)) {
        event.preventDefault();
        
        // Convert markdown to HTML
        const html = markdownToHTML(text);
        
        // Insert the converted HTML using the editor instance
        editor.commands.insertContent(html);
        return true;
      }
      
      return false;
    };

    // Add paste handler to editor view props
    const originalProps = { ...editor.view.props };
    editor.view.setProps({
      ...originalProps,
      handlePaste,
    });

    return () => {
      // Restore original props on cleanup
      editor.view.setProps(originalProps);
    };
  }, [editor]);


  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md flex flex-col h-full">
      <div className="border-b p-2 flex flex-wrap gap-1 flex-shrink-0">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive ? item.isActive(editor) : false;
          const isDisabled = item.isDisabled ? item.isDisabled(editor) : false;

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => item.command(editor)}
              onTouchEnd={(e) => {
                e.preventDefault();
                item.command(editor);
              }}
              className={isActive ? "bg-muted" : ""}
              disabled={isDisabled}
              type="button"
              title={item.label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-4"
        />
      </div>
      <style jsx global>{`
        .ProseMirror {
          min-height: 200px;
          outline: none;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror ul {
          padding: 0 1em;
          list-style-type: disc;
        }
        .ProseMirror ol {
          padding: 0 1em;
          list-style-type: decimal;
        }
        .ProseMirror h1 {
          font-size: 1.5em;
          margin: 1em 0 0.5em;
        }
        .ProseMirror h2 {
          font-size: 1.25em;
          margin: 1em 0 0.5em;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #999;
          margin: 1em 0;
          padding-left: 1em;
          color: #666;
        }
        .ProseMirror li {
          margin: 0.5em 0;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
