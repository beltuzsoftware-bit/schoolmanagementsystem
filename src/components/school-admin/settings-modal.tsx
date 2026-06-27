
'use client';

import React, { useState, useEffect } from 'react';
import { RegNoSettings, EnrollmentNoSettings, ClassSetup, SessionSetup } from '@/types/student-settings';
import TextInput from './text-input';
import Checkbox from './checkbox';
import ConfirmationModal from './confirmation-modal';
import ToggleSwitch from './toggle-switch';
import SelectInput from './select-input';
import StyleSettings from './style-settings';
import { DEFAULT_COLORS } from '@/lib/student-constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: {
    reg: RegNoSettings;
    enroll: EnrollmentNoSettings;
    classes: ClassSetup[];
    sections: string[];
    houses: string[];
    sessions: SessionSetup[];
    religions: string[];
    categories: string[];
    streams: string[];
    sessionStartMonth: number;
    primaryColor: string;
    sidebarBgColor: string;
    sidebarTextColor: string;
  }) => void;
  currentRegSettings: RegNoSettings;
  currentEnrollSettings: EnrollmentNoSettings;
  currentClasses: ClassSetup[];
  currentSections: string[];
  currentHouses: string[];
  currentSessions: SessionSetup[];
  currentReligions: string[];
  currentCategories: string[];
  currentStreams: string[];
  currentSessionStartMonth: number;
  currentPrimaryColor: string;
  currentSidebarBgColor: string;
  currentSidebarTextColor: string;
}

