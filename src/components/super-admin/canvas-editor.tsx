'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { IDCardCanvasElement, IDCardTemplate } from '@/types';
import { getShapeStyle } from '@/lib/id-card-utils';
import { STUDENT_FIELDS, PREVIEW_DATA } from '@/lib/canvas-engine';
import QRCode from 'react-qr-code';

// ─── Constants ────────────────────────────────────────────────────────────────

const PHOTO_PREVIEW = 'https://github.com/shadcn.png';

const PRESET_GRADIENTS = [
  { name: 'Indigo Dream', value: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)' },
  { name: 'Sunrise Glow', value: 'linear-gradient(135deg,#f43f5e 0%,#fb7185 100%)' },
  { name: 'Ocean Breeze', value: 'linear-gradient(135deg,#0284c7 0%,#0ea5e9 100%)' },
  { name: 'Emerald Mesh', value: 'linear-gradient(135deg,#059669 0%,#34d399 100%)' },
  { name: 'Dark Midnight', value: 'linear-gradient(135deg,#1e293b 0%,#334155 100%)' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasEditorProps {
  template: IDCardTemplate;
  onChange: React.Dispatch<React.SetStateAction<IDCardTemplate>>;
  onSave: () => void;
  onCancel: () => void;
}

// ─── Color Input Row ─────────────────────────────────────────────────────────

function ColorInputRow({
  label, value, onChange, allowTransparent
}: { label: string; value: string; onChange: (c: string) => void; allowTransparent?: boolean }) {
  const isTrans = value === 'transparent';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', width: 84, flexShrink: 0 }}>{label}</span>
      <input
        type="color"
        value={isTrans ? '#ffffff' : value}
        onChange={e => onChange(e.target.value)}
        disabled={isTrans}
        style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: isTrans ? 'not-allowed' : 'pointer', padding: 0 }}
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          border: '1px solid #475569',
          borderRadius: 4,
          padding: '3px 6px',
          fontSize: 10,
          color: '#f1f5f9',
          background: '#0f172a',
          minWidth: 0,
        }}
      />
      {allowTransparent && (
        <button
          onClick={() => onChange(isTrans ? '#ffffff' : 'transparent')}
          style={{
            padding: '3px 6px',
            fontSize: 9,
            fontWeight: 700,
            border: isTrans ? '1px solid #3b82f6' : '1px solid #475569',
            background: isTrans ? '#3b82f6' : 'transparent',
            color: isTrans ? '#fff' : '#94a3b8',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

export default function CanvasEditor({
  template, onChange, onSave, onCancel,
}: CanvasEditorProps) {

  const elements = template.canvasElements ?? [];
  const layout = template.layout;
  const isVertical = layout === 'vertical';
  const EDIT_W = isVertical ? 340 : 520;
  const EDIT_H = isVertical ? 510 : 312;

  const cardRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'template' | 'elements' | 'properties'>('template');
  const [scale, setScale] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);
  const [copiedElement, setCopiedElement] = useState<IDCardCanvasElement | null>(null);

  // Alignment & Snapping States
  const [alignTargetId, setAlignTargetId] = useState<string>('');
  const [snapStep, setSnapStep] = useState<number>(0); // 0 = off, 2 = 2%, 5 = 5%

  // Reset align target when selected element changes
  useEffect(() => {
    setAlignTargetId('');
  }, [selected]);

  // Undo / Redo History
  const [history, setHistory] = useState<IDCardCanvasElement[][]>([elements]);
  const [histIdx, setHistIdx] = useState(0);

  const selectedEl = elements.find(e => e.id === selected) ?? null;

  // ── Auto-scale effect ─────────────────────────────────────────────────────
  const handleResize = useCallback(() => {
    if (!workspaceRef.current) return;
    const padding = 48; // Margin surrounding preview card
    const containerW = workspaceRef.current.clientWidth - padding;
    const containerH = workspaceRef.current.clientHeight - padding - 40; // Subtract toolbar height
    if (containerW <= 0 || containerH <= 0) return;

    const scaleW = containerW / EDIT_W;
    const scaleH = containerH / EDIT_H;
    // Fit both dimensions, cap at 3.0x zoom max (increased from 1.5x)
    const newScale = Math.min(scaleW, scaleH, 3.0);
    setScale(newScale);
  }, [EDIT_W, EDIT_H]);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (workspaceRef.current) {
      observer.observe(workspaceRef.current);
    }
    return () => observer.disconnect();
  }, [handleResize]);

  // ── History Actions ───────────────────────────────────────────────────────
  const updateElements = useCallback((newEls: IDCardCanvasElement[]) => {
    onChange(prev => ({ ...prev, canvasElements: newEls }));
  }, [onChange]);

  const commit = useCallback((els: IDCardCanvasElement[]) => {
    setHistory(prev => {
      const next = prev.slice(0, histIdx + 1);
      next.push(els);
      setHistIdx(next.length - 1);
      return next;
    });
    updateElements(els);
  }, [histIdx, updateElements]);

  const undo = useCallback(() => {
    if (histIdx > 0) {
      const i = histIdx - 1;
      setHistIdx(i);
      updateElements(history[i]);
    }
  }, [histIdx, history, updateElements]);

  const redo = useCallback(() => {
    if (histIdx < history.length - 1) {
      const i = histIdx + 1;
      setHistIdx(i);
      updateElements(history[i]);
    }
  }, [histIdx, history, updateElements]);

  // ── Template Modifications ────────────────────────────────────────────────
  const updateTemplateField = (key: keyof IDCardTemplate, val: any) => {
    onChange(prev => ({ ...prev, [key]: val }));
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateTemplateField('backgroundImage', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ── Element Actions ────────────────────────────────────────────────────────
  const update = useCallback((id: string, patch: Partial<IDCardCanvasElement>) => {
    commit(elements.map(e => e.id === id ? { ...e, ...patch } : e));
  }, [elements, commit]);

  const del = useCallback(() => {
    if (!selected) return;
    commit(elements.filter(e => e.id !== selected));
    setSelected(null);
  }, [selected, elements, commit]);

  const dup = useCallback(() => {
    if (!selected) return;
    const el = elements.find(e => e.id === selected);
    if (!el) return;
    const maxZ = Math.max(...elements.map(e => e.zIndex), -1);
    const clone: IDCardCanvasElement = {
      ...el,
      id: `el_${Date.now()}`,
      x: Math.min(90, el.x + 3),
      y: Math.min(90, el.y + 3),
      zIndex: maxZ + 1,
    };
    commit([...elements, clone]);
    setSelected(clone.id);
    setActiveTab('properties');
  }, [selected, elements, commit]);

  const copy = useCallback(() => {
    if (!selected) return;
    const el = elements.find(e => e.id === selected);
    if (el) setCopiedElement(el);
  }, [selected, elements]);

  const paste = useCallback(() => {
    if (!copiedElement) return;
    const maxZ = Math.max(...elements.map(e => e.zIndex), -1);
    const clone: IDCardCanvasElement = {
      ...copiedElement,
      id: `el_${Date.now()}`,
      x: Math.min(90, copiedElement.x + 4),
      y: Math.min(90, copiedElement.y + 4),
      zIndex: maxZ + 1,
    };
    commit([...elements, clone]);
    setSelected(clone.id);
    setActiveTab('properties');
  }, [copiedElement, elements, commit]);

  const clearAll = useCallback(() => {
    if (!confirm('Delete all elements from the card?')) return;
    commit([]);
    setSelected(null);
  }, [commit]);

  // ── Canvas auto positioning helpers ───────────────────────────────────────
  const nextZ = () => Math.max(...elements.map(e => e.zIndex), -1) + 1;

  const nextY = () => {
    if (elements.length === 0) return 40;
    const fieldEls = elements.filter(e => e.type === 'field' || e.type === 'labelfield');
    if (fieldEls.length === 0) return 40;
    const last = fieldEls.reduce((a, b) => (a.y + a.height > b.y + b.height ? a : b));
    return Math.min(90, last.y + last.height + 1.5);
  };

  // ── Element Creation triggers ──────────────────────────────────────────────
  const addPhoto = () => {
    const el: IDCardCanvasElement = {
      id: `el_${Date.now()}`,
      type: 'photo',
      x: isVertical ? 35 : 5, y: isVertical ? 12 : 20,
      width: isVertical ? 30 : 22, height: isVertical ? 24 : 42,
      rotation: 0, opacity: 1, zIndex: nextZ(),
      shape: 'rectangle', borderColor: template.primaryColor, borderWidth: 2,
    };
    commit([...elements, el]);
    setSelected(el.id);
    setActiveTab('properties');
  };

  const addSignature = () => {
    const el: IDCardCanvasElement = {
      id: `el_${Date.now()}`, type: 'signature',
      x: isVertical ? 28 : 5, y: isVertical ? 82 : 70,
      width: isVertical ? 44 : 22, height: isVertical ? 10 : 12,
      rotation: 0, opacity: 1, zIndex: nextZ(),
      text: template.signatureText || 'Principal', fontSize: 9, color: template.textColor || '#475569',
    };
    commit([...elements, el]);
    setSelected(el.id);
    setActiveTab('properties');
  };

  const addText = () => {
    const el: IDCardCanvasElement = {
      id: `el_${Date.now()}`, type: 'text',
      x: 10, y: nextY(),
      width: isVertical ? 80 : 60, height: 8,
      rotation: 0, opacity: 1, zIndex: nextZ(),
      text: 'IDENTITY CARD', fontSize: 12,
      fontWeight: 'bold', fontStyle: 'normal', underline: false,
      color: template.textColor || '#1e293b', align: 'center',
    };
    commit([...elements, el]);
    setSelected(el.id);
    setActiveTab('properties');
  };

  const addQRCode = () => {
    const el: IDCardCanvasElement = {
      id: `el_${Date.now()}`,
      type: 'qrcode',
      x: isVertical ? 35 : 75, y: isVertical ? 65 : 30,
      width: isVertical ? 30 : 20, height: isVertical ? 20 : 34,
      rotation: 0, opacity: 1, zIndex: nextZ(),
      borderColor: template.primaryColor, borderWidth: 1,
      bgColor: '#ffffff',
    };
    commit([...elements, el]);
    setSelected(el.id);
    setActiveTab('properties');
  };

  const addLabelField = (fieldKey: string, fieldLabel: string) => {
    const el: IDCardCanvasElement = {
      id: `el_${Date.now()}`, type: 'labelfield',
      x: isVertical ? 5 : 34, y: nextY(),
      width: isVertical ? 90 : 62, height: 8.5,
      rotation: 0, opacity: 1, zIndex: nextZ(),
      fieldKey,
      fieldLabel: fieldLabel + ' :',
      labelText: fieldLabel + ' :',
      showLabel: true,
      labelWidth: 35,
      fontSize: 10,
      fontWeight: 'normal', fontStyle: 'normal', underline: false,
      color: template.textColor || '#1e293b', labelColor: template.textColor || '#1e293b',
      align: 'left',
      fieldBgColor: '#ffffff',
    };
    commit([...elements, el]);
    setSelected(el.id);
    setActiveTab('properties');
  };

  const addField = (fieldKey: string, fieldLabel: string) => {
    const el: IDCardCanvasElement = {
      id: `el_${Date.now()}`, type: 'field',
      x: isVertical ? 10 : 34, y: nextY(),
      width: isVertical ? 80 : 62, height: 8,
      rotation: 0, opacity: 1, zIndex: nextZ(),
      fieldKey,
      // Tag as value-only so no stacked label is rendered
      fieldLabel: `__split_label_of__${fieldKey}`,
      fontSize: 10,
      fontWeight: 'normal', fontStyle: 'normal', underline: false,
      color: template.textColor || '#1e293b', align: 'left',
    };
    commit([...elements, el]);
    setSelected(el.id);
    setActiveTab('properties');
  };


  // Adds label + value as TWO separate independent draggable elements
  const addSplitField = (fieldKey: string, fieldLabel: string) => {
    const y = nextY();
    const labelEl: IDCardCanvasElement = {
      id: `el_${Date.now()}_lbl`, type: 'text',
      x: isVertical ? 5 : 34, y,
      width: isVertical ? 32 : 22, height: 7,
      rotation: 0, opacity: 1, zIndex: nextZ(),
      text: fieldLabel + ' :',
      fontSize: 10, fontWeight: 'bold', fontStyle: 'normal', underline: false,
      color: template.textColor || '#1e293b', align: 'left',
      // tag it so Properties panel knows it's a split label
      fieldLabel: `__split_label_of__${fieldKey}`,
    };
    const valueEl: IDCardCanvasElement = {
      id: `el_${Date.now() + 1}_val`, type: 'field',
      x: isVertical ? 38 : 57, y,
      width: isVertical ? 57 : 39, height: 7,
      rotation: 0, opacity: 1, zIndex: nextZ(),
      fieldKey,
      // Tag so rendering treats this as value-only (no stacked label shown)
      fieldLabel: `__split_label_of__${fieldKey}`,
      fontSize: 10,
      fontWeight: 'normal', fontStyle: 'normal', underline: false,
      color: template.textColor || '#1e293b', align: 'left',
    };
    commit([...elements, labelEl, valueEl]);
    setSelected(valueEl.id);
    setActiveTab('properties');
  };

  // ── Keyboard nudge & shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        del();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
        if (e.key === 'y') { e.preventDefault(); redo(); return; }
        if (e.key === 'c') { e.preventDefault(); copy(); return; }
        if (e.key === 'v') { e.preventDefault(); paste(); return; }
        if (e.key === 'd') { e.preventDefault(); dup(); return; }
      }

      if (selected) {
        const el = elements.find(item => item.id === selected);
        if (!el) return;
        const step = e.shiftKey ? 5 : 1;

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            update(selected, { y: Math.max(0, el.y - step) });
            break;
          case 'ArrowDown':
            e.preventDefault();
            update(selected, { y: Math.max(0, Math.min(100 - el.height, el.y + step)) });
            break;
          case 'ArrowLeft':
            e.preventDefault();
            update(selected, { x: Math.max(0, el.x - step) });
            break;
          case 'ArrowRight':
            e.preventDefault();
            update(selected, { x: Math.max(0, Math.min(100 - el.width, el.x + step)) });
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, elements, del, dup, copy, paste, undo, redo, update]);

  const [showGridLines, setShowGridLines] = useState(false);

  const centerHorizontally = () => {
    if (!selectedEl) return;
    update(selectedEl.id, { x: Math.round((100 - selectedEl.width) / 2) });
  };

  const centerVertically = () => {
    if (!selectedEl) return;
    update(selectedEl.id, { y: Math.round((100 - selectedEl.height) / 2) });
  };

  const alignWithTarget = (action: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom' | 'width' | 'height' | 'bothX', targetId: string) => {
    if (!selectedEl || !targetId) return;
    const target = elements.find(e => e.id === targetId);
    if (!target) return;

    switch (action) {
      case 'left':
        update(selectedEl.id, { x: target.x });
        break;
      case 'centerX':
        update(selectedEl.id, { x: Math.round(target.x + (target.width - selectedEl.width) / 2) });
        break;
      case 'right':
        update(selectedEl.id, { x: Math.round(target.x + target.width - selectedEl.width) });
        break;
      case 'top':
        update(selectedEl.id, { y: target.y });
        break;
      case 'centerY':
        update(selectedEl.id, { y: Math.round(target.y + (target.height - selectedEl.height) / 2) });
        break;
      case 'bottom':
        update(selectedEl.id, { y: Math.round(target.y + target.height - selectedEl.height) });
        break;
      case 'width':
        update(selectedEl.id, { width: target.width });
        break;
      case 'height':
        update(selectedEl.id, { height: target.height });
        break;
      case 'bothX':
        update(selectedEl.id, { x: target.x, width: target.width });
        break;
    }
  };

  // ── Drag Repositioning System ──────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = elements.find(item => item.id === id);
    if (!el || el.locked) return;

    setSelected(id);
    setActiveTab('properties');

    const startX = e.clientX;
    const startY = e.clientY;
    const ox = el.x;
    const oy = el.y;

    const onMove = (mv: MouseEvent) => {
      const rect = cardRef.current!.getBoundingClientRect();
      const dx = ((mv.clientX - startX) / rect.width) * 100;
      const dy = ((mv.clientY - startY) / rect.height) * 100;

      let nextX = ox + dx;
      let nextY = oy + dy;

      if (snapStep > 0) {
        nextX = Math.round(nextX / snapStep) * snapStep;
        nextY = Math.round(nextY / snapStep) * snapStep;
      } else {
        nextX = Math.round(nextX);
        nextY = Math.round(nextY);
      }

      update(id, {
        x: Math.max(0, Math.min(100 - el.width, nextX)),
        y: Math.max(0, Math.min(100 - el.height, nextY)),
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startResize = (e: React.MouseEvent, id: string, edge: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find(item => item.id === id);
    if (!el || el.locked) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const ox = el.x;
    const oy = el.y;
    const ow = el.width;
    const oh = el.height;

    const onMove = (mv: MouseEvent) => {
      const rect = cardRef.current!.getBoundingClientRect();
      const dx = ((mv.clientX - startX) / rect.width) * 100;
      const dy = ((mv.clientY - startY) / rect.height) * 100;

      let nextX = ox;
      let nextY = oy;
      let nextW = ow;
      let nextH = oh;

      const MIN_W = 4;
      const MIN_H = 3;

      if (edge.includes('e')) {
        nextW = Math.max(MIN_W, Math.min(100 - ox, ow + dx));
      }
      if (edge.includes('w')) {
        const targetW = ow - dx;
        if (targetW >= MIN_W) {
          nextX = Math.max(0, ox + dx);
          nextW = ow + (ox - nextX);
        } else {
          nextW = MIN_W;
          nextX = ox + ow - MIN_W;
        }
      }
      if (edge.includes('s')) {
        nextH = Math.max(MIN_H, Math.min(100 - oy, oh + dy));
      }
      if (edge.includes('n')) {
        const targetH = oh - dy;
        if (targetH >= MIN_H) {
          nextY = Math.max(0, oy + dy);
          nextH = oh + (oy - nextY);
        } else {
          nextH = MIN_H;
          nextY = oy + oh - MIN_H;
        }
      }

      let finalX = nextX;
      let finalY = nextY;
      let finalW = nextW;
      let finalH = nextH;

      if (snapStep > 0) {
        finalX = Math.round(finalX / snapStep) * snapStep;
        finalY = Math.round(finalY / snapStep) * snapStep;
        finalW = Math.round(finalW / snapStep) * snapStep;
        finalH = Math.round(finalH / snapStep) * snapStep;
      } else {
        finalX = Math.round(finalX);
        finalY = Math.round(finalY);
        finalW = Math.round(finalW);
        finalH = Math.round(finalH);
      }

      update(id, {
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };


  // ── Render Card Element ───────────────────────────────────────────────────
  const renderElement = (el: IDCardCanvasElement) => {
    const isSelected = el.id === selected && !previewMode;
    const isHovered = el.id === hoveredId && !previewMode;
    const pv = PREVIEW_DATA;
    const shapeStyle = el.type === 'photo' ? getShapeStyle(el.shape) : {};

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.width}%`,
      height: `${el.height}%`,
      opacity: el.opacity,
      zIndex: el.zIndex,
      fontFamily: template.fontFamily || 'Inter',
      boxSizing: 'border-box',
    };

    const outlineBorder: React.CSSProperties = !previewMode ? {
      outline: isSelected
         ? 'none'
        : isHovered
          ? '1px dashed rgba(59, 130, 246, 0.7)'
          : 'none',
      outlineOffset: '0px',
    } : {};

    // Photo Box
    if (el.type === 'photo') {
      return (
        <div
          key={el.id}
          onMouseEnter={() => !previewMode && setHoveredId(el.id)}
          onMouseLeave={() => !previewMode && setHoveredId(null)}
          onMouseDown={previewMode ? undefined : (e) => startDrag(e, el.id)}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...baseStyle,
            ...shapeStyle,
            overflow: 'hidden',
            border: `${el.borderWidth ?? 2}px solid ${el.borderColor ?? template.primaryColor}`,
            background: '#e2e8f0',
            cursor: previewMode ? 'default' : 'move',
            ...outlineBorder,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTO_PREVIEW} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
        </div>
      );
    }

    // QR Code Box
    if (el.type === 'qrcode') {
      return (
        <div
          key={el.id}
          onMouseEnter={() => !previewMode && setHoveredId(el.id)}
          onMouseLeave={() => !previewMode && setHoveredId(null)}
          onMouseDown={previewMode ? undefined : (e) => startDrag(e, el.id)}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : '#ffffff',
            borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
            border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || '#cbd5e1'}` : undefined,
            cursor: previewMode ? 'default' : 'move',
            ...outlineBorder,
            padding: 4,
          }}
        >
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <QRCode
              value="STUDENT_QR_PLACEHOLDER"
              size={128}
              style={{ height: 'auto', maxWidth: '100%', width: '100%', pointerEvents: 'none' }}
              viewBox="0 0 128 128"
            />
          </div>
        </div>
      );
    }

    // Signature Block
    if (el.type === 'signature') {
      return (
        <div
          key={el.id}
          onMouseEnter={() => !previewMode && setHoveredId(el.id)}
          onMouseLeave={() => !previewMode && setHoveredId(null)}
          onMouseDown={previewMode ? undefined : (e) => startDrag(e, el.id)}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...baseStyle,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: previewMode ? 'default' : 'move',
            ...outlineBorder,
            color: el.color ?? template.textColor ?? '#475569',
          }}
        >
          <div style={{ fontSize: el.fontSize ? el.fontSize * 0.8 : 7, fontStyle: 'italic', lineHeight: 1.1, opacity: 0.8 }}>
            ~~ signature ~~
          </div>
          <div style={{ width: '80%', borderTop: '1px solid currentColor', margin: '2px 0', opacity: 0.7 }} />
          <div style={{ fontSize: el.fontSize ?? 9, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.1 }}>
            {el.text ?? 'Principal'}
          </div>
        </div>
      );
    }

    // Static Text Box
    if (el.type === 'text') {
      return (
        <div
          key={el.id}
          onMouseEnter={() => !previewMode && setHoveredId(el.id)}
          onMouseLeave={() => !previewMode && setHoveredId(null)}
          onMouseDown={previewMode ? undefined : (e) => startDrag(e, el.id)}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
            background: el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : undefined,
            borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
            border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || '#cbd5e1'}` : undefined,
            cursor: previewMode ? 'default' : 'move',
            ...outlineBorder,
          }}
        >
          <span style={{
            fontSize: el.fontSize ?? 12,
            fontWeight: el.fontWeight ?? 'normal',
            fontStyle: el.fontStyle ?? 'normal',
            textDecoration: el.underline ? 'underline' : 'none',
            color: el.color ?? template.textColor ?? '#1e293b',
            width: '100%',
            textAlign: el.align ?? 'left',
            userSelect: 'none',
            lineHeight: 1.25,
          }}>{el.text || 'Text'}</span>
        </div>
      );
    }

    // Value Only field
    if (el.type === 'field') {
      const isSplitValue = !el.fieldLabel || el.fieldLabel.startsWith('__split_label_of__');
      const val = el.fieldKey ? (pv[el.fieldKey] || (isSplitValue ? el.fieldKey : el.fieldLabel || el.fieldKey)) : el.fieldLabel;
      return (
        <div
          key={el.id}
          onMouseEnter={() => !previewMode && setHoveredId(el.id)}
          onMouseLeave={() => !previewMode && setHoveredId(null)}
          onMouseDown={previewMode ? undefined : (e) => startDrag(e, el.id)}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            background: el.bgColor && el.bgColor !== 'transparent' ? el.bgColor : undefined,
            borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
            border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || '#cbd5e1'}` : undefined,
            cursor: previewMode ? 'default' : 'move',
            ...outlineBorder,
          }}
        >
          {isSplitValue ? (
            // Split mode: just show value cleanly
            <span style={{
              fontSize: el.fontSize ?? 10,
              fontWeight: el.fontWeight ?? 'normal',
              fontStyle: el.fontStyle ?? 'normal',
              textDecoration: el.underline ? 'underline' : 'none',
              color: el.color ?? template.textColor ?? '#1e293b',
              width: '100%',
              textAlign: el.align ?? 'left',
              userSelect: 'none',
              paddingLeft: 4,
              lineHeight: 1.25,
            }}>{val}</span>
          ) : (
            // Standard mode: stacked label + value
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden', padding: '1px 3px' }}>
              <span style={{
                fontSize: Math.max(6, (el.fontSize ?? 10) * 0.68),
                color: el.color ?? template.textColor ?? '#1e293b',
                opacity: 0.45,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                lineHeight: 1.1,
                userSelect: 'none',
              }}>{el.fieldLabel}</span>
              <span style={{
                fontSize: el.fontSize ?? 10,
                fontWeight: el.fontWeight ?? 'normal',
                color: el.color ?? template.textColor ?? '#1e293b',
                userSelect: 'none',
                textAlign: el.align ?? 'left',
                lineHeight: 1.25,
              }}>{val}</span>
            </div>
          )}
        </div>
      );
    }


    // Label + Value structured field
    if (el.type === 'labelfield') {
      const val = el.fieldKey ? (pv[el.fieldKey] || el.fieldKey) : '';
      const lblW = el.labelWidth ?? 35;
      return (
        <div
          key={el.id}
          onMouseEnter={() => !previewMode && setHoveredId(el.id)}
          onMouseLeave={() => !previewMode && setHoveredId(null)}
          onMouseDown={previewMode ? undefined : (e) => startDrag(e, el.id)}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'stretch',
            overflow: 'hidden',
            cursor: previewMode ? 'default' : 'move',
            ...outlineBorder,
          }}
        >
          {el.showLabel !== false && (
            <div style={{
              width: `${lblW}%`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: el.labelAlign === 'center' ? 'center' : el.labelAlign === 'right' ? 'flex-end' : 'flex-start',
              fontSize: el.fontSize ?? 10,
              fontWeight: el.fontWeight === 'bold' ? 700 : 400,
              color: el.labelColor ?? el.color ?? template.textColor ?? '#1e293b',
              paddingLeft: 3,
              paddingRight: 2,
              flexShrink: 0,
              userSelect: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}>
              {el.labelText || el.fieldLabel || el.fieldKey || 'Label :'}
            </div>
          )}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: el.fieldBgColor && el.fieldBgColor !== 'transparent' ? el.fieldBgColor : 'transparent',
            border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || '#cbd5e1'}` : 'none',
            borderRadius: el.borderRadius ? `${el.borderRadius}px` : 3,
            overflow: 'hidden',
          }}>
            <span style={{
              fontSize: el.fontSize ?? 10,
              fontWeight: el.fontWeight === 'bold' ? 700 : 400,
              fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal',
              textDecoration: el.underline ? 'underline' : 'none',
              color: el.color ?? template.textColor ?? '#1e293b',
              paddingLeft: 4,
              userSelect: 'none',
              width: '100%',
              textAlign: el.valueAlign ?? el.align ?? 'left',
            }}>{val}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── Styles ────────────────────────────────────────────────────────────────

  const tabButtonStyle = (tabId: typeof activeTab): React.CSSProperties => {
    const active = activeTab === tabId;
    return {
      flex: 1,
      padding: '10px 8px',
      borderRadius: 8,
      border: 'none',
      background: active ? '#2563eb' : 'transparent',
      color: active ? '#ffffff' : '#94a3b8',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.2s',
    };
  };

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0f172a',
      overflow: 'hidden',
      userSelect: 'none',
    }}>

      {/* ─── LEFT SIDEBAR (Width: 380px) ─── */}
      <div style={{
        width: 380,
        flexShrink: 0,
        background: '#1e293b',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '0.04em' }}>
            🎨 CARD DESIGNER
          </h2>
          <span style={{ fontSize: 9, background: '#334155', color: '#cbd5e1', padding: '3px 8px', borderRadius: 12, fontWeight: 700, border: '1px solid #475569' }}>
            DRAG-DROP ENGINE
          </span>
        </div>

        {/* Tab Buttons */}
        <div style={{
          display: 'flex',
          padding: '10px 16px',
          gap: 4,
          borderBottom: '1px solid #334155',
          background: '#1a2230',
        }}>
          <button onClick={() => setActiveTab('template')} style={tabButtonStyle('template')}>
            📋 Card Setup
          </button>
          <button onClick={() => setActiveTab('elements')} style={tabButtonStyle('elements')}>
            ➕ Add Fields
          </button>
          <button onClick={() => setActiveTab('properties')} style={tabButtonStyle('properties')}>
            ⚙ Properties
          </button>
        </div>

        {/* Scrollable Panel Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>

          {/* ── Tab Content: TEMPLATE SETTINGS ── */}
          {activeTab === 'template' && (
            <>
              <div style={fieldGroup}>
                <label style={labelStyle}>Template Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={e => updateTemplateField('name', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Orientation</label>
                <select
                  value={template.layout}
                  onChange={e => {
                    const lay = e.target.value as 'vertical' | 'horizontal';
                    onChange(prev => {
                      const next = { ...prev, layout: lay };
                      if (lay === 'vertical') {
                        next.width = 54;
                        next.height = 86;
                      } else {
                        next.width = 86;
                        next.height = 54;
                      }
                      return next;
                    });
                  }}
                  style={inputStyle}
                >
                  <option value="vertical">Vertical (Portrait)</option>
                  <option value="horizontal">Horizontal (Landscape)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Width (mm)</label>
                  <input
                    type="number"
                    value={template.width}
                    onChange={e => updateTemplateField('width', +e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Height (mm)</label>
                  <input
                    type="number"
                    value={template.height}
                    onChange={e => updateTemplateField('height', +e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Background Design</label>

                {/* Solid Color Picker */}
                <div style={{ marginBottom: 8 }}>
                  <span style={{ ...nestedLabel, display: 'block', marginBottom: 4 }}>Solid Background Color</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={(() => {
                        // If current bg is a solid color (starts with #), show it; otherwise default
                        const bg = template.backgroundImage ?? '';
                        return bg.startsWith('#') ? bg : '#ffffff';
                      })()}
                      onChange={e => updateTemplateField('backgroundImage', e.target.value)}
                      style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, flexShrink: 0 }}
                      title="Pick a solid background color"
                    />
                    <input
                      type="text"
                      placeholder="#ffffff or color name"
                      value={(() => {
                        const bg = template.backgroundImage ?? '';
                        return bg.startsWith('#') || bg.match(/^[a-zA-Z]+$/) ? bg : '';
                      })()}
                      onChange={e => updateTemplateField('backgroundImage', e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => updateTemplateField('backgroundImage', '')}
                      title="Clear background (white)"
                      style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, background: '#475569', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Gradient Presets */}
                <span style={{ ...nestedLabel, display: 'block', marginBottom: 4 }}>Gradient Presets</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                  {PRESET_GRADIENTS.map(g => {
                    const isSelected = template.backgroundImage === g.value;
                    return (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => updateTemplateField('backgroundImage', g.value)}
                        style={{
                          height: 38,
                          borderRadius: 6,
                          border: isSelected ? '2px solid #2563eb' : '1px solid #475569',
                          background: g.value || '#334155',
                          color: '#fff',
                          fontSize: 8,
                          fontWeight: 700,
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 2,
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ textShadow: g.value ? '0 1px 2px rgba(0,0,0,0.8)' : 'none', zIndex: 1 }}>
                          {g.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #475569',
                    borderRadius: 6,
                    padding: '10px 8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#1a2230',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                    📤 Upload custom background image
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleBgUpload}
                  />
                </div>
              </div>


              <div style={fieldGroup}>
                <label style={labelStyle}>Typography & Card Styling</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <span style={nestedLabel}>Font Family</span>
                    <select
                      value={template.fontFamily}
                      onChange={e => updateTemplateField('fontFamily', e.target.value)}
                      style={inputStyle}
                    >
                      {['Inter', 'Cinzel', 'Alice', 'sans-serif'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span style={nestedLabel}>Corners</span>
                    <select
                      value={template.borderRadius}
                      onChange={e => updateTemplateField('borderRadius', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="none">Square</option>
                      <option value="sm">Small Rounded</option>
                      <option value="md">Medium Rounded</option>
                      <option value="lg">Large Rounded</option>
                      <option value="full">Full Rounded</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  <div>
                    <span style={nestedLabel}>Border Width (px)</span>
                    <input
                      type="number"
                      min={0}
                      value={template.borderWidth ?? 1}
                      onChange={e => updateTemplateField('borderWidth', +e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <span style={nestedLabel}>Border Color</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="color"
                        value={template.borderColor ?? '#cbd5e1'}
                        onChange={e => updateTemplateField('borderColor', e.target.value)}
                        style={{ width: 22, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={template.borderColor ?? '#cbd5e1'}
                        onChange={e => updateTemplateField('borderColor', e.target.value)}
                        style={{ ...inputStyle, flex: 1, padding: '2px 4px', fontSize: 10 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Core Colors</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <ColorInputRow
                    label="Primary Theme"
                    value={template.primaryColor}
                    onChange={c => updateTemplateField('primaryColor', c)}
                  />
                  <ColorInputRow
                    label="Secondary Theme"
                    value={template.secondaryColor}
                    onChange={c => updateTemplateField('secondaryColor', c)}
                  />
                  <ColorInputRow
                    label="Header Text"
                    value={template.headerTextColor ?? '#ffffff'}
                    onChange={c => updateTemplateField('headerTextColor', c)}
                  />
                  <ColorInputRow
                    label="Body Text"
                    value={template.textColor ?? '#1e293b'}
                    onChange={c => updateTemplateField('textColor', c)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#f1f5f9' }}>Show Header Overlay</span>
                  <input
                    type="checkbox"
                    checked={template.showSchoolHeader !== false}
                    onChange={e => updateTemplateField('showSchoolHeader', e.target.checked)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}
                  />
                </div>
                {template.showSchoolHeader !== false && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#cbd5e1' }}>Show School Logo</span>
                    <input
                      type="checkbox"
                      checked={template.showLogo !== false}
                      onChange={e => updateTemplateField('showLogo', e.target.checked)}
                      style={{ width: 12, height: 12, cursor: 'pointer' }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Tab Content: ADD ELEMENTS ── */}
          {activeTab === 'elements' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Base Card Elements
                </span>
                <button
                  onClick={addPhoto}
                  style={{ ...addElemBtn, background: '#2563eb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                  onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                >
                  📷 Add Student Photo Box
                </button>
                <button
                  onClick={addSignature}
                  style={{ ...addElemBtn, background: '#7c3aed' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
                >
                  ✍ Add Signature Block
                </button>
                <button
                  onClick={addText}
                  style={{ ...addElemBtn, background: '#0891b2' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0e7490'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0891b2'}
                >
                  🔤 Add Custom Text Row
                </button>
                <button
                  onClick={addQRCode}
                  style={{ ...addElemBtn, background: '#10b981', marginTop: 4 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                  onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
                >
                  🔳 Add Student QR Code
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Student Data Fields
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 420px)', overflowY: 'auto', paddingRight: 4 }}>
                  {STUDENT_FIELDS.map(f => (
                    <div
                      key={f.key}
                      style={{
                        background: '#1e293b',
                        borderRadius: 6,
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        border: '1px solid #334155',
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#f1f5f9' }}>{f.label}</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => addLabelField(f.key, f.label)}
                          title="Add a combined row: Label + Value in one element"
                          style={{
                            flex: 1,
                            padding: '4px 4px',
                            fontSize: 9,
                            fontWeight: 700,
                            background: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            minWidth: 0,
                          }}
                        >
                          🔗 Row
                        </button>
                        <button
                          onClick={() => addField(f.key, f.label)}
                          title="Add value only (no label)"
                          style={{
                            flex: 1,
                            padding: '4px 4px',
                            fontSize: 9,
                            fontWeight: 700,
                            background: '#ea580c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            minWidth: 0,
                          }}
                        >
                          📄 Value
                        </button>
                        <button
                          onClick={() => addSplitField(f.key, f.label)}
                          title="Add label and value as two separate independent elements"
                          style={{
                            flex: 1,
                            padding: '4px 4px',
                            fontSize: 9,
                            fontWeight: 700,
                            background: '#7c3aed',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            minWidth: 0,
                          }}
                        >
                          ✂️ Split
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Tab Content: PROPERTIES ── */}
          {activeTab === 'properties' && (
            <>
              {!selectedEl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 220, color: '#64748b', gap: 10 }}>
                  <div style={{ fontSize: 32 }}>🔍</div>
                  <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', maxWidth: 180 }}>
                    Click an element on the preview card to edit its placement and styles.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#334155', borderRadius: 6, border: '1px solid #475569' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase' }}>
                      {selectedEl.type} Element
                    </span>
                    <button
                      onClick={del}
                      style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Element Specifics */}
                  {(selectedEl.type === 'field' || selectedEl.type === 'labelfield') && (
                    <>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Student Database Value</label>
                        <select
                          value={selectedEl.fieldKey ?? ''}
                          onChange={e => {
                            const f = STUDENT_FIELDS.find(sf => sf.key === e.target.value);
                            if (f) {
                              update(selectedEl.id, {
                                fieldKey: f.key,
                                fieldLabel: f.label + ' :',
                                labelText: f.label + ' :',
                              });
                            }
                          }}
                          style={inputStyle}
                        >
                          {STUDENT_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      {selectedEl.type === 'field' && (
                        <div style={fieldGroup}>
                          <label style={labelStyle}>Value Alignment</label>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {(['left', 'center', 'right'] as const).map(align => (
                              <button
                                key={align}
                                onClick={() => update(selectedEl.id, { align })}
                                style={toggleBtnStyle((selectedEl.align ?? 'left') === align)}
                              >
                                <span style={{ fontSize: 10, textTransform: 'capitalize' }}>{align}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedEl.type === 'labelfield' && (
                    <>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Row Label Text</label>
                        <input
                          type="text"
                          value={selectedEl.labelText ?? selectedEl.fieldLabel ?? ''}
                          onChange={e => update(selectedEl.id, { labelText: e.target.value, fieldLabel: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div style={fieldGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <label style={labelStyle}>Label Portion Width</label>
                          <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>{selectedEl.labelWidth ?? 35}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={80}
                          value={selectedEl.labelWidth ?? 35}
                          onChange={e => update(selectedEl.id, { labelWidth: +e.target.value })}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Label Alignment</label>
                        <select
                          value={selectedEl.labelAlign || 'left'}
                          onChange={e => update(selectedEl.id, { labelAlign: e.target.value as any })}
                          style={inputStyle}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Value Alignment</label>
                        <select
                          value={selectedEl.valueAlign || selectedEl.align || 'left'}
                          onChange={e => update(selectedEl.id, { valueAlign: e.target.value as any })}
                          style={inputStyle}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedEl.type === 'text' && (
                    <>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Text Content</label>
                        <textarea
                          value={selectedEl.text ?? ''}
                          onChange={e => update(selectedEl.id, { text: e.target.value })}
                          rows={2}
                          style={{ ...inputStyle, resize: 'vertical' }}
                        />
                      </div>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Text Alignment</label>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(['left', 'center', 'right'] as const).map(align => (
                            <button
                              key={align}
                              onClick={() => update(selectedEl.id, { align })}
                              style={toggleBtnStyle((selectedEl.align ?? 'left') === align)}
                            >
                              <span style={{ fontSize: 10, textTransform: 'capitalize' }}>{align}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedEl.type === 'signature' && (
                    <div style={fieldGroup}>
                      <label style={labelStyle}>Signature Title</label>
                      <input
                        type="text"
                        value={selectedEl.text ?? ''}
                        onChange={e => update(selectedEl.id, { text: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  )}

                  {selectedEl.type === 'photo' && (
                    <>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Box Shape</label>
                        <select
                          value={selectedEl.shape ?? 'rectangle'}
                          onChange={e => update(selectedEl.id, { shape: e.target.value as any })}
                          style={inputStyle}
                        >
                          <option value="rectangle">Rectangle</option>
                          <option value="square">Square</option>
                          <option value="circle">Circle</option>
                          <option value="oval">Oval</option>
                        </select>
                      </div>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Border</label>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                          <button
                            onClick={() => update(selectedEl.id, { borderWidth: 0 })}
                            style={toggleBtnStyle((selectedEl.borderWidth ?? 2) === 0)}
                          >
                            No Border
                          </button>
                          <button
                            onClick={() => update(selectedEl.id, { borderWidth: (selectedEl.borderWidth && selectedEl.borderWidth > 0) ? selectedEl.borderWidth : 2 })}
                            style={toggleBtnStyle((selectedEl.borderWidth ?? 2) > 0)}
                          >
                            Border
                          </button>
                        </div>
                        {(selectedEl.borderWidth ?? 2) > 0 && (
                          <div>
                            <span style={nestedLabel}>Border Thickness (px)</span>
                            <input
                              type="number"
                              min={1}
                              value={selectedEl.borderWidth ?? 2}
                              onChange={e => update(selectedEl.id, { borderWidth: Math.max(1, +e.target.value) })}
                              style={inputStyle}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {selectedEl.type !== 'photo' && selectedEl.type !== 'signature' && (
                    <div style={fieldGroup}>
                      <label style={labelStyle}>Border</label>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        <button
                          onClick={() => update(selectedEl.id, { borderWidth: 0 })}
                          style={toggleBtnStyle((selectedEl.borderWidth ?? 0) === 0)}
                        >
                          No Border
                        </button>
                        <button
                          onClick={() => update(selectedEl.id, { borderWidth: (selectedEl.borderWidth && selectedEl.borderWidth > 0) ? selectedEl.borderWidth : 1 })}
                          style={toggleBtnStyle((selectedEl.borderWidth ?? 0) > 0)}
                        >
                          Border
                        </button>
                      </div>
                      {(selectedEl.borderWidth ?? 0) > 0 && (
                        <div>
                          <span style={nestedLabel}>Border Thickness (px)</span>
                          <input
                            type="number"
                            min={1}
                            value={selectedEl.borderWidth ?? 1}
                            onChange={e => update(selectedEl.id, { borderWidth: Math.max(1, +e.target.value) })}
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Font configuration */}
                  {selectedEl.type !== 'photo' && selectedEl.type !== 'qrcode' && (
                    <>
                      <div style={fieldGroup}>
                        <label style={labelStyle}>Font Configuration</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <button
                            onClick={() => update(selectedEl.id, { fontSize: Math.max(6, (selectedEl.fontSize ?? 10) - 1) })}
                            style={stepBtn}
                          >−</button>
                          <input
                            type="number"
                            min={6}
                            value={selectedEl.fontSize ?? 10}
                            onChange={e => update(selectedEl.id, { fontSize: +e.target.value })}
                            style={{ ...inputStyle, flex: 1, textAlign: 'center' }}
                          />
                          <button
                            onClick={() => update(selectedEl.id, { fontSize: Math.min(48, (selectedEl.fontSize ?? 10) + 1) })}
                            style={stepBtn}
                          >+</button>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>px</span>
                        </div>

                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                          <button
                            onClick={() => update(selectedEl.id, { fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' })}
                            style={toggleBtnStyle(selectedEl.fontWeight === 'bold')}
                          >
                            <b>B</b>
                          </button>
                          <button
                            onClick={() => update(selectedEl.id, { fontStyle: selectedEl.fontStyle === 'italic' ? 'normal' : 'italic' })}
                            style={toggleBtnStyle(selectedEl.fontStyle === 'italic')}
                          >
                            <i>I</i>
                          </button>
                          <button
                            onClick={() => update(selectedEl.id, { underline: !selectedEl.underline })}
                            style={toggleBtnStyle(selectedEl.underline ?? false)}
                          >
                            <u>U</u>
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          {(['left', 'center', 'right'] as const).map(align => (
                            <button
                              key={align}
                              onClick={() => update(selectedEl.id, { align })}
                              style={toggleBtnStyle((selectedEl.align ?? 'left') === align)}
                            >
                              <span style={{ fontSize: 10, textTransform: 'capitalize' }}>{align}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Colors */}
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Colors</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedEl.type !== 'photo' && selectedEl.type !== 'qrcode' && (
                        <ColorInputRow
                          label="Text Color"
                          value={selectedEl.color ?? '#1e293b'}
                          onChange={c => update(selectedEl.id, { color: c })}
                        />
                      )}
                      {selectedEl.type === 'labelfield' && (
                        <ColorInputRow
                          label="Label Color"
                          value={selectedEl.labelColor ?? selectedEl.color ?? '#1e293b'}
                          onChange={c => update(selectedEl.id, { labelColor: c })}
                        />
                      )}
                      {selectedEl.type !== 'photo' && selectedEl.type !== 'signature' && (
                        <ColorInputRow
                          label="Text Box Bg"
                          value={selectedEl.bgColor ?? 'transparent'}
                          onChange={c => update(selectedEl.id, { bgColor: c })}
                          allowTransparent
                        />
                      )}
                      {selectedEl.type === 'labelfield' && (
                        <ColorInputRow
                          label="Val Box Bg"
                          value={selectedEl.fieldBgColor ?? '#ffffff'}
                          onChange={c => update(selectedEl.id, { fieldBgColor: c })}
                          allowTransparent
                        />
                      )}
                      {(selectedEl.type === 'photo' || selectedEl.type === 'field' || selectedEl.type === 'labelfield' || selectedEl.type === 'text' || selectedEl.type === 'qrcode') && (
                        <ColorInputRow
                          label="Border Color"
                          value={selectedEl.borderColor ?? (selectedEl.type === 'photo' ? template.primaryColor : '#cbd5e1')}
                          onChange={c => update(selectedEl.id, { borderColor: c })}
                        />
                      )}
                    </div>
                  </div>

                  {/* Alignment & Layout Helpers */}
                  <div style={fieldGroup}>
                    <label style={labelStyle}>📐 Alignment Helpers</label>
                    
                    {/* Page Quick Center */}
                    <span style={nestedLabel}>Align to Card Page</span>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <button
                        onClick={centerHorizontally}
                        style={{ ...toolBtnStyle, flex: 1, padding: '6px 4px', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        title="Center selected element horizontally on the card page"
                      >
                        ↔️ Center Horiz
                      </button>
                      <button
                        onClick={centerVertically}
                        style={{ ...toolBtnStyle, flex: 1, padding: '6px 4px', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        title="Center selected element vertically on the card page"
                      >
                        ↕️ Center Vert
                      </button>
                    </div>

                    {/* Relative element alignment */}
                    {elements.filter(e => e.id !== selectedEl.id).length > 0 && (
                      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>Align with other elements:</span>
                        <select
                          value={alignTargetId}
                          onChange={e => setAlignTargetId(e.target.value)}
                          style={{ ...inputStyle, fontSize: 10, padding: '4px 6px', height: 26 }}
                        >
                          <option value="">-- Choose Target Element --</option>
                          {elements.filter(e => e.id !== selectedEl.id).map(e => {
                            const label = e.type === 'field' || e.type === 'labelfield'
                              ? `Field: ${e.fieldKey}`
                              : e.type === 'text'
                                ? `Text: "${e.text?.substring(0, 15)}..."`
                                : e.type.toUpperCase();
                            return <option key={e.id} value={e.id}>{label}</option>;
                          })}
                        </select>

                        {alignTargetId && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 4 }}>
                            <button
                              onClick={() => alignWithTarget('left', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#334155', border: '1px solid #475569', fontSize: 8, padding: '4px 2px' }}
                              title="Align left edges"
                            >
                              ⬅️ Left
                            </button>
                            <button
                              onClick={() => alignWithTarget('centerX', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#334155', border: '1px solid #475569', fontSize: 8, padding: '4px 2px' }}
                              title="Align horizontal centers"
                            >
                              ⬌ Center X
                            </button>
                            <button
                              onClick={() => alignWithTarget('right', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#334155', border: '1px solid #475569', fontSize: 8, padding: '4px 2px' }}
                              title="Align right edges"
                            >
                              ➡️ Right
                            </button>
                            
                            <button
                              onClick={() => alignWithTarget('top', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#334155', border: '1px solid #475569', fontSize: 8, padding: '4px 2px' }}
                              title="Align top edges"
                            >
                              ⬆️ Top
                            </button>
                            <button
                              onClick={() => alignWithTarget('centerY', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#334155', border: '1px solid #475569', fontSize: 8, padding: '4px 2px' }}
                              title="Align vertical centers"
                            >
                              ⬍ Center Y
                            </button>
                            <button
                              onClick={() => alignWithTarget('bottom', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#334155', border: '1px solid #475569', fontSize: 8, padding: '4px 2px' }}
                              title="Align bottom edges"
                            >
                              ⬇️ Bottom
                            </button>

                            <button
                              onClick={() => alignWithTarget('width', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#334155', border: '1px solid #475569', fontSize: 8, padding: '4px 2px' }}
                              title="Set width same as target element"
                            >
                              ↔️ Width
                            </button>
                            <button
                              onClick={() => alignWithTarget('height', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#334155', border: '1px solid #475569', fontSize: 8, padding: '4px 2px' }}
                              title="Set height same as target element"
                            >
                              ↕️ Height
                            </button>
                            <button
                              onClick={() => alignWithTarget('bothX', alignTargetId)}
                              style={{ ...actionBtnStyle, background: '#1d4ed8', border: '1px solid #1e40af', fontSize: 8, padding: '4px 2px' }}
                              title="Match Left Edge & Width"
                            >
                              🎯 Match X
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <span style={{ fontSize: 8.5, color: '#64748b', fontStyle: 'italic', lineHeight: 1.3, marginTop: 4, display: 'block' }}>
                      💡 Pro Tip: Select an element and use your keyboard's **Arrow Keys** (or **Shift + Arrow Keys** for larger steps) to nudge it pixel-by-pixel.
                    </span>
                  </div>

                  {/* Position and Size */}
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Position & Size (%)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <span style={coordLabel}>X Pos (Left)</span>
                        <input
                          type="number"
                          value={Math.round(selectedEl.x)}
                          onChange={e => update(selectedEl.id, { x: Math.max(0, Math.min(100 - selectedEl.width, +e.target.value)) })}
                          style={coordInput}
                        />
                      </div>
                      <div>
                        <span style={coordLabel}>Y Pos (Top)</span>
                        <input
                          type="number"
                          value={Math.round(selectedEl.y)}
                          onChange={e => update(selectedEl.id, { y: Math.max(0, Math.min(100 - selectedEl.height, +e.target.value)) })}
                          style={coordInput}
                        />
                      </div>
                      <div>
                        <span style={coordLabel}>Width</span>
                        <input
                          type="number"
                          value={Math.round(selectedEl.width)}
                          onChange={e => update(selectedEl.id, { width: Math.max(4, Math.min(100 - selectedEl.x, +e.target.value)) })}
                          style={coordInput}
                        />
                      </div>
                      <div>
                        <span style={coordLabel}>Height</span>
                        <input
                          type="number"
                          value={Math.round(selectedEl.height)}
                          onChange={e => update(selectedEl.id, { height: Math.max(3, Math.min(100 - selectedEl.y, +e.target.value)) })}
                          style={coordInput}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={coordSliderLabel}>X</span>
                        <input
                          type="range"
                          min={0}
                          max={100 - selectedEl.width}
                          value={Math.round(selectedEl.x)}
                          onChange={e => update(selectedEl.id, { x: +e.target.value })}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={coordSliderLabel}>Y</span>
                        <input
                          type="range"
                          min={0}
                          max={100 - selectedEl.height}
                          value={Math.round(selectedEl.y)}
                          onChange={e => update(selectedEl.id, { y: +e.target.value })}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={coordSliderLabel}>W</span>
                        <input
                          type="range"
                          min={4}
                          max={100 - selectedEl.x}
                          value={Math.round(selectedEl.width)}
                          onChange={e => update(selectedEl.id, { width: +e.target.value })}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={coordSliderLabel}>H</span>
                        <input
                          type="range"
                          min={3}
                          max={100 - selectedEl.y}
                          value={Math.round(selectedEl.height)}
                          onChange={e => update(selectedEl.id, { height: +e.target.value })}
                          style={{ flex: 1, cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div style={fieldGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label style={labelStyle}>Opacity</label>
                      <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>{Math.round((selectedEl.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round((selectedEl.opacity ?? 1) * 100)}
                      onChange={e => update(selectedEl.id, { opacity: +e.target.value / 100 })}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Clipboard Properties Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, borderTop: '1px solid #334155', paddingTop: 12 }}>
                    <button onClick={dup} style={{ ...actionBtnStyle, background: '#1d4ed8' }}>Copy Element</button>
                    <button
                      onClick={paste}
                      disabled={!copiedElement}
                      style={{
                        ...actionBtnStyle,
                        background: '#6d28d9',
                        opacity: !copiedElement ? 0.4 : 1,
                        cursor: !copiedElement ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Paste Clone
                    </button>
                    <button onClick={del} style={{ ...actionBtnStyle, background: '#dc2626' }}>Delete</button>
                    <button onClick={clearAll} style={{ ...actionBtnStyle, background: '#7f1d1d' }}>Delete All</button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Persistent Save/Cancel Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid #334155',
          background: '#1a2230',
          display: 'flex',
          gap: 10,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
        }}>
          <button
            onClick={onSave}
            style={{
              flex: 1,
              padding: '10px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#059669'}
            onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
          >
            💾 Save Template
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 16px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ─── RIGHT WORKSPACE & Auto-scaling Canvas ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Workspace Toolbar */}
        <div style={{
          height: 40,
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={undo} style={toolBtnStyle} title="Undo (Ctrl+Z)">↩ Undo</button>
            <button onClick={redo} style={toolBtnStyle} title="Redo (Ctrl+Y)">↪ Redo</button>
            <button
              onClick={() => setShowGridLines(v => !v)}
              style={{
                ...toolBtnStyle,
                background: showGridLines ? '#2563eb' : '#334155',
                borderColor: showGridLines ? '#2563eb' : '#475569',
                color: '#fff',
              }}
              title="Toggle Grid Alignment Guide"
            >
              📐 Grid Guide: {showGridLines ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setSnapStep(prev => prev === 0 ? 2 : prev === 2 ? 5 : prev === 5 ? 10 : prev === 10 ? 20 : 0)}
              style={{
                ...toolBtnStyle,
                background: snapStep > 0 ? '#10b981' : '#334155',
                borderColor: snapStep > 0 ? '#10b981' : '#475569',
                color: '#fff',
              }}
              title="Cycles snapping increments (Off ➔ 2% ➔ 5% ➔ 10% ➔ 20% ➔ Off)"
            >
              🧲 {snapStep === 0 ? 'Snapping: OFF' : `Snap Grid: ${snapStep}%`}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setScale(prev => Math.max(0.25, Math.round((prev - 0.1) * 10) / 10))}
                style={{ ...toolBtnStyle, padding: '3px 6px', fontSize: 9 }}
                title="Zoom Out"
              >
                ➖
              </button>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, minWidth: 46, textAlign: 'center' }}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(prev => Math.min(4.0, Math.round((prev + 0.1) * 10) / 10))}
                style={{ ...toolBtnStyle, padding: '3px 6px', fontSize: 9 }}
                title="Zoom In"
              >
                ➕
              </button>
              <button
                onClick={handleResize}
                style={{ ...toolBtnStyle, padding: '3px 6px', fontSize: 9, background: '#1e293b' }}
                title="Fit Canvas to Workspace"
              >
                🔄 Fit
              </button>
            </div>
            
            <button
              onClick={() => setPreviewMode(v => !v)}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                background: previewMode ? '#059669' : '#2563eb',
                color: '#fff',
                fontWeight: 700,
                fontSize: 10,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              {previewMode ? '✏ Edit Mode' : '👁 Preview Mode'}
            </button>
          </div>
        </div>

        {/* Centered Canvas Container (No scrollbars!) */}
        <div
          ref={workspaceRef}
          onClick={() => setSelected(null)}
          style={{
            flex: 1,
            position: 'relative',
            background: '#0f172a',
            backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Card Preview Scale Wrapper */}
          <div style={{
            width: EDIT_W,
            height: EDIT_H,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0,
          }}>
            {/* The Actual Card */}
            <div
              ref={cardRef}
              onClick={(e) => { e.stopPropagation(); if (!previewMode) setSelected(null); }}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                backgroundColor: (template.backgroundImage && (template.backgroundImage.startsWith('#') || template.backgroundImage.match(/^[a-zA-Z]+$/))) 
                  ? template.backgroundImage 
                  : template.secondaryColor,
                color: template.textColor ?? '#1e293b',
                border: `${template.borderWidth ?? 1}px solid ${template.borderColor ?? '#cbd5e1'}`,
                borderRadius: cardBorderRadiusCss(template.borderRadius),
                backgroundImage: template.backgroundImage?.startsWith('linear-gradient') ? template.backgroundImage : undefined,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                cursor: 'default',
              }}
            >
              {/* Background Custom Image */}
              {template.backgroundImage && 
               !template.backgroundImage.startsWith('linear-gradient') && 
               !template.backgroundImage.startsWith('#') && 
               !template.backgroundImage.match(/^[a-zA-Z]+$/) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={template.backgroundImage}
                  alt="Background template"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              )}

              {/* School Header Overlay */}
              {template.showSchoolHeader !== false && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: '22%',
                    backgroundColor: template.backgroundImage ? 'transparent' : template.primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 12px',
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                >
                  {template.showLogo && (
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      🏫
                    </div>
                  )}
                  <div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: template.headerTextColor ?? '#ffffff',
                      lineHeight: 1.2,
                    }}>
                      Heritage Model School
                    </div>
                    <div style={{
                      fontSize: 7,
                      color: template.headerTextColor ?? '#ffffff',
                      opacity: 0.8,
                      fontWeight: 500,
                    }}>
                      Excellence in Education
                    </div>
                  </div>
                </div>
              )}

              {/* Render Card Elements */}
              {elements.map(renderElement)}

              {/* Visual Alignment Grid Guide */}
              {showGridLines && !previewMode && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9990 }}>
                  {(() => {
                    const step = (snapStep === 5 || snapStep === 10 || snapStep === 20) ? snapStep : 10;
                    const count = Math.floor(100 / step) - 1;
                    return Array.from({ length: count }).map((_, i) => {
                      const pos = (i + 1) * step;
                      const isHalf = pos === 50;
                      return (
                        <React.Fragment key={pos}>
                          {/* Vertical line */}
                          <div style={{
                            position: 'absolute',
                            left: `${pos}%`,
                            top: 0, bottom: 0,
                            width: 1,
                            borderLeft: isHalf 
                              ? '1.5px dashed rgba(37, 99, 235, 0.45)' 
                              : '1px dashed rgba(37, 99, 235, 0.15)'
                          }} />
                          {/* Horizontal line */}
                          <div style={{
                            position: 'absolute',
                            top: `${pos}%`,
                            left: 0, right: 0,
                            height: 1,
                            borderTop: isHalf 
                              ? '1.5px dashed rgba(37, 99, 235, 0.45)' 
                              : '1px dashed rgba(37, 99, 235, 0.15)'
                          }} />
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Selected Element Resize Outline & Handles Overlay */}
              {selectedEl && !previewMode && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${selectedEl.x}%`,
                    top: `${selectedEl.y}%`,
                    width: `${selectedEl.width}%`,
                    height: `${selectedEl.height}%`,
                    zIndex: 9999,
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                    border: '1.5px solid #2563eb',
                  }}
                >
                  {/* Corners */}
                  <div
                    onMouseDown={(e) => startResize(e, selectedEl.id, 'nw')}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      top: -4.5,
                      left: -4.5,
                      cursor: 'nwse-resize',
                    }}
                  />
                  <div
                    onMouseDown={(e) => startResize(e, selectedEl.id, 'ne')}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      top: -4.5,
                      right: -4.5,
                      cursor: 'nesw-resize',
                    }}
                  />
                  <div
                    onMouseDown={(e) => startResize(e, selectedEl.id, 'se')}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      bottom: -4.5,
                      right: -4.5,
                      cursor: 'nwse-resize',
                    }}
                  />
                  <div
                    onMouseDown={(e) => startResize(e, selectedEl.id, 'sw')}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      bottom: -4.5,
                      left: -4.5,
                      cursor: 'nesw-resize',
                    }}
                  />
                  {/* Edges */}
                  <div
                    onMouseDown={(e) => startResize(e, selectedEl.id, 'n')}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      top: -4.5,
                      left: '50%',
                      marginLeft: -4.5,
                      cursor: 'ns-resize',
                    }}
                  />
                  <div
                    onMouseDown={(e) => startResize(e, selectedEl.id, 's')}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      bottom: -4.5,
                      left: '50%',
                      marginLeft: -4.5,
                      cursor: 'ns-resize',
                    }}
                  />
                  <div
                    onMouseDown={(e) => startResize(e, selectedEl.id, 'w')}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      left: -4.5,
                      top: '50%',
                      marginTop: -4.5,
                      cursor: 'ew-resize',
                    }}
                  />
                  <div
                    onMouseDown={(e) => startResize(e, selectedEl.id, 'e')}
                    style={{
                      position: 'absolute',
                      width: 9,
                      height: 9,
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '50%',
                      pointerEvents: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      right: -4.5,
                      top: '50%',
                      marginTop: -4.5,
                      cursor: 'ew-resize',
                    }}
                  />
                </div>
              )}


              {/* Prompt if card is empty */}
              {!previewMode && elements.length === 0 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  color: '#64748b',
                  zIndex: 2,
                  pointerEvents: 'none',
                  padding: 20,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24 }}>📄</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Empty Card Canvas</div>
                  <div style={{ fontSize: 9 }}>Click "Add Fields" or elements in the sidebar to build your card template.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Footer status */}
        <div style={{
          height: 24,
          background: '#0f172a',
          borderTop: '1px solid #1e293b',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 9,
          color: '#64748b',
        }}>
          <span>Canvas size: {EDIT_W} × {EDIT_H} px</span>
          <span>Elements count: {elements.length}</span>
          {selectedEl && (
            <span style={{ color: '#3b82f6', fontWeight: 600 }}>
              Selected: {selectedEl.type.toUpperCase()} (x: {Math.round(selectedEl.x)}%, y: {Math.round(selectedEl.y)}%)
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── Inline Style Helpers ───────────────────────────────────────────────────

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #475569',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 11,
  color: '#f1f5f9',
  background: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
};

const nestedLabel: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  marginBottom: 2,
  display: 'block',
};

