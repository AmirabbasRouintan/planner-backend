// src/pages/calendar/PermanentNotes.tsx
import * as React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { FilePenLine, Eye } from 'lucide-react';

// Copied from planner.tsx
export interface PermanentNote {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  timestamp?: number;
}

interface PermanentNotesProps {
  permanentNotes: PermanentNote[];
  setQuickNote: React.Dispatch<React.SetStateAction<string>>;
  setNotePreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  setNotePopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function PermanentNotes({
  permanentNotes,
  setQuickNote,
  setNotePreviewMode,
  setNotePopupOpen,
}: PermanentNotesProps) {
  return (
    <>
      {permanentNotes.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-sm font-medium">Permanent Notes</h3>
            <Badge variant="secondary" className="text-xs">{permanentNotes.length}</Badge>
          </div>
          <div className="space-y-1 sm:space-y-2">
            {permanentNotes.slice(0, 3).map((note) => (
              <div
                key={note.id}
                className="p-2 border rounded text-sm transition-colors"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setQuickNote(note.content);
                    setNotePreviewMode(true);
                    setNotePopupOpen(true);
                  }}
                >
                  <div className="line-clamp-2 text-xs sm:text-sm">{note.content}</div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs text-muted-foreground">
                    {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : 'Unknown date'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setQuickNote(note.content);
                        setNotePreviewMode(false); // Edit mode
                        setNotePopupOpen(true);
                      }}
                    >
                      <FilePenLine className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setQuickNote(note.content);
                        setNotePreviewMode(true); // Preview mode
                        setNotePopupOpen(true);
                      }}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {permanentNotes.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{permanentNotes.length - 3} more notes
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
