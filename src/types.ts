import { TFile } from 'obsidian';

export type CalendarNote = {
	type: 'note';
	displayName: string;
	path: string;
	calendarId?: string; // Reference to the calendar this item belongs to
};

export type CalendarReminder = {
	type: 'task' | 'periodic';
	displayName: string;
	date: string;
	path: string; // Add path property to match other types
	calendarId?: string; // Reference to the calendar this item belongs to
};

export type CalendarInlineTimestamp = {
        type: 'inline-timestamp';
        displayName: string;
        path: string;
        lineNumber: number;
        calendarId?: string; // Reference to the calendar this item belongs to
};

export type CalendarNoteHeading = {
        type: 'note-heading';
        displayName: string;
        path: string;
        lineNumber: number;
        calendarId?: string;
};

type CalendarItem = CalendarNote | CalendarReminder | CalendarInlineTimestamp | CalendarNoteHeading;

export interface CalendarDaysMap {
	[key: string]: CalendarItem[];
}

export type DayChangeCommandAction = 'next-day' | 'previous-day' | 'today';

export type DateSourceType = 'filename' | 'yaml' | 'inline' | 'note-heading';

export interface CalendarConfig {
        id: string;
        name: string;
        sourceType: DateSourceType;
        format: string;
        yamlKey?: string; // Only used when sourceType is 'yaml'
        inlinePattern?: string; // Only used when sourceType is 'inline'
        inlineWhitelist?: string; // Comma separated list of note paths for inline search
        notePath?: string; // Only used when sourceType is 'note-heading'
        color?: string; // Optional color for visual distinction
        enabled: boolean;
        testPattern?: string; // Used for testing inline patterns
}

export const fileToCalendarItem = (params: { note: TFile, calendarId?: string }): CalendarItem => {
	return {
		type: 'note',
		displayName: params.note.basename,
		path: params.note.path,
		calendarId: params.calendarId,
	};
};

export const inlineTimestampToCalendarItem = (params: {
        file: TFile;
        title: string;
        lineNumber: number;
        calendarId?: string;
}): CalendarItem => {
        return {
                type: 'inline-timestamp',
                displayName: params.title,
                path: params.file.path,
                lineNumber: params.lineNumber,
                calendarId: params.calendarId,
        };
};

export const headingToCalendarItem = (params: {
        file: TFile;
        title: string;
        lineNumber: number;
        calendarId?: string;
}): CalendarItem => {
        return {
                type: 'note-heading',
                displayName: params.title,
                path: params.file.path,
                lineNumber: params.lineNumber,
                calendarId: params.calendarId,
        };
};