const MONTHS: { [key: string]: number } = {
  'January': 1, 'February': 2, 'March': 3, 'April': 4,
  'May': 5, 'June': 6, 'July': 7, 'August': 8,
  'September': 9, 'October': 10, 'November': 11, 'December': 12
};
const MONTH_NAMES = Object.keys(MONTHS);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentRegSettings, currentEnrollSettings, currentClasses, currentSections, currentHouses, currentSessions, currentReligions, currentCategories, currentStreams, currentSessionStartMonth, currentPrimaryColor, currentSidebarBgColor, currentSidebarTextColor }) => {
  const [settings, setSettings] = useState({ reg: currentRegSettings, enroll: currentEnrollSettings, classes: currentClasses, sections: currentSections, houses: currentHouses, sessions: currentSessions, religions: currentReligions, categories: currentCategories, streams: currentStreams });
  const [activeTab, setActiveTab] = useState<'reg' | 'enroll' | 'sessions' | 'classes' | 'sections' | 'houses' | 'religion' | 'categories' | 'streams' | 'style' | 'batch'>('reg');
  const [sessionStartMonth, setSessionStartMonth] = useState(currentSessionStartMonth);

  // State for theme colors
  const [primaryColor, setPrimaryColor] = useState(currentPrimaryColor);
  const [sidebarBgColor, setSidebarBgColor] = useState(currentSidebarBgColor);
  const [sidebarTextColor, setSidebarTextColor] = useState(currentSidebarTextColor);

  // State for class editor
  const [isEditingClass, setIsEditingClass] = useState<ClassSetup | null>(null);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [currentClassName, setCurrentClassName] = useState('');
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [currentCreateStudentLoginDefault, setCurrentCreateStudentLoginDefault] = useState(false);

  // State for simple list (sections) editing
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionValue, setEditingSectionValue] = useState('');
  const [newSectionValue, setNewSectionValue] = useState('');

  // State for simple list (houses) editing
  const [editingHouseIndex, setEditingHouseIndex] = useState<number | null>(null);
  const [editingHouseValue, setEditingHouseValue] = useState('');
  const [newHouseValue, setNewHouseValue] = useState('');

  // State for sessions editing
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionValue, setEditingSessionValue] = useState('');
  const [newSessionValue, setNewSessionValue] = useState('');

  // State for simple list (religions) editing
  const [editingReligionIndex, setEditingReligionIndex] = useState<number | null>(null);
  const [editingReligionValue, setEditingReligionValue] = useState('');
  const [newReligionValue, setNewReligionValue] = useState('');

  // State for simple list (categories) editing
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [newCategoryValue, setNewCategoryValue] = useState('');

  // State for simple list (streams) editing
  const [editingStreamIndex, setEditingStreamIndex] = useState<number | null>(null);
  const [editingStreamValue, setEditingStreamValue] = useState('');
  const [newStreamValue, setNewStreamValue] = useState('');

  // State for delete confirmation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null as string | number | null,
    type: null as 'class' | 'section' | 'house' | 'session' | 'religion' | 'category' | 'stream' | null,
    message: ''
  });

  useEffect(() => {
    setSettings({ reg: currentRegSettings, enroll: currentEnrollSettings, classes: currentClasses, sections: currentSections, houses: currentHouses, sessions: currentSessions, religions: currentReligions, categories: currentCategories, streams: currentStreams });
    setSessionStartMonth(currentSessionStartMonth);
    setPrimaryColor(currentPrimaryColor);
    setSidebarBgColor(currentSidebarBgColor);
    setSidebarTextColor(currentSidebarTextColor);
  }, [currentRegSettings, currentEnrollSettings, currentClasses, currentSections, currentHouses, currentSessions, currentReligions, currentCategories, currentStreams, currentSessionStartMonth, currentPrimaryColor, currentSidebarBgColor, currentSidebarTextColor, isOpen]);

  useEffect(() => {
    // Reset editors when tab changes
    setIsEditingClass(null);
    setIsAddingClass(false);
    setEditingSectionIndex(null);
    setEditingHouseIndex(null);
    setEditingSessionId(null);
    setEditingReligionIndex(null);
    setEditingCategoryIndex(null);
    setEditingStreamIndex(null);
  }, [activeTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...settings,
      sessionStartMonth,
      primaryColor,
      sidebarBgColor,
      sidebarTextColor,
      classes: settings.classes.filter(c => c.name.trim() !== ''),
      sections: settings.sections.filter(s => s.trim() !== ''),
      houses: settings.houses.filter(h => h.trim() !== ''),
      sessions: settings.sessions.filter(s => s.name.trim() !== ''),
      religions: settings.religions.filter(r => r.trim() !== ''),
      categories: settings.categories.filter(c => c.trim() !== ''),
      streams: settings.streams.filter(s => s.trim() !== ''),
    });
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'reg' | 'enroll') => {
    const newTemplate = e.target.value as RegNoSettings['template'];
    setSettings(prev => ({ ...prev, [target]: { ...prev[target], template: newTemplate } }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, target: 'reg' | 'enroll') => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [target]: { ...prev[target], [name]: value } }));
  }

  const handleUseSameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setSettings(prev => ({ ...prev, enroll: { ...prev.enroll, useSameAsRegNo: isChecked } }));
  };

  const templates = [{ id: 'template1', title: 'Prefix + Separator + Number', description: 'e.g., REG-00001' }, { id: 'template2', title: 'Serial No + Class + Date', description: 'e.g., 00001-C1-0724' }, { id: 'template3', title: 'Number + Separator + Suffix', description: 'e.g., 00001-SCH' }];

  const handleConfirmDelete = () => {
    if (confirmModal.id === null || !confirmModal.type) return;

    if (confirmModal.type === 'class') {
      setSettings(prev => ({ ...prev, classes: prev.classes.filter(c => c.id !== confirmModal.id) }));
    } else if (confirmModal.type === 'section') {
      const sectionToDelete = settings.sections[confirmModal.id as number];
      setSettings(prev => ({
        ...prev,
        sections: prev.sections.filter((_, i) => i !== confirmModal.id),
        // Also remove this section from any classes that have it
        classes: prev.classes.map(c => ({
          ...c,
          sections: c.sections.filter(s => s !== sectionToDelete)
        }))
      }));
    } else if (confirmModal.type === 'house') {
      setSettings(prev => ({ ...prev, houses: prev.houses.filter((_, i) => i !== confirmModal.id) }));
    } else if (confirmModal.type === 'religion') {
      setSettings(prev => ({ ...prev, religions: prev.religions.filter((_, i) => i !== confirmModal.id) }));
    } else if (confirmModal.type === 'category') {
      setSettings(prev => ({ ...prev, categories: prev.categories.filter((_, i) => i !== confirmModal.id) }));
    } else if (confirmModal.type === 'stream') {
      setSettings(prev => ({ ...prev, streams: prev.streams.filter((_, i) => i !== confirmModal.id) }));
    } else if (confirmModal.type === 'session') {
      const sessionToDelete = settings.sessions.find(s => s.id === confirmModal.id);
      // If deleting the active session, make the first one active
      if (sessionToDelete?.isActive && settings.sessions.length > 1) {
        const newSessions = settings.sessions.filter(s => s.id !== confirmModal.id);
        if (newSessions.length > 0) {
          newSessions[0].isActive = true;
        }
        setSettings(prev => ({ ...prev, sessions: newSessions }));
      } else {
        setSettings(prev => ({ ...prev, sessions: prev.sessions.filter(s => s.id !== confirmModal.id) }));
      }
    }
    setConfirmModal({ isOpen: false, id: null, type: null, message: '' });
  };

  // --- Class Editor Logic ---
  const openClassEditorForAdd = () => {
    setIsAddingClass(true);
    setIsEditingClass(null);
    setCurrentClassName('');
    setSelectedSections(new Set());
    setCurrentCreateStudentLoginDefault(false);
  };

  const openClassEditorForEdit = (classSetup: ClassSetup) => {
    setIsEditingClass(classSetup);
    setIsAddingClass(false);
    setCurrentClassName(classSetup.name);
    setSelectedSections(new Set(classSetup.sections));
    setCurrentCreateStudentLoginDefault(classSetup.createStudentLoginDefault);
  };

  const closeClassEditor = () => {
    setIsAddingClass(false);
    setIsEditingClass(null);
  }

  const handleSaveClass = () => {
    if (!currentClassName.trim()) return;
    const newClassSetup: ClassSetup = {
      id: isEditingClass ? isEditingClass.id : `class-${Date.now()}`,
      name: currentClassName.trim(),
      sections: Array.from(selectedSections),
      subjects: isEditingClass ? isEditingClass.subjects : [], // Preserve existing subjects or initialize empty
      createStudentLoginDefault: currentCreateStudentLoginDefault
    };

    if (isEditingClass) {
      setSettings(prev => ({ ...prev, classes: prev.classes.map(c => c.id === isEditingClass.id ? newClassSetup : c) }));
    } else {
      setSettings(prev => ({ ...prev, classes: [...prev.classes, newClassSetup] }));
    }
    closeClassEditor();
  };

  const handleSectionSelectionChange = (sectionName: string) => {
    setSelectedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  const handleSelectAllSections = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSections(new Set(settings.sections));
    } else {
      setSelectedSections(new Set());
    }
  };

  // --- Sections List Logic ---
  const handleSaveSection = (index: number) => {
    if (editingSectionValue.trim() !== '') {
      const oldSectionName = settings.sections[index];
      const newSectionName = editingSectionValue.trim();
      setSettings(prev => ({
        ...prev,
        sections: prev.sections.map((s, i) => i === index ? newSectionName : s),
        classes: prev.classes.map(c => ({
          ...c,
          sections: c.sections.map(sec => sec === oldSectionName ? newSectionName : sec)
        }))
      }));
    }
    setEditingSectionIndex(null);
  };

  const handleAddSection = () => {
    if (newSectionValue.trim() !== '') {
      setSettings(prev => ({ ...prev, sections: [...prev.sections, newSectionValue.trim()] }));
      setNewSectionValue('');
    }
  };

  // --- Houses List Logic ---
  const handleSaveHouse = (index: number) => {
    if (editingHouseValue.trim() !== '') {
      const newHouseName = editingHouseValue.trim();
      setSettings(prev => ({
        ...prev,
        houses: prev.houses.map((h, i) => i === index ? newHouseName : h),
      }));
    }
    setEditingHouseIndex(null);
  };

  const handleAddHouse = () => {
    if (newHouseValue.trim() !== '') {
      setSettings(prev => ({ ...prev, houses: [...prev.houses, newHouseValue.trim()] }));
      setNewHouseValue('');
    }
  };

  // --- Sessions Logic ---
  const handleSetActiveSession = (sessionIdToActivate: string) => {
    setSettings(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => ({
        ...s,
        isActive: s.id === sessionIdToActivate
      }))
    }));
  };

  const handleSaveSession = (sessionId: string) => {
    if (editingSessionValue.trim() !== '') {
      setSettings(prev => ({
        ...prev,
        sessions: prev.sessions.map(s =>
          s.id === sessionId ? { ...s, name: editingSessionValue.trim() } : s
        )
      }));
    }
    setEditingSessionId(null);
  };

  const handleAddSession = () => {
    if (newSessionValue.trim() !== '') {
      const newSession: SessionSetup = {
        id: `session-${Date.now()}`,
        name: newSessionValue.trim(),
        isActive: false // New sessions are inactive by default
      };
      // If it's the first session being added, make it active.
      if (settings.sessions.length === 0) {
        newSession.isActive = true;
      }
      setSettings(prev => ({ ...prev, sessions: [...prev.sessions, newSession] }));
      setNewSessionValue('');
    }
  };

  // --- Religions List Logic ---
  const handleSaveReligion = (index: number) => {
    if (editingReligionValue.trim() !== '') {
      const newReligionName = editingReligionValue.trim();
      setSettings(prev => ({
        ...prev,
        religions: prev.religions.map((r, i) => i === index ? newReligionName : r),
      }));
    }
    setEditingReligionIndex(null);
  };

  const handleAddReligion = () => {
    if (newReligionValue.trim() !== '') {
      setSettings(prev => ({ ...prev, religions: [...prev.religions, newReligionValue.trim()] }));
      setNewReligionValue('');
    }
  };

  // --- Categories List Logic ---
  const handleSaveCategory = (index: number) => {
    if (editingCategoryValue.trim() !== '') {
      const newCategoryName = editingCategoryValue.trim();
      setSettings(prev => ({
        ...prev,
        categories: prev.categories.map((c, i) => i === index ? newCategoryName : c),
      }));
    }
    setEditingCategoryIndex(null);
  };

  const handleAddCategory = () => {
    if (newCategoryValue.trim() !== '') {
      setSettings(prev => ({ ...prev, categories: [...prev.categories, newCategoryValue.trim()] }));
      setNewCategoryValue('');
    }
  };

  // --- Streams List Logic ---
  const handleSaveStream = (index: number) => {
    if (editingStreamValue.trim() !== '') {
      const newStreamName = editingStreamValue.trim();
      setSettings(prev => ({
        ...prev,
        streams: prev.streams.map((s, i) => i === index ? newStreamName : s),
      }));
    }
    setEditingStreamIndex(null);
  };

  const handleAddStream = () => {
    if (newStreamValue.trim() !== '') {
      setSettings(prev => ({ ...prev, streams: [...prev.streams, newStreamValue.trim()] }));
      setNewStreamValue('');
    }
  };

  // --- Render Functions ---
  const renderSessionsManager = () => {
    const startMonthName = MONTH_NAMES[sessionStartMonth - 1];
    const endMonthName = MONTH_NAMES[(sessionStartMonth - 2 + 12) % 12];

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-1">Session start on</h4>
          <p className="text-sm text-gray-600">
            Define the start of your academic session. This will affect how the "Current Session" is calculated and can be used for financial reporting.
          </p>
          <div className="max-w-xs mt-4">
            <SelectInput
              label="Session Start Month"
              name="sessionStartMonth"
              value={startMonthName}
              options={MONTH_NAMES}
              onChange={(e) => {
                const monthName = e.target.value as keyof typeof MONTHS;
                setSessionStartMonth(MONTHS[monthName]);
              }}
            />
          </div>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              If the session starts in <strong>{startMonthName}</strong>, it will end in <strong>{endMonthName}</strong> of the following year.
            </p>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <h4 className="text-md font-medium text-gray-800 mb-1">Academic Sessions</h4>
          <p className="text-sm text-gray-500">Add, edit, or remove academic sessions. Only one session can be active at a time.</p>
          <div className="mt-4 p-4 border rounded-lg bg-gray-50 max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {settings.sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
                  <div className="flex items-center flex-grow">
                    <ToggleSwitch
                      enabled={session.isActive}
                      onChange={() => {
                        if (!session.isActive) {
                          handleSetActiveSession(session.id);
                        }
                      }}
                      labelOff="Inactive"
                      labelOn="Active"
                    />
                    {editingSessionId === session.id ? (
                      <input type="text" value={editingSessionValue} onChange={(e) => setEditingSessionValue(e.target.value)} className="flex-grow px-2 py-1 text-gray-900 border border-blue-400 rounded-md ml-4" autoFocus onBlur={() => handleSaveSession(session.id)} onKeyDown={(e) => e.key === 'Enter' && handleSaveSession(session.id)} />
                    ) : (
                      <span className={`text-gray-800 ml-4 ${!session.isActive ? 'line-through text-gray-400' : ''}`}>{session.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {editingSessionId === session.id ? (
                      <>
                        <button onClick={() => handleSaveSession(session.id)} className="p-1 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                        <button onClick={() => setEditingSessionId(null)} className="p-1 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingSessionId(session.id); setEditingSessionValue(session.name); }} className="p-1 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                        <button
                          onClick={() => setConfirmModal({ isOpen: true, id: session.id, type: 'session', message: `Are you sure you want to delete the session "${session.name}"?` })}
                          className="p-1 text-red-600"
                          disabled={session.isActive && settings.sessions.filter(s => s.isActive).length <= 1}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h--3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 pt-4 mt-4 border-t">
            <input type="text" value={newSessionValue} onChange={(e) => setNewSessionValue(e.target.value)} placeholder="Enter new session name (e.g., 2027-2028)" className="flex-grow px-3 py-2 border border-gray-300 rounded-md" />
            <button onClick={handleAddSession} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">Add Session</button>
          </div>
        </div>
      </div>
    );
  };

  const renderClassEditor = () => (
    <div className="p-4 border rounded-lg bg-gray-50 mt-4 space-y-4">
      <h4 className="font-medium text-gray-800">{isAddingClass ? 'Add New Class' : 'Edit Class'}</h4>
      <TextInput label="Class Name" name="className" value={currentClassName} onChange={(e) => setCurrentClassName(e.target.value)} />
      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-2">Assign Sections</h5>
        {settings.sections.length > 0 ? (
          <>
            <div className="pb-2 border-b mb-2">
              <Checkbox name="selectAll" label="Select All" checked={selectedSections.size === settings.sections.length} onChange={handleSelectAllSections} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
              {settings.sections.map(section => (
                <Checkbox key={section} name={section} label={section} checked={selectedSections.has(section)} onChange={() => handleSectionSelectionChange(section)} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">No sections available. Add sections in the 'Sections' tab first.</p>
        )}
      </div>
      <div className="pt-4 border-t">
        <Checkbox
          label="Create student login by default for this class"
          name="createStudentLoginDefault"
          checked={currentCreateStudentLoginDefault}
          onChange={(e) => setCurrentCreateStudentLoginDefault(e.target.checked)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <button onClick={closeClassEditor} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
        <button onClick={handleSaveClass} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700">Save Class</button>
      </div>
    </div>
  );

  const renderClassesManager = () => (
    <div>
      {isAddingClass || isEditingClass ? renderClassEditor() : (
        <>
          <ul className="space-y-2 max-h-72 overflow-y-auto p-1">
            {settings.classes.map((classSetup) => (
              <li key={classSetup.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border">
                <div>
                  <p className="font-medium text-gray-800">{classSetup.name}</p>
                  <p className="text-xs text-gray-500">
                    {classSetup.sections.length > 0 ? `Sections: ${classSetup.sections.join(', ')}` : 'No sections assigned'}
                    <span className="mx-2">|</span>
                    Student Login Default: <span className={`font-semibold ${classSetup.createStudentLoginDefault ? 'text-green-600' : 'text-red-600'}`}>{classSetup.createStudentLoginDefault ? 'On' : 'Off'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openClassEditorForEdit(classSetup)} className="p-1 text-blue-600 hover:text-blue-800" aria-label={`Edit ${classSetup.name}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                  <button onClick={() => setConfirmModal({ isOpen: true, id: classSetup.id, type: 'class', message: `Are you sure you want to delete "${classSetup.name}"? This will remove the class and its section associations.` })} className="p-1 text-red-600 hover:text-red-800" aria-label={`Delete ${classSetup.name}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                </div>
              </li>
            ))}
          </ul>
          <div className="pt-4 mt-4 border-t">
            <button onClick={openClassEditorForAdd} className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700">Add New Class</button>
          </div>
        </>
      )}
    </div>
  );

  const renderSectionsManager = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Manage the master list of all sections available for assignment to classes.</p>
      <div className="p-4 border rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
        <ul className="space-y-2">
          {settings.sections.map((sectionName, index) => (
            <li key={index} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
              {editingSectionIndex === index ? (
                <input type="text" value={editingSectionValue} onChange={(e) => setEditingSectionValue(e.target.value)} className="flex-grow px-2 py-1 text-gray-900 border border-blue-400 rounded-md" autoFocus />
              ) : (
                <span className="text-gray-800">{sectionName}</span>
              )}
              <div className="flex items-center gap-2 ml-4">
                {editingSectionIndex === index ? (
                  <>
                    <button onClick={() => handleSaveSection(index)} className="p-1 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setEditingSectionIndex(null)} className="p-1 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingSectionIndex(index); setEditingSectionValue(sectionName); }} className="p-1 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setConfirmModal({ isOpen: true, id: index, type: 'section', message: `Are you sure you want to delete "${sectionName}"? It will be removed from all classes.` })} className="p-1 text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 pt-4 border-t">
        <input type="text" value={newSectionValue} onChange={(e) => setNewSectionValue(e.target.value)} placeholder="Enter new section name" className="flex-grow px-3 py-2 border border-gray-300 rounded-md" />
        <button onClick={handleAddSection} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">Add Section</button>
      </div>
    </div>
  );

  const renderHousesManager = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Manage the master list of all student houses or blocks.</p>
      <div className="p-4 border rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
        <ul className="space-y-2">
          {settings.houses.map((houseName, index) => (
            <li key={index} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
              {editingHouseIndex === index ? (
                <input type="text" value={editingHouseValue} onChange={(e) => setEditingHouseValue(e.target.value)} className="flex-grow px-2 py-1 text-gray-900 border border-blue-400 rounded-md" autoFocus />
              ) : (
                <span className="text-gray-800">{houseName}</span>
              )}
              <div className="flex items-center gap-2 ml-4">
                {editingHouseIndex === index ? (
                  <>
                    <button onClick={() => handleSaveHouse(index)} className="p-1 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setEditingHouseIndex(null)} className="p-1 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingHouseIndex(index); setEditingHouseValue(houseName); }} className="p-1 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setConfirmModal({ isOpen: true, id: index, type: 'house', message: `Are you sure you want to delete the house "${houseName}"?` })} className="p-1 text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 pt-4 border-t">
        <input type="text" value={newHouseValue} onChange={(e) => setNewHouseValue(e.target.value)} placeholder="Enter new house name" className="flex-grow px-3 py-2 border border-gray-300 rounded-md" />
        <button onClick={handleAddHouse} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">Add House</button>
      </div>
    </div>
  );

  const renderReligionsManager = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Manage the master list of all religions for the dropdown menu.</p>
      <div className="p-4 border rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
        <ul className="space-y-2">
          {settings.religions.map((religionName, index) => (
            <li key={index} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
              {editingReligionIndex === index ? (
                <input type="text" value={editingReligionValue} onChange={(e) => setEditingReligionValue(e.target.value)} className="flex-grow px-2 py-1 text-gray-900 border border-blue-400 rounded-md" autoFocus />
              ) : (
                <span className="text-gray-800">{religionName}</span>
              )}
              <div className="flex items-center gap-2 ml-4">
                {editingReligionIndex === index ? (
                  <>
                    <button onClick={() => handleSaveReligion(index)} className="p-1 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setEditingReligionIndex(null)} className="p-1 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingReligionIndex(index); setEditingReligionValue(religionName); }} className="p-1 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setConfirmModal({ isOpen: true, id: index, type: 'religion', message: `Are you sure you want to delete the religion "${religionName}"?` })} className="p-1 text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 pt-4 border-t">
        <input type="text" value={newReligionValue} onChange={(e) => setNewReligionValue(e.target.value)} placeholder="Enter new religion name" className="flex-grow px-3 py-2 border border-gray-300 rounded-md" />
        <button onClick={handleAddReligion} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">Add Religion</button>
      </div>
    </div>
  );

  const renderCategoriesManager = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Manage the master list of all student categories.</p>
      <div className="p-4 border rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
        <ul className="space-y-2">
          {settings.categories.map((categoryName, index) => (
            <li key={index} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
              {editingCategoryIndex === index ? (
                <input type="text" value={editingCategoryValue} onChange={(e) => setEditingCategoryValue(e.target.value)} className="flex-grow px-2 py-1 text-gray-900 border border-blue-400 rounded-md" autoFocus />
              ) : (
                <span className="text-gray-800">{categoryName}</span>
              )}
              <div className="flex items-center gap-2 ml-4">
                {editingCategoryIndex === index ? (
                  <>
                    <button onClick={() => handleSaveCategory(index)} className="p-1 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setEditingCategoryIndex(null)} className="p-1 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingCategoryIndex(index); setEditingCategoryValue(categoryName); }} className="p-1 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setConfirmModal({ isOpen: true, id: index, type: 'category', message: `Are you sure you want to delete the category "${categoryName}"?` })} className="p-1 text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 pt-4 border-t">
        <input type="text" value={newCategoryValue} onChange={(e) => setNewCategoryValue(e.target.value)} placeholder="Enter new category name" className="flex-grow px-3 py-2 border border-gray-300 rounded-md" />
        <button onClick={handleAddCategory} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">Add Category</button>
      </div>
    </div>
  );

  const renderStreamsManager = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Manage the master list of all available academic streams.</p>
      <div className="p-4 border rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
        <ul className="space-y-2">
          {settings.streams.map((streamName, index) => (
            <li key={index} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm">
              {editingStreamIndex === index ? (
                <input type="text" value={editingStreamValue} onChange={(e) => setEditingStreamValue(e.target.value)} className="flex-grow px-2 py-1 text-gray-900 border border-blue-400 rounded-md" autoFocus />
              ) : (
                <span className="text-gray-800">{streamName}</span>
              )}
              <div className="flex items-center gap-2 ml-4">
                {editingStreamIndex === index ? (
                  <>
                    <button onClick={() => handleSaveStream(index)} className="p-1 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setEditingStreamIndex(null)} className="p-1 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingStreamIndex(index); setEditingStreamValue(streamName); }} className="p-1 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setConfirmModal({ isOpen: true, id: index, type: 'stream', message: `Are you sure you want to delete the stream "${streamName}"?` })} className="p-1 text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 pt-4 border-t">
        <input type="text" value={newStreamValue} onChange={(e) => setNewStreamValue(e.target.value)} placeholder="Enter new stream name" className="flex-grow px-3 py-2 border border-gray-300 rounded-md" />
        <button onClick={handleAddStream} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">Add Stream</button>
      </div>
    </div>
  );

  const renderSettingsForm = (type: 'reg' | 'enroll') => {
    // This function remains largely the same
    const targetSettings = settings[type];
    const isDisabled = type === 'enroll' && settings.enroll.useSameAsRegNo;
    return <div className="space-y-6"><div><h3 className="text-lg font-medium text-gray-900">Choose a Template</h3><fieldset className="mt-4"><legend className="sr-only">Template selection</legend><div className="space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-4">{templates.map((template) => (<div key={template.id} className="flex items-center flex-1"><input id={`${type}-${template.id}`} name={`${type}-template`} type="radio" value={template.id} checked={targetSettings.template === template.id} onChange={(e) => handleTemplateChange(e, type)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" disabled={isDisabled} /><label htmlFor={`${type}-${template.id}`} className={`ml-3 block text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}><span className="font-bold">{template.title}</span><span className={`block ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>{template.description}</span></label></div>))}</div></fieldset></div><div className="border-t border-gray-200 pt-6"><h3 className="text-lg font-medium text-gray-900">Configure Template</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4"><TextInput label="Number Padding" name="padding" type="number" value={String(targetSettings.padding)} onChange={(e) => handleInputChange(e, type)} disabled={isDisabled} /><TextInput label="Start From" name="startFrom" type="number" value={String(targetSettings.startFrom)} onChange={(e) => handleInputChange(e, type)} disabled={isDisabled} /><TextInput label="Separator" name="separator1" value={targetSettings.separator1} onChange={(e) => handleInputChange(e, type)} disabled={isDisabled} />{targetSettings.template === 'template1' && (<TextInput label="Prefix" name="prefix" value={targetSettings.prefix} onChange={(e) => handleInputChange(e, type)} disabled={isDisabled} />)}{targetSettings.template === 'template3' && (<TextInput label="Suffix" name="suffix" value={targetSettings.suffix} onChange={(e) => handleInputChange(e, type)} disabled={isDisabled} />)}</div>{targetSettings.template === 'template2' && (<p className="text-sm text-gray-500 mt-4">The Admission Class, Month, and Year will be taken automatically from the form data.</p>)}</div></div>;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose} aria-modal="true" role="dialog">
        <div
          className="bg-white rounded-2xl shadow-xl max-w-4xl w-full m-4 flex flex-col max-h-[calc(100vh-4rem)] transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'fade-in-scale 0.3s ease-out forwards' }}
        >
          {/* Static Header Area */}
          <div className="flex-shrink-0">
            <div className="p-6 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 id="settings-modal-title" className="text-2xl font-bold text-gray-800">Settings</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close modal">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                <button onClick={() => setActiveTab('reg')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'reg' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Registration No.</button><button onClick={() => setActiveTab('enroll')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'enroll' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Enrollment No.</button><button onClick={() => setActiveTab('sessions')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'sessions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Sessions</button><button onClick={() => setActiveTab('classes')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'classes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Classes</button><button onClick={() => setActiveTab('sections')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'sections' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Sections</button><button onClick={() => setActiveTab('houses')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'houses' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Houses</button><button onClick={() => setActiveTab('religion')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'religion' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Religion</button><button onClick={() => setActiveTab('categories')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'categories' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Categories</button><button onClick={() => setActiveTab('streams')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'streams' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Streams</button><button onClick={() => setActiveTab('style')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'style' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Theme & Style</button><button onClick={() => setActiveTab('batch')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'batch' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Batch Edit</button>
              </nav>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="p-6 flex-grow overflow-y-auto">
            {activeTab === 'reg' && renderSettingsForm('reg')}
            {activeTab === 'enroll' && (<div className="space-y-6"><Checkbox label="Use same settings as Registration No." name="useSameAsRegNo" checked={settings.enroll.useSameAsRegNo} onChange={handleUseSameChange} />{renderSettingsForm('enroll')}</div>)}
            {activeTab === 'sessions' && renderSessionsManager()}
            {activeTab === 'classes' && renderClassesManager()}
            {activeTab === 'sections' && renderSectionsManager()}
            {activeTab === 'houses' && renderHousesManager()}
            {activeTab === 'religion' && renderReligionsManager()}
            {activeTab === 'categories' && renderCategoriesManager()}
            {activeTab === 'streams' && renderStreamsManager()}
            {activeTab === 'batch' && (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="bg-indigo-100 p-4 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Batch Information Editor</h3>
                <p className="text-sm text-gray-500 max-w-sm mt-2 mb-6">
                  Quickly update multiple students at once. Current version supports bulk updating "New" vs "Old" student status.
                </p>
                <div className="flex gap-4">
                   <button 
                    onClick={() => window.location.href = '/school-admin/students/batch-edit-type'}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    Launch Batch Editor
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'style' && (
              <StyleSettings
                primaryColor={primaryColor}
                onPrimaryChange={setPrimaryColor}
                sidebarBgColor={sidebarBgColor}
                onSidebarBgChange={setSidebarBgColor}
                sidebarTextColor={sidebarTextColor}
                onSidebarTextChange={setSidebarTextColor}
                onReset={() => {
                  setPrimaryColor(DEFAULT_COLORS.primary);
                  setSidebarBgColor(DEFAULT_COLORS.sidebarBg);
                  setSidebarTextColor(DEFAULT_COLORS.sidebarText);
                }}
              />
            )}
          </div>

          {/* Static Footer Area */}
          <div className="p-6 flex justify-end gap-4 border-t border-gray-200 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-8 py-2.5 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg shadow-sm hover:opacity-90">Save Settings</button>
          </div>
        </div>
      </div>
      <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, id: null, type: null, message: '' })} onConfirm={handleConfirmDelete} title={`Delete ${confirmModal.type}`} message={confirmModal.message} />
      <style>{`
        @keyframes fade-in-scale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
            animation: fade-in-scale 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default SettingsModal;
