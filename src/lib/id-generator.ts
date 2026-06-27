import { AutoIdSettings } from '@/types/student-settings';

/**
 * Generates the next ID based on the provided settings.
 * Does NOT increment the serial number in the settings object (this must be done by the caller/DB).
 */
export function generateNextId(
    settings: AutoIdSettings, 
    context?: { className?: string, classCode?: string, date?: string }
): string {
    const { prefix, separator1, padding, suffix, startFrom, currentSerial, template, customPattern } = settings;

    // Determine the number to use. 
    const nextSerial = currentSerial < startFrom ? startFrom : currentSerial + 1;

    // Pad the serial number
    const paddedSerial = nextSerial.toString().padStart(padding, '0');

    // If template is 'custom', use the customPattern
    if (template === 'custom' && customPattern) {
        let result = customPattern;

        // Replace {SERIAL}
        result = result.replace(/{SERIAL}/g, paddedSerial);

        // Replace {CLASS}
        const classVal = context?.classCode || context?.className || 'CLASS';
        result = result.replace(/{CLASS}/g, classVal);

        // Replace {MONTH}
        const dateObj = context?.date ? new Date(context.date) : new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthVal = monthNames[dateObj.getMonth()];
        result = result.replace(/{MONTH}/g, monthVal);

        // Replace {YEAR}
        const yearVal = dateObj.getFullYear().toString().slice(-2);
        result = result.replace(/{YEAR}/g, yearVal);

        return result;
    }

    // Standard Templates
    let id = '';
    switch (template) {
        case 'template1':
        default:
            id = `${prefix}${separator1}${paddedSerial}${suffix}`;
            break;
        case 'template2': 
            id = `${prefix}${paddedSerial}${suffix}`;
            break;
        case 'template3': 
            id = `${paddedSerial}`;
            break;
    }

    return id;
}
