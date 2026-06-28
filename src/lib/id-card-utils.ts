import { IDCardElementShape } from '@/types';

/**
 * Returns CSS border-radius and aspect-ratio styles for a given shape.
 * Supports: circle, oval, square, rectangle.
 */
export function getShapeStyle(shape: IDCardElementShape | undefined): React.CSSProperties {
    switch (shape) {
        case 'circle':
            return { borderRadius: '50%', aspectRatio: '1 / 1' };
        case 'oval':
            return { borderRadius: '50%', aspectRatio: '3 / 4' };
        case 'square':
            return { borderRadius: '8px', aspectRatio: '1 / 1' };
        case 'rounded':
            return { borderRadius: '12px' };
        case 'rectangle':
        default:
            return { borderRadius: '4px' };
    }
}

/** Shape display names and icons for the shape picker UI. */
export const SHAPE_OPTIONS: { value: IDCardElementShape; label: string; icon: string }[] = [
    { value: 'rectangle', label: 'Rectangle',    icon: '▭' },
    { value: 'rounded',   label: 'Rounded',      icon: '▢' },
    { value: 'square',    label: 'Square',       icon: '□' },
    { value: 'oval',      label: 'Oval',         icon: '⬭' },
    { value: 'circle',    label: 'Circle',       icon: '◯' },
];
