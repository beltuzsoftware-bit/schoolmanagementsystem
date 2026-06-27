import { IDCardElementShape } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CanvasElemType = 'photo' | 'text' | 'field' | 'signature' | 'labelfield' | 'qrcode';
export type TextAlign = 'left' | 'center' | 'right';
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface CanvasElement {
  id: string;
  type: CanvasElemType;
  x: number;        // % of card width
  y: number;        // % of card height
  width: number;    // % of card width
  height: number;   // % of card height
  rotation: number; // degrees
  opacity: number;  // 0-1
  zIndex: number;
  locked?: boolean;

  // Photo
  shape?: IDCardElementShape;
  borderColor?: string;
  borderWidth?: number;

  // Text / Field / Signature
  text?: string;
  fieldKey?: string;
  fieldLabel?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  color?: string;
  align?: TextAlign;
  bgColor?: string;
  borderRadius?: number; // px, for text box background
}

// ─── Resize math ─────────────────────────────────────────────────────────────

export function applyResize(
  el: CanvasElement,
  handle: ResizeHandle,
  dxPct: number,
  dyPct: number,
): Partial<CanvasElement> {
  let { x, y, width, height } = el;
  const minW = 4, minH = 3;

  if (handle.includes('e')) width  = Math.max(minW, width  + dxPct);
  if (handle.includes('s')) height = Math.max(minH, height + dyPct);

  if (handle.includes('w')) {
    const nw = Math.max(minW, width - dxPct);
    x += width - nw;
    width = nw;
  }
  if (handle.includes('n')) {
    const nh = Math.max(minH, height - dyPct);
    y += height - nh;
    height = nh;
  }

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width:  Math.min(100, width),
    height: Math.min(100, height),
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const RESIZE_HANDLES: { pos: ResizeHandle; cx: number; cy: number }[] = [
  { pos: 'nw', cx: 0,   cy: 0   }, { pos: 'n',  cx: 50,  cy: 0   }, { pos: 'ne', cx: 100, cy: 0   },
  { pos: 'w',  cx: 0,   cy: 50  },                                    { pos: 'e',  cx: 100, cy: 50  },
  { pos: 'sw', cx: 0,   cy: 100 }, { pos: 's',  cx: 50,  cy: 100 }, { pos: 'se', cx: 100, cy: 100 },
];

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  w:  'w-resize',                  e:  'e-resize',
  sw: 'sw-resize', s: 's-resize', se: 'se-resize',
};

export const STUDENT_FIELDS = [
  { key: 'name',            label: 'Student Name' },
  { key: 'className',       label: 'Class' },
  { key: 'rollNumber',      label: 'Roll No.' },
  { key: 'admissionNumber', label: 'Admission No.' },
  { key: 'dob',             label: 'Date of Birth' },
  { key: 'bloodGroup',      label: 'Blood Group' },
  { key: 'phone',           label: 'Phone' },
  { key: 'currentAddress',  label: 'Address' },
  { key: 'fatherName',      label: "Father's Name" },
  { key: 'motherName',      label: "Mother's Name" },
  { key: 'gender',          label: 'Gender' },
  { key: 'house',           label: 'House' },
];

export const PREVIEW_DATA: Record<string, string> = {
  name:            'Aarav Sharma',
  className:       'Class 10 - A',
  rollNumber:      '1023',
  admissionNumber: 'ADM-2024-001',
  dob:             '12-05-2008',
  bloodGroup:      'B+',
  phone:           '+91 98765 43210',
  currentAddress:  '123 Green Park, New Delhi',
  fatherName:      'Rajesh Sharma',
  motherName:      'Sunita Sharma',
  gender:          'Male',
  house:           'Tagore House',
};