const addElemBtn: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s ease',
};

const toolBtnStyle: React.CSSProperties = {
  padding: '3px 8px',
  background: '#334155',
  border: '1px solid #475569',
  borderRadius: 4,
  color: '#cbd5e1',
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
};

const stepBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#334155',
  border: '1px solid #475569',
  borderRadius: 4,
  color: '#cbd5e1',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  fontSize: 9,
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'center',
};

const coordLabel: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  marginBottom: 2,
  display: 'block',
};

const coordSliderLabel: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: '#94a3b8',
  width: 36,
  flexShrink: 0,
};

const coordInput: React.CSSProperties = {
  width: '100%',
  border: '1px solid #475569',
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 10,
  color: '#f1f5f9',
  background: '#0f172a',
  textAlign: 'center',
};

function toggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '4px 8px',
    background: active ? '#2563eb' : '#334155',
    border: active ? '1px solid #2563eb' : '1px solid #475569',
    borderRadius: 4,
    color: active ? '#fff' : '#cbd5e1',
    fontWeight: 700,
    fontSize: 10,
    cursor: 'pointer',
    textAlign: 'center',
  };
}

function cardBorderRadiusCss(r?: string) {
  return r === 'none' ? '0px' : r === 'sm' ? '6px' : r === 'md' ? '12px' : r === 'lg' ? '18px' : r === 'full' ? '28px' : '12px';
}
