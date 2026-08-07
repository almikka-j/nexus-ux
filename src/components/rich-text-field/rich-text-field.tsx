'use client';

import { useEffect } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// Shared rich-text field for CI Report's narrative sections (Subject As
// Of, Spouse, Assets, Negative Record remarks, Health and Habits,
// Comments) — the only rich-text component in this codebase. Value is
// stored as an HTML string (Tiptap's default `getHTML()` output), same
// "everything is a string in AdminContext" convention every other field
// in this app follows. No debounce: onChange fires on every keystroke,
// same as every controlled TextField elsewhere in this app.
// ----------------------------------------------------------------------

function ToolbarButton({
  icon,
  active,
  onClick,
  label,
}: {
  icon: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <IconButton
      size="small"
      onClick={onClick}
      aria-label={label}
      sx={{
        borderRadius: '6px',
        color: active ? '#1C2A6E' : '#8891A6',
        bgcolor: active ? '#EEF1FE' : 'transparent',
        '&:hover': { bgcolor: active ? '#EEF1FE' : '#F5F6FA' },
      }}
    >
      <Iconify icon={icon} width={16} />
    </IconButton>
  );
}

export function RichTextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    editorProps: {
      attributes: {
        style: 'min-height: 96px; padding: 10px 12px; font-size: 14px; outline: none;',
      },
    },
  });

  // Resync the editor whenever `value` changes from OUTSIDE the editor itself
  // (pre-fill effects, transcript upload, sample-data fill/clear). `useEditor`
  // only reads `content` once at initialization, so without this the editor's
  // visible content goes stale after any programmatic update to `value`.
  //
  // The `value !== currentHtml` check is what prevents an infinite loop / the
  // user's cursor from jumping while typing: when the user types, `onUpdate`
  // calls `onChange(html)`, which flows back in as the new `value` prop — but
  // by then `editor.getHTML()` already equals that same html, so this effect
  // is a no-op. It only calls `setContent` when `value` changed externally.
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      // `emitUpdate: false` — don't fire `onUpdate` for this programmatic
      // change, since it would just feed `value` right back into itself.
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A', mb: 0.75 }}>
        {label}
      </Typography>
      <Box sx={{ border: '1px solid #DDE1EA', borderRadius: '10px', overflow: 'hidden', bgcolor: 'common.white' }}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ px: 1, py: 0.5, borderBottom: '1px solid #EEF0F5', bgcolor: '#FAFBFD' }}
        >
          <ToolbarButton
            icon="solar:text-bold-bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
          />
          <ToolbarButton
            icon="solar:text-italic-bold"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
          />
          <ToolbarButton
            icon="solar:list-bold"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="Bulleted list"
          />
          <ToolbarButton
            icon="solar:list-check-bold"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="Numbered list"
          />
        </Stack>
        <Box
          sx={{
            '& .ProseMirror': { minHeight: 96 },
            ...(placeholder && {
              // NOTE: `placeholder` must not contain double-quote characters — it is
              // interpolated directly into a CSS `content` string with no escaping.
              '& .ProseMirror p.is-editor-empty:first-of-type::before': {
                content: `"${placeholder}"`,
                color: '#A0A7B5',
                float: 'left',
                height: 0,
                pointerEvents: 'none',
              },
            }),
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
    </Box>
  );
}