export function getDefaultCanvasElements(layout: 'vertical' | 'horizontal'): any[] {
  const isVertical = layout === 'vertical';
  if (isVertical) {
    // Vertical card: photo centered top, label+field rows below, signature bottom
    return [
      {
        id: 'photo', type: 'photo',
        x: 32, y: 8, width: 36, height: 24,
        rotation: 0, opacity: 1, zIndex: 0,
        shape: 'rectangle', borderColor: '#1a6b2a', borderWidth: 2
      },
      {
        id: 'sig', type: 'signature',
        x: 28, y: 33, width: 44, height: 9,
        rotation: 0, opacity: 1, zIndex: 1,
        text: 'Principal', fontSize: 9, color: '#475569'
      },
      {
        id: 'f_name', type: 'labelfield',
        x: 5, y: 46, width: 90, height: 8.5,
        rotation: 0, opacity: 1, zIndex: 2,
        fieldKey: 'name', fieldLabel: 'Name :', labelText: 'Name :',
        showLabel: true, labelWidth: 30,
        fontSize: 11, fontWeight: 'bold', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_class', type: 'labelfield',
        x: 5, y: 56, width: 90, height: 8.5,
        rotation: 0, opacity: 1, zIndex: 3,
        fieldKey: 'className', fieldLabel: 'Class :', labelText: 'Class :',
        showLabel: true, labelWidth: 30,
        fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_roll', type: 'labelfield',
        x: 5, y: 66, width: 90, height: 8.5,
        rotation: 0, opacity: 1, zIndex: 4,
        fieldKey: 'rollNumber', fieldLabel: 'Roll No. :', labelText: 'Roll No. :',
        showLabel: true, labelWidth: 30,
        fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_dob', type: 'labelfield',
        x: 5, y: 76, width: 90, height: 8.5,
        rotation: 0, opacity: 1, zIndex: 5,
        fieldKey: 'dob', fieldLabel: 'DOB :', labelText: 'DOB :',
        showLabel: true, labelWidth: 30,
        fontSize: 11, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'footer', type: 'text',
        x: 5, y: 87, width: 90, height: 8,
        rotation: 0, opacity: 1, zIndex: 6,
        text: 'IDENTITY CARD', fontSize: 13, fontWeight: 'bold',
        fontStyle: 'normal', underline: false, color: '#1e293b', align: 'center'
      }
    ];
  } else {
    // Horizontal card: photo top-left, label+field rows top-right, signature below photo, footer
    return [
      {
        id: 'photo', type: 'photo',
        x: 3, y: 15, width: 24, height: 54,
        rotation: 0, opacity: 1, zIndex: 0,
        shape: 'rectangle', borderColor: '#1a6b2a', borderWidth: 2
      },
      {
        id: 'sig', type: 'signature',
        x: 3, y: 71, width: 24, height: 11,
        rotation: 0, opacity: 1, zIndex: 1,
        text: 'Principal', fontSize: 8, color: '#475569'
      },
      {
        id: 'f_sr', type: 'labelfield',
        x: 30, y: 15, width: 42, height: 9,
        rotation: 0, opacity: 1, zIndex: 2,
        fieldKey: 'admissionNumber', fieldLabel: 'SR.No. :', labelText: 'SR.No. :',
        showLabel: true, labelWidth: 35,
        fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_class', type: 'labelfield',
        x: 75, y: 15, width: 22, height: 9,
        rotation: 0, opacity: 1, zIndex: 3,
        fieldKey: 'className', fieldLabel: 'Class :', labelText: 'Class :',
        showLabel: true, labelWidth: 42,
        fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_name', type: 'labelfield',
        x: 30, y: 26, width: 67, height: 9,
        rotation: 0, opacity: 1, zIndex: 4,
        fieldKey: 'name', fieldLabel: 'Name :', labelText: 'Name :',
        showLabel: true, labelWidth: 22,
        fontSize: 10, fontWeight: 'bold', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_father', type: 'labelfield',
        x: 30, y: 37, width: 67, height: 9,
        rotation: 0, opacity: 1, zIndex: 5,
        fieldKey: 'fatherName', fieldLabel: "Father's Name :", labelText: "Father's Name :",
        showLabel: true, labelWidth: 32,
        fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_dob', type: 'labelfield',
        x: 30, y: 48, width: 67, height: 9,
        rotation: 0, opacity: 1, zIndex: 6,
        fieldKey: 'dob', fieldLabel: 'Date of Birth :', labelText: 'Date of Birth :',
        showLabel: true, labelWidth: 32,
        fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_phone', type: 'labelfield',
        x: 30, y: 59, width: 67, height: 9,
        rotation: 0, opacity: 1, zIndex: 7,
        fieldKey: 'phone', fieldLabel: 'Ph/Mob. :', labelText: 'Ph/Mob. :',
        showLabel: true, labelWidth: 32,
        fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'f_addr', type: 'labelfield',
        x: 30, y: 70, width: 67, height: 14,
        rotation: 0, opacity: 1, zIndex: 8,
        fieldKey: 'currentAddress', fieldLabel: 'Address :', labelText: 'Address :',
        showLabel: true, labelWidth: 22,
        fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', underline: false,
        color: '#1e293b', labelColor: '#1e293b', align: 'left', fieldBgColor: '#ffffff'
      },
      {
        id: 'footer', type: 'text',
        x: 3, y: 87, width: 94, height: 9,
        rotation: 0, opacity: 1, zIndex: 9,
        text: 'IDENTITY CARD', fontSize: 13, fontWeight: 'bold',
        fontStyle: 'normal', underline: false, color: '#1e293b', align: 'center'
      }
    ];
  }
}

