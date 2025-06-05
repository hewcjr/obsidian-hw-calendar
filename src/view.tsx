import { ItemView, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import CalendarPlugin from './main';
import MyCalendar from './components/calendar';
import { createRoot, Root } from 'react-dom/client';

export const VIEW_TYPE = 'calendar';
export const VIEW_DISPLAY_TEXT = 'HW Calendar';
export const ICON = 'CALENDAR_ICON';

export class CalendarView extends ItemView {
	plugin: CalendarPlugin;
	root: Root;

	constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return VIEW_DISPLAY_TEXT;
	}

	getIcon(): string {
		return ICON;
	}

	async onClose() {
		this.destroy();
	}

	destroy() {
		if (this.root) this.root.unmount();
	}

	async onOpen() {
		this.destroy();
		this.root = createRoot(this.contentEl)
		this.root.render(<MyCalendar plugin={this.plugin} />);
	}
}
