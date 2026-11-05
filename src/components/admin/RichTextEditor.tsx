'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/cn';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  allowImages?: boolean;
};

type HeadingLevel = 2 | 3 | 4;

const LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'];

function normalizeEditorHtml(editor: Editor): string {
  return editor.isEmpty ? '' : editor.getHTML();
}

function normalizeLink(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return LINK_PROTOCOLS.includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function imageAltFromName(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function memuatGambar(data: DataTransfer | null): boolean {
  if (!data) return false;
  if ([...data.files].some((file) => file.type.startsWith('image/'))) return true;
  return /<img\b/i.test(data.getData('text/html'));
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold text-ink-muted transition-colors duration-150',
        'hover:bg-white hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
        active && 'bg-white text-brand-700 shadow-sm',
        disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent hover:text-ink-muted',
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <span aria-hidden className="mx-1 h-6 w-px bg-brand-100" />;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Tulis konten di sini...',
  minHeight = '280px',
  allowImages = true,
}: Props) {
  const onChangeRef = useRef(onChange);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmittedRef = useRef(value || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        protocols: ['mailto'],
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        isAllowedUri: (url) => !!normalizeLink(url),
      }),
      ...(allowImages
        ? [
            Image.configure({
              allowBase64: false,
              HTMLAttributes: {
                loading: 'lazy',
              },
            }),
          ]
        : []),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-editor-surface',
      },
      ...(allowImages
        ? {}
        : {
            handlePaste: (_view, event) => memuatGambar(event.clipboardData),
            handleDrop: (_view, event) => memuatGambar(event.dataTransfer),
          }),
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = normalizeEditorHtml(currentEditor);
      lastEmittedRef.current = html;
      onChangeRef.current(html);
    },
  }, [allowImages]);

  useEffect(() => {
    if (!editor) return;

    const nextValue = value || '';
    const currentValue = normalizeEditorHtml(editor);
    if (nextValue !== currentValue && nextValue !== lastEmittedRef.current) {
      editor.commands.setContent(nextValue, false);
    }
  }, [editor, value]);

  const disabled = !editor || uploading;

  function run(command: (editor: Editor) => void) {
    if (!editor) return;
    setError(null);
    command(editor);
  }

  function setLink() {
    if (!editor) return;

    const previous = editor.getAttributes('link').href as string | undefined;
    const raw = window.prompt('Masukkan URL tautan', previous || 'https://');
    if (raw === null) return;

    const normalized = normalizeLink(raw);
    if (!normalized) {
      if (!raw.trim()) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        setError(null);
        return;
      }
      setError('URL hanya boleh menggunakan http, https, atau mailto.');
      return;
    }

    setError(null);
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!allowImages || !file || !editor) return;

    const formData = new FormData();
    formData.set('file', file);
    setUploading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error || 'Gagal mengunggah gambar');
        return;
      }

      editor
        .chain()
        .focus()
        .setImage({ src: data.url, alt: imageAltFromName(file.name) || 'Gambar konten' })
        .run();
    } catch {
      setError('Gagal mengunggah gambar');
    } finally {
      setUploading(false);
    }
  }

  function headingButton(level: HeadingLevel) {
    return (
      <ToolbarButton
        key={level}
        label={`Heading ${level}`}
        active={editor?.isActive('heading', { level })}
        disabled={disabled}
        onClick={() => run((item) => item.chain().focus().toggleHeading({ level }).run())}
      >
        H{level}
      </ToolbarButton>
    );
  }

  return (
    <div
      data-rich-editor
      className="rounded-xl border border-brand-100 bg-white transition-colors duration-150 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-brand-100 bg-brand-50/50 px-2 py-2">
        <ToolbarButton
          label="Paragraf"
          active={editor?.isActive('paragraph')}
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().setParagraph().run())}
        >
          P
        </ToolbarButton>
        {[2, 3, 4].map((level) => headingButton(level as HeadingLevel))}
        <ToolbarSeparator />
        <ToolbarButton
          label="Bold"
          active={editor?.isActive('bold')}
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().toggleBold().run())}
        >
          <i className="fa-solid fa-bold" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive('italic')}
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().toggleItalic().run())}
        >
          <i className="fa-solid fa-italic" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Strike"
          active={editor?.isActive('strike')}
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().toggleStrike().run())}
        >
          <i className="fa-solid fa-strikethrough" aria-hidden />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label="Blockquote"
          active={editor?.isActive('blockquote')}
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().toggleBlockquote().run())}
        >
          <i className="fa-solid fa-quote-left" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={editor?.isActive('codeBlock')}
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().toggleCodeBlock().run())}
        >
          <i className="fa-solid fa-code" aria-hidden />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label="Ordered list"
          active={editor?.isActive('orderedList')}
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().toggleOrderedList().run())}
        >
          <i className="fa-solid fa-list-ol" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor?.isActive('bulletList')}
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().toggleBulletList().run())}
        >
          <i className="fa-solid fa-list-ul" aria-hidden />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label="Link"
          active={editor?.isActive('link')}
          disabled={disabled}
          onClick={setLink}
        >
          <i className="fa-solid fa-link" aria-hidden />
        </ToolbarButton>
        {allowImages && (
          <ToolbarButton
            label={uploading ? 'Mengunggah gambar' : 'Unggah gambar'}
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <i className={cn('fa-solid', uploading ? 'fa-spinner fa-spin' : 'fa-image')} aria-hidden />
          </ToolbarButton>
        )}
        <ToolbarSeparator />
        <ToolbarButton
          label="Bersihkan format"
          disabled={disabled}
          onClick={() => run((item) => item.chain().focus().unsetAllMarks().clearNodes().run())}
        >
          <i className="fa-solid fa-eraser" aria-hidden />
        </ToolbarButton>
      </div>

      <div className="relative">
        {(!editor ? !(value || '').trim() : editor.isEmpty) && (
          <span className="pointer-events-none absolute left-3.5 top-3 text-sm text-ink-soft/70">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} className="rich-editor-content" style={{ minHeight }} />
      </div>

      {allowImages && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageUpload}
        />
      )}

      {error && (
        <div role="alert" className="border-t border-red-100 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
