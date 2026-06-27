import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface CustomDatePickerProps {
  date?: Date | null;
  onSelect: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getDaysInMonth(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days = [];
  
  let firstDay = date.getDay() - 1;
  if (firstDay === -1) firstDay = 6;
  
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false, monthOffset: -1 });
  }

  const currentMonthDays = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= currentMonthDays; i++) {
    days.push({ day: i, isCurrentMonth: true, monthOffset: 0 });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false, monthOffset: 1 });
  }

  return days;
}

function formatDateLabel(d?: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Try to parse DD-MM-YYYY (or DD/MM/YYYY) text into a Date. Returns null if invalid. */
function parseInputText(text: string): Date | null {
  const cleaned = text.replace(/\//g, '-').trim();
  const parts = cleaned.split('-');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 1900 || yyyy > 2100) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

export function CustomDatePicker({ date, onSelect, placeholder = 'DD-MM-YYYY', disabled }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(formatDateLabel(date));
  const [inputError, setInputError] = useState(false);
  const [viewDate, setViewDate] = useState(date && !isNaN(date.getTime()) ? date : new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputText when external date prop changes
  useEffect(() => {
    setInputText(formatDateLabel(date));
    if (date && !isNaN(date.getTime())) {
      setViewDate(date);
    }
  }, [date]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const days = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (dayObj: { day: number; monthOffset: number }) => {
    const selected = new Date(currentYear, currentMonth + dayObj.monthOffset, dayObj.day);
    onSelect(selected);
    setInputText(formatDateLabel(selected));
    setInputError(false);
    setIsOpen(false);
  };

  /** Handle user typing into the text box */
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Auto-insert dashes as user types digits: 2 chars → add '-', 5 chars → add '-'
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 2) {
      val = digits;
    } else if (digits.length <= 4) {
      val = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else {
      val = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
    }

    setInputText(val);
    setInputError(false);

    if (val.length === 10) {
      const parsed = parseInputText(val);
      if (parsed) {
        onSelect(parsed);
        setViewDate(parsed);
      } else {
        setInputError(true);
      }
    }
  };

  /** Handle paste: accept DD-MM-YYYY or DD/MM/YYYY pasted text */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    e.preventDefault();
    // Try direct parse
    const parsed = parseInputText(pasted);
    if (parsed) {
      const formatted = formatDateLabel(parsed);
      setInputText(formatted);
      setInputError(false);
      onSelect(parsed);
      setViewDate(parsed);
    } else {
      // Just set text and let user fix it
      setInputText(pasted);
      setInputError(true);
    }
  };

  const handleBlur = () => {
    if (!inputText) {
      setInputError(false);
      return;
    }
    const parsed = parseInputText(inputText);
    if (!parsed) {
      setInputError(true);
    } else {
      setInputError(false);
      setInputText(formatDateLabel(parsed));
      onSelect(parsed);
    }
  };

  return (
    <div className="relative flex items-center">
      {/* Editable text input */}
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={handleTextChange}
        onPaste={handlePaste}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        className={`w-full h-11 pl-4 pr-10 text-sm font-black border rounded-xl focus:ring-4 outline-none transition-all
          bg-white text-slate-900 placeholder:text-slate-300
          disabled:bg-slate-50 disabled:cursor-not-allowed
          ${inputError 
            ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-500' 
            : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
          }`}
      />

      {/* Calendar icon trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CalendarDays size={16} />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-3 shadow-xl" align="end">
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent p-0 hover:opacity-100" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-[13px] font-bold text-slate-800">
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent p-0 hover:opacity-100" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day headers */}
            <div className="flex mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-slate-400 w-8 text-[0.75rem] font-semibold text-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d, i) => {
                const isSelected = date && !isNaN(date.getTime()) &&
                  date.getDate() === d.day &&
                  date.getMonth() === currentMonth + d.monthOffset &&
                  date.getFullYear() === currentYear;

                const isToday = (() => {
                  const t = new Date();
                  const dayDate = new Date(currentYear, currentMonth + d.monthOffset, d.day);
                  return t.toDateString() === dayDate.toDateString();
                })();

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectDay(d)}
                    className={`h-8 w-8 rounded-lg text-sm transition-all flex items-center justify-center font-medium
                      ${isSelected ? 'bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700' : ''}
                      ${!isSelected && isToday ? 'border border-indigo-400 text-indigo-600' : ''}
                      ${!isSelected && d.isCurrentMonth && !isToday ? 'text-slate-800 hover:bg-slate-100' : ''}
                      ${!isSelected && !d.isCurrentMonth ? 'text-slate-300 hover:bg-slate-50' : ''}
                    `}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline error tip */}
      {inputError && (
        <span className="absolute -bottom-4 left-0 text-[10px] text-rose-500 font-bold">
          Use DD-MM-YYYY format
        </span>
      )}
    </div>
  );
}
