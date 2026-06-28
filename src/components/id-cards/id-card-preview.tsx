"use client";

import { useRef, useState, useEffect } from "react";
import { Student, IDCardTemplate, School } from "@/types";
import { cn } from "@/lib/utils";
import { getShapeStyle } from "@/lib/id-card-utils";
import QRCode from "react-qr-code";

interface IDCardPreviewProps {
    student: Student;
    template: IDCardTemplate;
    school: School | null;
    scale?: number;
}

/** Maps a template field key to the actual value on the student record. */
function resolveValue(student: Student, key: string): string {
    if (key === "address" || key === "currentAddress")
        return student.currentAddress || (student as any).address || "N/A";
    if (key === "emergencyContact" || key === "phone")
        return student.phone || student.fatherPhone || "N/A";
    if (key === "className")
        return [student.className, student.section].filter(Boolean).join(" - ") || "N/A";
    return (student as any)[key] || "N/A";
}

function cardRadiusCss(r?: string) {
    return r === "none" ? "0px" : r === "sm" ? "4px" : r === "lg" ? "16px" : r === "full" ? "24px" : "8px"; // md default
}

export function IDCardPreview({ student, template, school, scale = 4 }: IDCardPreviewProps) {
    const isVertical = template.layout === "vertical";
    const isDragDrop = template.layoutMode === "drag-drop";
    const bodyText = template.textColor || "#1e293b";
    const headerText = template.headerTextColor || "#ffffff";

    const pp = template.photoPosition ?? { x: 35, y: 15, width: 28, height: 26 };
    const sp = template.signaturePosition ?? { x: 70, y: 80, width: 20, height: 10 };

    const containerRef = useRef<HTMLDivElement>(null);
    const [adjustedTops, setAdjustedTops] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!isDragDrop || !template.canvasElements || template.canvasElements.length === 0) return;

        const container = containerRef.current;
        if (!container) return;

        const nodes = Array.from(container.querySelectorAll('[data-element-id]')) as HTMLElement[];
        if (nodes.length === 0) return;

        const measuredHeights = new Map<string, number>();
        nodes.forEach(node => {
            const id = node.getAttribute('data-element-id');
            if (id) {
                measuredHeights.set(id, node.offsetHeight);
            }
        });

        // Use the actual body container height so positions are calculated
        // in the correct coordinate space (body div excludes the ~22% header).
        const bodyHeightPx = container.offsetHeight || (template.height * scale * 0.78);

        // Fixed-layout elements that should NEVER be displaced by the push-down algorithm.
        // Photo is special — it won't be pushed by text but WILL align its top with adjacent row elements.
        const RIGID_TYPES = new Set(['qrcode', 'signature', 'shape', 'line']);
        const FIXED_TYPES = new Set(['photo', 'qrcode', 'signature', 'shape', 'line']);

        const sorted = [...template.canvasElements].sort((a, b) => a.y - b.y);
        // Store adjusted tops as PERCENTAGES (0-100) so they are scale-independent.
        // This means the same values work for screen preview and for print (mm dimensions).
        const topsPct: Record<string, number> = {};

        // First pass: handle all non-photo, non-rigid elements (text, field, labelfield, etc.)
        sorted.forEach((el, index) => {
            const isRigid = RIGID_TYPES.has(el.type) || (el.rotation && el.rotation !== 0);
            const isPhoto = el.type === 'photo';

            if (isRigid || isPhoto) {
                topsPct[el.id] = el.y; // will be refined below for photos
                return;
            }

            let actualTopPx = (el.y / 100) * bodyHeightPx;
            const elSpanStart = el.x;
            const elSpanEnd = el.x + el.width;

            for (let i = 0; i < index; i++) {
                const prev = sorted[i];
                if (prev.rotation && prev.rotation !== 0) continue;
                if (FIXED_TYPES.has(prev.type)) continue; // fixed elements don't push text

                const prevTopPx = (topsPct[prev.id] / 100) * bodyHeightPx;
                const prevHeight = measuredHeights.get(prev.id) ?? ((prev.height / 100) * bodyHeightPx);
                const prevSpanStart = prev.x;
                const prevSpanEnd = prev.x + prev.width;

                const overlapsX = Math.max(elSpanStart, prevSpanStart) < Math.min(elSpanEnd, prevSpanEnd);

                if (overlapsX && el.y > prev.y + 3.0) {
                    // Gap between designed element tops, converted to px
                    const gapPct = el.y - (topsPct[prev.id] + prev.height);
                    const gapPx = gapPct > 0 ? (gapPct / 100) * bodyHeightPx : 0;
                    const minTopPx = prevTopPx + prevHeight + gapPx;
                    if (minTopPx > actualTopPx) {
                        actualTopPx = minTopPx;
                    }
                }
            }
            // Convert back to percentage for scale-independent storage
            topsPct[el.id] = (actualTopPx / bodyHeightPx) * 100;
        });

        // Second pass: align photo top with the minimum adjusted top of flow elements
        // at approximately the same vertical level (within ±15% of the photo's designed y).
        sorted.forEach((el) => {
            if (el.type !== 'photo') return;

            // Find the minimum adjusted top of flow elements that are:
            // - approximately at the same row as the photo (within ±15% vertically)
            // - horizontally non-overlapping with the photo (different column)
            const photoDesignedY = el.y;
            const photoSpanStart = el.x;
            let minRowTop: number | null = null;

            sorted.forEach((other) => {
                if (other.id === el.id) return;
                if (FIXED_TYPES.has(other.type)) return;
                if (topsPct[other.id] === undefined) return;

                const otherSpanEnd = other.x + other.width;
                const isInDifferentColumn = otherSpanEnd <= photoSpanStart + 2; // +2% tolerance
                const isNearSameRow = Math.abs(other.y - photoDesignedY) <= 15;

                if (isNearSameRow && isInDifferentColumn) {
                    const otherAdjustedTop = topsPct[other.id];
                    if (minRowTop === null || otherAdjustedTop < minRowTop) {
                        minRowTop = otherAdjustedTop;
                    }
                }
            });

            // Snap photo top to the minimum row top (so photo aligns with student name)
            if (minRowTop !== null) {
                topsPct[el.id] = minRowTop;
            }
        });



        let changed = false;
        for (const id in topsPct) {
            if (Math.abs(topsPct[id] - (adjustedTops[id] ?? -999)) > 0.1) {
                changed = true;
                break;
            }
        }
        if (changed) {
            setAdjustedTops(topsPct);
        }
    // Note: scale is intentionally excluded — percentages are scale-independent
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [student, template, school, isDragDrop]);

    return (
        <div
            className="relative overflow-hidden border flex flex-col print-card"
            style={{
                width: `${template.width * scale}px`,
                height: `${template.height * scale}px`,
                backgroundColor: (template.backgroundImage && (template.backgroundImage.startsWith('#') || template.backgroundImage.match(/^[a-zA-Z]+$/))) 
                    ? template.backgroundImage 
                    : template.secondaryColor,
                fontFamily: template.fontFamily,
                color: bodyText,
                borderColor: template.borderColor || "#cbd5e1",
                borderWidth: `${template.borderWidth ?? 1}px`,
                borderRadius: cardRadiusCss(template.borderRadius),
                backgroundImage: template.backgroundImage?.startsWith("linear-gradient")
                    ? template.backgroundImage : undefined,
                ['--print-width' as any]: `${template.width}mm`,
                ['--print-height' as any]: `${template.height}mm`,
            }}
        >
            {/* Background image layer */}
            {template.backgroundImage && 
             !template.backgroundImage.startsWith("linear-gradient") && 
             !template.backgroundImage.startsWith("#") && 
             !template.backgroundImage.match(/^[a-zA-Z]+$/) && (
                <div className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
                    style={{ backgroundImage: `url(${template.backgroundImage})` }} />
            )}

            {/* ── School Header ── */}
            {template.showSchoolHeader !== false && (
                <div
                    className={cn("relative flex items-center gap-3 px-3 z-10 shrink-0",
                        isVertical ? "h-[22%] pt-3 pb-1" : "h-[22%]")}
                    style={{ backgroundColor: template.backgroundImage ? "transparent" : template.primaryColor }}
                >
                    {template.showLogo && school?.logo && (
                        <img src={school.logo} alt="Logo" className="h-8 w-8 object-contain rounded bg-white/90 p-0.5 shrink-0" />
                    )}
                    <div>
                        <h2 className="font-bold leading-tight uppercase tracking-wide"
                            style={{ fontSize: `${scale * 2.8}px`, color: headerText }}>
                            {school?.name || "School Name"}
                        </h2>
                        <p style={{ fontSize: `${scale * 1.8}px`, color: headerText, opacity: 0.85 }} className="truncate">
                            {school?.address || "School Address"}
                        </p>
                    </div>
                </div>
            )}
            {/* ─────────────── DRAG-DROP layout ─────────────── */}
            {isDragDrop ? (
                template.canvasElements && template.canvasElements.length > 0 ? (
                    <div className="flex-1 relative z-10" ref={containerRef}>
                        {(() => {
                            const editorW = isVertical ? 340 : 520;
                            const currentW = template.width * scale;
                            const fontScale = currentW / editorW;
                            const flowTypes = ['field', 'labelfield', 'text'];

                            // Thresholds (in characters) at which we activate auto-scaling.
                            // Only names LONGER than this get single-line auto-scale treatment.
                            const NAME_THRESHOLDS: Record<string, number> = { name: 22, fatherName: 20 };

                            // Name and fatherName fields use auto-scale single-line rendering only
                            // when the student's actual name is LONG. Short names stay as normal
                            // flow elements (height:auto) so they align with their label text siblings.
                            const SINGLE_LINE_KEYS = new Set(['name', 'fatherName']);

                            const isNameTooLong = (el: any): boolean => {
                                if (!SINGLE_LINE_KEYS.has(el.fieldKey)) return false;
                                const val = resolveValue(student, el.fieldKey);
                                // Compare raw value length only (not the "Father: " prefix)
                                return (val || '').length > (NAME_THRESHOLDS[el.fieldKey] ?? 22);
                            };

                            const isTextFlowElement = (el: any) => {
                                // Long-name fields use fixed-height auto-scale rendering → not flow
                                if (el.type === 'field' && isNameTooLong(el)) return false;
                                return flowTypes.includes(el.type) && (!el.rotation || el.rotation === 0);
                            };

                            // Find text label elements that are companions to name/fatherName fields.
                            // Suppress them ONLY if the current student's name is actually too long.
                            const suppressedLabelIds = new Set<string>();
                            const LABEL_PATTERNS = /^(student\s*name|name|father'?s?\s*name|father\s*name|father|mother'?s?\s*name|mother\s*name)\s*[:\-]?$/i;
                            if (template.canvasElements) {
                                const nameFieldMap: { fieldKey: string; y: number }[] = [];
                                template.canvasElements.forEach((el: any) => {
                                    if (el.type === 'field' && SINGLE_LINE_KEYS.has(el.fieldKey)) {
                                        nameFieldMap.push({ fieldKey: el.fieldKey, y: el.y });
                                    }
                                });
                                template.canvasElements.forEach((el: any) => {
                                    if (el.type !== 'text') return;
                                    const txt = (el.text || '').trim();
                                    if (!LABEL_PATTERNS.test(txt)) return;
                                    const matchingField = nameFieldMap.find(f => Math.abs(el.y - f.y) <= 4);
                                    if (!matchingField) return;
                                    // Only suppress label if the raw student value is too long
                                    const studentVal = resolveValue(student, matchingField.fieldKey);
                                    const threshold = NAME_THRESHOLDS[matchingField.fieldKey] ?? 22;
                                    if ((studentVal || '').length > threshold) suppressedLabelIds.add(el.id);
                                });
                            }

                            const renderElementInner = (el: any, fontScale: number, isFlow: boolean) => {
                                const shapeStyle = el.type === 'photo' ? getShapeStyle(el.shape) : {};
                                const fontSize = (el.fontSize ?? 11) * fontScale;
                                const borderWidth = (el.borderWidth ?? 2) * fontScale;

                                const textStyle: React.CSSProperties = {
                                    fontSize: `${fontSize}px`,
                                    fontWeight: el.fontWeight === 'bold' ? 700 : 400,
                                    fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal',
                                    textDecoration: el.underline ? 'underline' : 'none',
                                    color: el.color ?? '#1e293b',
                                    textAlign: el.align ?? 'left',
                                    backgroundColor: el.bgColor ?? 'transparent',
                                    padding: `${1 * fontScale}px ${3 * fontScale}px`,
                                };

                                return (
                                    <div
                                        style={isFlow ? {
                                            width: '100%',
                                            height: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        } : {
                                            width: '100%',
                                            height: '100%',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {el.type === 'photo' && (
                                            <div
                                                className="w-full h-full overflow-hidden bg-slate-100"
                                                style={{
                                                    ...shapeStyle,
                                                    border: `${borderWidth}px solid ${el.borderColor ?? template.primaryColor}`,
                                                }}
                                            >
                                                {student.photo ? (
                                                    <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold" style={{ fontSize: `${scale * 2.5}px` }}>
                                                        PHOTO
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {el.type === 'qrcode' && (() => {
                                            const borderStyle = el.borderWidth ? `${el.borderWidth * fontScale}px solid ${el.borderColor || '#cbd5e1'}` : undefined;
                                            const qrValue = student.admissionNumber || student.id || '';
                                            return (
                                                <div className="w-full h-full overflow-hidden flex items-center justify-center" style={{
                                                    backgroundColor: el.bgColor || '#ffffff',
                                                    padding: `${2 * fontScale}px`,
                                                    borderRadius: el.borderRadius ? `${el.borderRadius * fontScale}px` : undefined,
                                                    border: borderStyle,
                                                }}>
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <QRCode
                                                            value={qrValue}
                                                            size={256}
                                                            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                                            viewBox="0 0 256 256"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {el.type === 'text' && (() => {
                                             // Suppress label text elements that are companions to name/fatherName fields
                                             if (suppressedLabelIds.has(el.id)) return null;
                                             return (
                                                 <div className={cn("w-full flex items-center", isFlow ? "h-auto" : "h-full")} style={{
                                                     ...textStyle,
                                                     border: el.borderWidth ? `${el.borderWidth * fontScale}px solid ${el.borderColor || '#cbd5e1'}` : undefined,
                                                     borderRadius: el.borderRadius ? `${el.borderRadius * fontScale}px` : undefined,
                                                     minHeight: isFlow ? undefined : '100%',
                                                 }}>
                                                     {el.text ?? ''}
                                                 </div>
                                             );
                                         })()}

                                         {el.type === 'field' && (() => {
                                             const isSplitValue = !el.fieldLabel || el.fieldLabel.startsWith('__split_label_of__');
                                             const valStr = resolveValue(student, el.fieldKey ?? '');
                                             const borderStyle = el.borderWidth ? `${el.borderWidth * fontScale}px solid ${el.borderColor || '#cbd5e1'}` : undefined;

                                              // ── Special rendering for name/fatherName when the value is TOO LONG ──
                                             // For short names: fall through to normal rendering below.
                                             if (el.fieldKey === 'name' || el.fieldKey === 'fatherName') {
                                                 const isFather = el.fieldKey === 'fatherName';
                                                 const rawName = valStr || (isFather ? 'Father Name' : 'Student Name');
                                                 const threshold = NAME_THRESHOLDS[el.fieldKey] ?? 22;

                                                 // Check raw name length only (not including any prefix)
                                                 if (rawName.length > threshold) {
                                                     const displayText = (isFather ? 'Father: ' : '') + rawName;
                                                     // Scale font so the full display text fits on one line
                                                     const baseFontPx = fontSize;
                                                     const autoFontPx = Math.max(
                                                         baseFontPx * 0.55,
                                                         baseFontPx * (threshold / displayText.length)
                                                     );
                                                     return (
                                                         <div className="w-full h-full flex items-center overflow-hidden" style={{
                                                             backgroundColor: el.bgColor ?? 'transparent',
                                                             padding: `${1 * fontScale}px ${3 * fontScale}px`,
                                                             border: borderStyle,
                                                             borderRadius: el.borderRadius ? `${el.borderRadius * fontScale}px` : undefined,
                                                         }}>
                                                             <span style={{
                                                                 fontSize: `${autoFontPx}px`,
                                                                 fontWeight: isFather ? 600 : (el.fontWeight === 'bold' ? 700 : 600),
                                                                 color: el.color ?? '#1e293b',
                                                                 whiteSpace: 'nowrap',
                                                                 overflow: 'hidden',
                                                                 textOverflow: 'ellipsis',
                                                                 width: '100%',
                                                                 letterSpacing: '0.01em',
                                                                 lineHeight: 1.2,
                                                             }}>
                                                                 {isFather && (
                                                                     <span style={{ opacity: 0.55, fontWeight: 500 }}>Father: </span>
                                                                 )}
                                                                 {rawName}
                                                             </span>
                                                         </div>
                                                     );
                                                 }
                                                 // Short name: fall through to normal isSplitValue rendering below
                                             }

                                             if (isSplitValue) {
                                                 return (
                                                     <div className={cn("w-full flex items-center", isFlow ? "h-auto" : "h-full")} style={{
                                                         backgroundColor: el.bgColor ?? 'transparent',
                                                         padding: `${1 * fontScale}px ${3 * fontScale}px`,
                                                         borderRadius: el.borderRadius ? `${el.borderRadius * fontScale}px` : undefined,
                                                         border: borderStyle,
                                                         minHeight: isFlow ? undefined : '100%',
                                                     }}>
                                                         <span style={{
                                                             ...textStyle,
                                                             backgroundColor: 'transparent',
                                                             padding: 0,
                                                             lineHeight: 1.25,
                                                             textAlign: el.align ?? 'left',
                                                             width: '100%',
                                                             whiteSpace: 'normal',
                                                             wordBreak: 'break-word',
                                                         }}>{valStr}</span>
                                                     </div>
                                                 );
                                             }
                                             return (
                                                 <div className={cn("w-full flex flex-col justify-center", isFlow ? "h-auto" : "h-full")} style={{
                                                     backgroundColor: el.bgColor ?? 'transparent',
                                                     padding: `${1 * fontScale}px ${3 * fontScale}px`,
                                                     border: borderStyle,
                                                     borderRadius: el.borderRadius ? `${el.borderRadius * fontScale}px` : undefined,
                                                     minHeight: isFlow ? undefined : '100%',
                                                 }}>
                                                     <span style={{
                                                         fontSize: `${Math.max(5 * fontScale, fontSize * 0.68)}px`,
                                                         color: el.color ?? '#1e293b',
                                                         opacity: 0.45,
                                                         fontWeight: 700,
                                                         textTransform: 'uppercase',
                                                         letterSpacing: '0.04em',
                                                         lineHeight: 1.1,
                                                     }}>
                                                         {el.fieldLabel}
                                                     </span>
                                                     <span style={{ ...textStyle, backgroundColor: 'transparent', padding: 0, lineHeight: 1.25, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                         {valStr}
                                                     </span>
                                                 </div>
                                             );
                                         })()}

                                        {el.type === 'signature' && (
                                            <div className="w-full h-full flex flex-col items-center justify-end" style={{ color: el.color ?? '#64748b' }}>
                                                {school?.signature ? (
                                                    <img src={school.signature} alt="Signature" className="w-full object-contain opacity-90 max-h-[75%]" />
                                                ) : (
                                                    <div className="w-full border-b border-dashed border-current mb-0.5" style={{ borderWidth: `${Math.max(1, fontScale)}px` }} />
                                                )}
                                                <span style={{ fontSize: `${(el.fontSize ?? 8) * fontScale}px`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    {el.text ?? 'Signature'}
                                                </span>
                                            </div>
                                        )}

                                        {el.type === 'labelfield' && (() => {
                                             const lblW = el.labelWidth ?? 35;
                                             const valStr = resolveValue(student, el.fieldKey ?? '');
                                             return (
                                                 <div className={cn("w-full flex items-stretch", isFlow ? "h-auto" : "h-full")} style={{ minHeight: isFlow ? undefined : '100%' }}>
                                                     {el.showLabel !== false && (
                                                         <div style={{
                                                             width: `${lblW}%`,
                                                             display: 'flex', alignItems: 'center',
                                                             justifyContent: el.labelAlign === 'center' ? 'center' : el.labelAlign === 'right' ? 'flex-end' : 'flex-start',
                                                             fontSize: `${fontSize}px`,
                                                             fontWeight: el.fontWeight === 'bold' ? 700 : 400,
                                                             color: el.labelColor ?? el.color ?? '#1e293b',
                                                             paddingLeft: `${2 * fontScale}px`,
                                                             paddingRight: `${1 * fontScale}px`,
                                                             flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden',
                                                         }}>
                                                             {el.labelText ?? el.fieldLabel ?? el.fieldKey}
                                                         </div>
                                                     )}
                                                     <div style={{
                                                         flex: 1, display: 'flex', alignItems: 'center',
                                                         background: el.fieldBgColor && el.fieldBgColor !== 'transparent' ? el.fieldBgColor : 'transparent',
                                                         border: (el.borderWidth && el.borderWidth > 0) ? `${el.borderWidth * fontScale}px solid ${el.borderColor || '#cbd5e1'}` : 'none',
                                                         borderRadius: el.borderRadius ? `${el.borderRadius * fontScale}px` : `${1 * fontScale}px`,
                                                     }}>
                                                         <span style={{
                                                             fontSize: `${fontSize}px`,
                                                             fontWeight: el.fontWeight === 'bold' ? 700 : 400,
                                                             fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal',
                                                             textDecoration: el.underline ? 'underline' : 'none',
                                                             color: el.color ?? '#1e293b',
                                                             paddingLeft: `${3 * fontScale}px`,
                                                             width: '100%',
                                                             textAlign: el.valueAlign ?? el.align ?? 'left',
                                                             whiteSpace: 'normal',
                                                             wordBreak: 'break-word',
                                                         }}>{valStr}</span>
                                                     </div>
                                                 </div>
                                             );
                                         })()}
                                    </div>
                                );
                            };

                            return template.canvasElements.map(el => {
                                const isFlow = isTextFlowElement(el);
                                const FIXED_TYPES = new Set(['photo', 'qrcode', 'signature', 'shape', 'line']);
                                const isFixedEl = FIXED_TYPES.has(el.type);
                                const adjustedTop = adjustedTops[el.id];
                                // Positions are stored as percentages — scale-independent, works for both screen and print
                                const topStyle = adjustedTop !== undefined ? `${adjustedTop}%` : `${el.y}%`;

                                return (
                                    <div
                                        key={el.id}
                                        data-element-id={el.id}
                                        style={{
                                            position: 'absolute',
                                            left: `${el.x}%`,
                                            top: topStyle,
                                            width: `${el.width}%`,
                                            height: isFlow ? 'auto' : `${el.height}%`,
                                            transform: `rotate(${el.rotation ?? 0}deg)`,
                                            opacity: el.opacity ?? 1,
                                            zIndex: (el.zIndex ?? 0) + 1,
                                            transformOrigin: 'center center',
                                            // Fixed elements (photo, QR) clip their content cleanly
                                            overflow: isFixedEl ? 'hidden' : 'visible',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        {renderElementInner(el, fontScale, isFlow)}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                ) : (
                    <div className="flex-1 relative z-10">

                        {/* Photo */}
                        {template.showPhoto && (
                            <div
                                className="absolute overflow-hidden bg-slate-100 flex items-center justify-center"
                                style={{
                                    left: `${pp.x}%`, top: `${pp.y}%`,
                                    width: `${pp.width ?? 28}%`,
                                    height: `${pp.height ?? 26}%`,
                                    border: `${pp.borderWidth ?? 2}px solid ${pp.borderColor ?? template.primaryColor}`,
                                    ...getShapeStyle(pp.shape ?? 'rounded'),
                                }}
                            >
                                {student.photo
                                    ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                    : <div className="text-slate-400 font-bold" style={{ fontSize: `${scale}px` }}>PHOTO</div>
                                }
                            </div>
                        )}

                        {/* Fields */}
                        {template.fields.map(field => {
                            const val = resolveValue(student, field.key);
                            return (
                                <div key={field.id}
                                    className="absolute flex flex-col"
                                    style={{ left: `${field.x ?? 10}%`, top: `${field.y ?? 45}%` }}
                                >
                                    <span className="uppercase font-semibold tracking-wide leading-none"
                                        style={{ fontSize: `${scale * 1.5}px`, color: bodyText, opacity: 0.55 }}>
                                        {field.label}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: `${(field.fontSize ?? 10) * (scale / 4)}px`,
                                            fontWeight: field.bold ? 700 : 500,
                                            color: field.fontColor ?? bodyText,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {val}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Signature */}
                        <div className="absolute flex flex-col items-center"
                            style={{
                                left: `${sp.x}%`, top: `${sp.y}%`,
                                width: `${sp.width ?? 20}%`,
                                ...getShapeStyle(sp.shape),
                            }}>
                            {school?.signature
                                ? <img src={school.signature} alt="Signature" className="w-full object-contain opacity-90" style={{ height: `${scale * 5}px` }} />
                                : <div className="w-full border-b border-dashed border-slate-300" />
                            }
                            <span className="font-bold uppercase tracking-wider text-slate-500"
                                style={{ fontSize: `${scale * 1.5}px` }}>
                                {template.signatureText}
                            </span>
                        </div>
                    </div>
                )
            ) : (
                /* ─────────────── GRID layout ─────────────── */
                <>
                    <div className={cn("flex relative z-10 flex-1",
                        isVertical ? "flex-col items-center p-3" : "flex-row items-center gap-3 px-3 py-2")}>

                        {/* Photo */}
                        {template.showPhoto && (
                            <div
                                className="overflow-hidden bg-slate-100 flex items-center justify-center shrink-0"
                                style={{
                                    width: `${scale * (isVertical ? 22 : 20)}px`,
                                    height: `${scale * (isVertical ? 22 : 20)}px`,
                                    border: `${pp.borderWidth ?? 2}px solid ${pp.borderColor ?? template.primaryColor}`,
                                    ...getShapeStyle(pp.shape ?? (isVertical ? 'circle' : 'rounded')),
                                }}
                            >
                                {student.photo
                                    ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                    : <div className="text-slate-400 font-bold" style={{ fontSize: `${scale}px` }}>PHOTO</div>
                                }
                            </div>
                        )}

                        {/* Detail fields */}
                        <div className={cn("flex flex-col flex-1", isVertical ? "items-center text-center mt-2" : "text-left")}>
                            {template.fields.map(field => {
                                const val = resolveValue(student, field.key);
                                return (
                                    <div key={field.id} className="mb-1">
                                        <span className="block uppercase font-semibold tracking-wide leading-none"
                                            style={{ fontSize: `${scale * 1.4}px`, color: bodyText, opacity: 0.5 }}>
                                            {field.label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: `${(field.fontSize ?? 10) * (scale / 4)}px`,
                                                fontWeight: field.bold ? 700 : 500,
                                                color: field.fontColor ?? bodyText,
                                            }}
                                        >
                                            {val}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 flex justify-between items-end relative z-10 border-t border-white/10">
                        <div className="flex flex-col">
                            <div className="w-12 h-px bg-slate-300/60 mb-0.5" />
                            <span className="font-bold uppercase tracking-wider text-slate-500"
                                style={{ fontSize: `${scale * 1.5}px` }}>
                                {template.signatureText}
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {template.showQRCode && (
                                <div className="bg-white p-0.5 rounded shrink-0 border border-slate-200">
                                    <QRCode
                                        value={student.admissionNumber || student.id || ''}
                                        size={Math.round(scale * 7)}
                                        style={{ height: 'auto', maxWidth: '100%', width: `${scale * 7}px` }}
                                        viewBox="0 0 256 256"
                                    />
                                </div>
                            )}
                            <span className="font-bold leading-none" style={{ fontSize: `${scale * 1.8}px`, color: template.primaryColor }}>
                                {student.admissionNumber}
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* Bottom bar */}
            <div className="h-1.5 shrink-0 relative z-10" style={{ backgroundColor: template.primaryColor }} />
        </div>
    );
}
