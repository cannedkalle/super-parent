'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CalendarSettings, Child, Camp, Booking } from '@/lib/db';
import { Download, Upload, Share2, Check, AlertOctagon } from 'lucide-react';

interface PlannerState {
  settings: CalendarSettings;
  children: Child[];
  camps: Camp[];
  bookings: Booking[];
}

interface ShareImportProps {
  settings: CalendarSettings;
  childrenList: Child[];
  camps: Camp[];
  bookings: Booking[];
  onImportState: (state: PlannerState) => Promise<void>;
  variant?: 'card' | 'header';
}

export default function ShareImport({
  settings,
  childrenList,
  camps,
  bookings,
  onImportState,
  variant = 'card',
}: ShareImportProps) {
  const [copied, setCopied] = useState(false);
  const [sharedState, setSharedState] = useState<PlannerState | null>(null);
  const importDialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL query parameters for ?share= on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');

    if (shareParam) {
      try {
        // UTF-8 safe base64 decoding
        const decodedJson = decodeURIComponent(
          escape(window.atob(shareParam))
        );
        const parsedState = JSON.parse(decodedJson);

        // Simple validation to ensure it matches PlannerState
        if (
          parsedState &&
          typeof parsedState === 'object' &&
          'settings' in parsedState &&
          'children' in parsedState &&
          'camps' in parsedState &&
          'bookings' in parsedState
        ) {
          setSharedState(parsedState);
          // Wait for DOM to register before showing modal
          setTimeout(() => {
            importDialogRef.current?.showModal();
          }, 300);
        }
      } catch (err) {
        console.error('Failed to parse shared schedule link:', err);
      }
    }
  }, []);

  const handleExportJSON = () => {
    const state: PlannerState = {
      settings,
      children: childrenList,
      camps,
      bookings,
    };

    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `summer_camp_planner_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsedState = JSON.parse(text);

        // Validate structure
        if (
          !parsedState ||
          typeof parsedState !== 'object' ||
          !('settings' in parsedState) ||
          !('children' in parsedState) ||
          !('camps' in parsedState) ||
          !('bookings' in parsedState)
        ) {
          alert('Invalid file format. Please upload a valid Summer Camp Planner JSON file.');
          return;
        }

        if (confirm('Importing this JSON will overwrite your current schedule. Do you want to proceed?')) {
          await onImportState(parsedState);
          alert('Schedule imported successfully!');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to read or parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleShareLink = () => {
    if (typeof window === 'undefined') return;

    const state: PlannerState = {
      settings,
      children: childrenList,
      camps,
      bookings,
    };

    try {
      const jsonString = JSON.stringify(state);
      // UTF-8 safe base64 encoding
      const base64String = window.btoa(
        unescape(encodeURIComponent(jsonString))
      );

      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${base64String}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate shareable link.');
    }
  };

  const handleConfirmImport = async () => {
    if (sharedState) {
      await onImportState(sharedState);
      handleCloseDialog();
      alert('Shared schedule imported successfully!');
    }
  };

  const handleCloseDialog = () => {
    importDialogRef.current?.close();
    setSharedState(null);
    // Clear ?share= from URL bar without reloading
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  if (variant === 'header') {
    return (
      <div className="flex align-center gap-2 flex-wrap">
        <button
          className="btn btn-secondary"
          onClick={handleShareLink}
          title="Copy sharing link to clipboard"
        >
          {copied ? (
            <>
              <Check size={15} style={{ color: 'var(--accent-sage)' }} />
              Copied Link!
            </>
          ) : (
            <>
              <Share2 size={15} />
              Share Link
            </>
          )}
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleExportJSON}
          title="Download full schedule backup file"
        >
          <Download size={15} />
          Export JSON
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          title="Upload planner backup file"
        >
          <Upload size={15} />
          Import JSON
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          style={{ display: 'none' }}
        />

        {/* Accessible native Dialog prompt for Shared URL Import */}
        <dialog
          ref={importDialogRef}
          className="glass"
          style={{
            margin: 'auto',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            padding: '1.75rem',
            maxWidth: '460px',
            width: '90%',
            outline: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.95)'
          }}
          aria-labelledby="import-dialog-title-header"
          onClose={handleCloseDialog}
        >
          {sharedState && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(195, 106, 85, 0.1)', color: 'var(--accent-terracotta)', marginBottom: '1rem' }}>
                <AlertOctagon size={32} />
              </div>
              
              <h3 id="import-dialog-title-header" className="mb-2" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Import Shared Schedule?
              </h3>
              
              <p className="mb-4" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                You have loaded a shared summer schedule containing{' '}
                <strong>{sharedState.children.length} children</strong>,{' '}
                <strong>{sharedState.camps.length} camps</strong>, and{' '}
                <strong>{sharedState.bookings.length} bookings</strong>.
              </p>
              
              <div
                className="mb-4 p-3"
                style={{
                  backgroundColor: 'rgba(195, 106, 85, 0.05)',
                  border: '1px solid rgba(195, 106, 85, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--accent-terracotta)',
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}
              >
                ⚠️ Warning: Importing will completely overwrite your current summer planner schedule. This action cannot be undone.
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  className="btn btn-terracotta"
                  onClick={handleConfirmImport}
                  style={{ padding: '0.625rem 1.5rem' }}
                >
                  Yes, Overwrite &amp; Import
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleCloseDialog}
                  style={{ padding: '0.625rem 1.5rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </dialog>
      </div>
    );
  }

  return (
    <div className="glass-card mb-6">
      <h3 className="mb-3" style={{ fontSize: '1.15rem' }}>Backup &amp; Sharing</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Export to file or share calendar links with spouse/friends without a database.
      </p>

      <div className="flex flex-col gap-2">
        <button
          className="btn btn-outline"
          onClick={handleShareLink}
          style={{ width: '100%' }}
        >
          {copied ? (
            <>
              <Check size={16} style={{ color: 'var(--accent-sage)' }} />
              Link Copied!
            </>
          ) : (
            <>
              <Share2 size={16} />
              Share Calendar Link
            </>
          )}
        </button>

        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={handleExportJSON}
            style={{ flex: 1, padding: '0.625rem 0.5rem', fontSize: '0.85rem' }}
            title="Download full backup"
          >
            <Download size={15} />
            Export JSON
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ flex: 1, padding: '0.625rem 0.5rem', fontSize: '0.85rem' }}
            title="Upload backup file"
          >
            <Upload size={15} />
            Import JSON
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          style={{ display: 'none' }}
        />
      </div>

      {/* Accessible native Dialog prompt for Shared URL Import */}
      <dialog
        ref={importDialogRef}
        className="glass"
        style={{
          margin: 'auto',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          padding: '1.75rem',
          maxWidth: '460px',
          width: '90%',
          outline: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.95)'
        }}
        aria-labelledby="import-dialog-title"
        onClose={handleCloseDialog}
      >
        {sharedState && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(195, 106, 85, 0.1)', color: 'var(--accent-terracotta)', marginBottom: '1rem' }}>
              <AlertOctagon size={32} />
            </div>
            
            <h3 id="import-dialog-title" className="mb-2" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              Import Shared Schedule?
            </h3>
            
            <p className="mb-4" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              You have loaded a shared summer schedule containing{' '}
              <strong>{sharedState.children.length} children</strong>,{' '}
              <strong>{sharedState.camps.length} camps</strong>, and{' '}
              <strong>{sharedState.bookings.length} bookings</strong>.
            </p>
            
            <div
              className="mb-4 p-3"
              style={{
                backgroundColor: 'rgba(195, 106, 85, 0.05)',
                border: '1px solid rgba(195, 106, 85, 0.15)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--accent-terracotta)',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              ⚠️ Warning: Importing will completely overwrite your current summer planner schedule. This action cannot be undone.
            </div>

            <div className="flex gap-3 justify-center">
              <button
                className="btn btn-terracotta"
                onClick={handleConfirmImport}
                style={{ padding: '0.625rem 1.5rem' }}
              >
                Yes, Overwrite &amp; Import
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCloseDialog}
                style={{ padding: '0.625rem 1.5rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
