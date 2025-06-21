import { CachedMetadata, Menu, Plugin, TAbstractFile, TFile, addIcon } from 'obsidian';
import { CalendarView, VIEW_TYPE } from 'view';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { CalendarConfig, DateSourceType, DayChangeCommandAction, CalendarDaysMap, fileToCalendarItem, inlineTimestampToCalendarItem, headingToCalendarItem } from 'types';
import { CALENDAR_ICON } from './util/icons';
import { CalendarPluginSettings, DEFAULT_SETTINGS, CalendarPluginSettingsTab } from './settings/settings';

export default class CalendarPlugin extends Plugin {
	settings: CalendarPluginSettings;
	dayjs = dayjs;
	CALENDAR_DAYS_STATE: CalendarDaysMap = {};
	initialScanCompleted: boolean = false;
	EVENT_TYPES = {
		forceUpdate: 'calendarForceUpdate',
		changeDate: 'calendarChangeDate',
	};

	dayMonthSelectorQuery = '.calendar-plugin-view .react-calendar__tile.react-calendar__month-view__days__day';

	async onload() {
		addIcon('CALENDAR_ICON', CALENDAR_ICON);

		dayjs.extend(customParseFormat);

		// Load Settings
		this.addSettingTab(new CalendarPluginSettingsTab(this.app, this));
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => {
			return new CalendarView(leaf, this);
		});

		this.app.metadataCache.on('resolved', async () => {
			// Run only during initial vault load, changes are handled separately
			if (!this.initialScanCompleted) {
				this.CALENDAR_DAYS_STATE = await this.getNotesWithDates();
				this.initialScanCompleted = true;
				this.calendarForceUpdate();
			}
		});

		this.app.workspace.onLayoutReady(async () => {
			this.CALENDAR_DAYS_STATE = await this.getNotesWithDates();
			if (this.settings.openViewOnStart) {
				this.openCalendarLeaf({ showAfterAttach: true });
			}
		});

		this.registerEvent(this.app.metadataCache.on('changed', this.handleCacheChange));
		this.registerEvent(this.app.vault.on('rename', this.handleRename));
		this.registerEvent(this.app.vault.on('delete', this.handleDelete));
		this.registerEvent(this.app.vault.on('create', this.handleCreate));

		this.addCommand({
			id: 'calendar-next-day',
			name: 'Go to Next Day',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'next-day' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		this.addCommand({
			id: 'calendar-previous-day',
			name: 'Go to Previous Day',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'previous-day' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		this.addCommand({
			id: 'calendar-today',
			name: 'Go to Today',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'today' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		// Create a New Note command removed

		this.addCommand({
			id: 'calendar-open-leaf',
			name: 'Open Calendar',
			callback: () => {
				this.openCalendarLeaf({ showAfterAttach: true });
			},
		});
	}

	onunload() {
		// Nothing to unload
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/* ------------ HANDLE VAULT CHANGES - HELPERS ------------ */

	/**
	 * Adds the provided filePath to the corresponding date within plugin state
	 * @param date
	 * @param filePath
	 */
	addFilePathToState = (date: string, file: TFile) => {
		let newStateMap = this.CALENDAR_DAYS_STATE;
		// if exists, add the new file path
		if (date in newStateMap) {
			newStateMap[date] = [...newStateMap[date], fileToCalendarItem({ note: file })];
		} else {
			newStateMap[date] = [fileToCalendarItem({ note: file })];
		}
		this.CALENDAR_DAYS_STATE = newStateMap;
	};

	/**
	 * Scans the plugin state and removes all entries for the given file path
	 * @param filePath
	 * @returns true if any entries were found and deleted
	 */
	removeFilePathFromState = (filePath: string): boolean => {
		let changeFlag = false;
		let newStateMap = this.CALENDAR_DAYS_STATE;

		for (let k of Object.keys(newStateMap)) {
			// Check if there are any entries for this file path
			if (newStateMap[k].some((calendarItem) => calendarItem.path === filePath)) {
				// Filter out all entries for this file path (both notes and inline timestamps)
				const originalLength = newStateMap[k].length;
				newStateMap[k] = newStateMap[k].filter((calendarItem) => calendarItem.path !== filePath);

				// If the length changed, we removed something
				if (originalLength !== newStateMap[k].length) {
					changeFlag = true;
				}

				// If the array is now empty, remove the date key
				if (newStateMap[k].length === 0) {
					delete newStateMap[k];
				}
			}
		}

		this.CALENDAR_DAYS_STATE = newStateMap;
		return changeFlag;
	};

	/**
	 * Legacy method - removed
	 * @deprecated
	 */
	scanTFileDate = (file: TFile): boolean => {
		return false;
	};

	/**
	 * Scans file content for the pattern "- YYYYMMDDHHmm:"
	 * Legacy method kept for backward compatibility
	 * @param file
	 * @param CalendarDays
	 * @returns boolean (if any change happened, true)
	 */
	scanFileContentForTimestampPattern = async (file: TFile, CalendarDays?: CalendarDaysMap): Promise<boolean> => {
		// Maximum length for the display text
		const MAX_DISPLAY_LENGTH = 255;

		let changeFlag = false;
		try {
			// Read file content
			const fileContent = await this.app.vault.read(file);
			// Split content into lines
			const lines = fileContent.split('\n');

			// Regular expression to match the pattern "- YYYYMMDDHHmm:"
			// Captures just the timestamp
			const timestampPattern = /^-\s+(\d{12}):/;

			// Process each line
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const match = line.match(timestampPattern);

				if (match) {
					const timestamp = match[1]; // YYYYMMDDHHmm

					// Use the entire line as the display text, limited to MAX_DISPLAY_LENGTH
					const displayText = line.length > MAX_DISPLAY_LENGTH
						? line.substring(0, MAX_DISPLAY_LENGTH) + '...'
						: line;

					// Parse the timestamp into a date
					const year = timestamp.substring(0, 4);
					const month = timestamp.substring(4, 6);
					const day = timestamp.substring(6, 8);

					const dateString = `${year}-${month}-${day}`;

					// Add to calendar days if provided, otherwise add to plugin state
					if (CalendarDays) {
						if (dateString in CalendarDays) {
							CalendarDays[dateString] = [
								...CalendarDays[dateString],
								inlineTimestampToCalendarItem({ file, title: displayText, lineNumber: i + 1 })
							];
						} else {
							CalendarDays[dateString] = [
								inlineTimestampToCalendarItem({ file, title: displayText, lineNumber: i + 1 })
							];
						}
					} else {
						// Add to plugin state directly
						if (dateString in this.CALENDAR_DAYS_STATE) {
							this.CALENDAR_DAYS_STATE[dateString] = [
								...this.CALENDAR_DAYS_STATE[dateString],
								inlineTimestampToCalendarItem({ file, title: displayText, lineNumber: i + 1 })
							];
						} else {
							this.CALENDAR_DAYS_STATE[dateString] = [
								inlineTimestampToCalendarItem({ file, title: displayText, lineNumber: i + 1 })
							];
						}
					}

					changeFlag = true;
				}
			}
		} catch (error) {
			console.error(`Error scanning file ${file.path} for timestamp pattern:`, error);
		}

		return changeFlag;
	};

	/**
	 * Scans file content for a custom inline pattern defined in a calendar configuration
	 * @param file The file to scan
	 * @param calendar The calendar configuration containing the pattern
	 * @param CalendarDays Optional calendar days map to add entries to
	 * @returns boolean (if any change happened, true)
	 */
        scanFileForInlinePattern = async (
                file: TFile,
                calendar: CalendarConfig,
                CalendarDays?: CalendarDaysMap
        ): Promise<boolean> => {
		// Maximum length for the display text
		const MAX_DISPLAY_LENGTH = 255;

                if (!calendar.inlinePattern) {
                        return false;
                }

                if (calendar.inlineWhitelist && calendar.inlineWhitelist.trim() !== '') {
                        const allowed = calendar.inlineWhitelist.split(',').map((s) => s.trim()).filter((s) => s !== '');
                        if (allowed.length > 0 && !allowed.includes(file.path)) {
                                return false;
                        }
                }

		let changeFlag = false;
		try {
			// Read file content
			const fileContent = await this.app.vault.read(file);
			// Split content into lines
			const lines = fileContent.split('\n');

			// Create a RegExp from the pattern string
			const patternRegex = new RegExp(calendar.inlinePattern);

			// Process each line
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const match = line.match(patternRegex);

				if (match && match.length > 1) {
					// The first capture group should contain the date/timestamp
					const capturedDate = match[1];

					// Use the entire line as the display text, limited to MAX_DISPLAY_LENGTH
					const displayText = line.length > MAX_DISPLAY_LENGTH
						? line.substring(0, MAX_DISPLAY_LENGTH) + '...'
						: line;

					// Parse the date using the calendar's format
					const parsedDate = dayjs(capturedDate, calendar.format);

					if (parsedDate.isValid()) {
						const dateString = parsedDate.format('YYYY-MM-DD');

						// Add to calendar days if provided, otherwise add to plugin state
						if (CalendarDays) {
							if (dateString in CalendarDays) {
								CalendarDays[dateString] = [
									...CalendarDays[dateString],
									inlineTimestampToCalendarItem({
										file,
										title: displayText,
										lineNumber: i + 1,
										calendarId: calendar.id
									})
								];
							} else {
								CalendarDays[dateString] = [
									inlineTimestampToCalendarItem({
										file,
										title: displayText,
										lineNumber: i + 1,
										calendarId: calendar.id
									})
								];
							}
						} else {
							// Add to plugin state directly
							if (dateString in this.CALENDAR_DAYS_STATE) {
								this.CALENDAR_DAYS_STATE[dateString] = [
									...this.CALENDAR_DAYS_STATE[dateString],
									inlineTimestampToCalendarItem({
										file,
										title: displayText,
										lineNumber: i + 1,
										calendarId: calendar.id
									})
								];
							} else {
								this.CALENDAR_DAYS_STATE[dateString] = [
									inlineTimestampToCalendarItem({
										file,
										title: displayText,
										lineNumber: i + 1,
										calendarId: calendar.id
									})
								];
							}
						}

						changeFlag = true;
					}
				}
			}
		} catch (error) {
			console.error(`Error scanning file ${file.path} for pattern ${calendar.inlinePattern}:`, error);
		}

                return changeFlag;
        };

        scanFileForDateHeadings = async (
                file: TFile,
                calendar: CalendarConfig,
                CalendarDays?: CalendarDaysMap
        ): Promise<boolean> => {
                if (!calendar.notePath || file.path !== calendar.notePath) {
                        return false;
                }

                let changeFlag = false;
                const cache = this.app.metadataCache.getFileCache(file);
                if (!cache || !cache.headings) return false;

                // Read file lines once so we can map headings to their content
                const fileContent = await this.app.vault.read(file);
                const lines = fileContent.split('\n');

                const MAX_DISPLAY_LENGTH = 255;

                for (let i = 0; i < cache.headings.length; i++) {
                        const heading = cache.headings[i];
                        const headingText = heading.heading;
                        const parsedDate = dayjs(headingText, calendar.format);
                        if (!parsedDate.isValid()) continue;

                        const dateString = parsedDate.format('YYYY-MM-DD');

                        const startLine = heading.position.end.line + 1;
                        const endLine = i + 1 < cache.headings.length
                                ? cache.headings[i + 1].position.start.line - 1
                                : lines.length - 1;

                        for (let lineNr = startLine; lineNr <= endLine; lineNr++) {
                                const text = lines[lineNr]?.trim();
                                if (!text || text.startsWith('#')) continue;

                                const display = text.length > MAX_DISPLAY_LENGTH ? text.slice(0, MAX_DISPLAY_LENGTH) + '...' : text;
                                const item = headingToCalendarItem({
                                        file,
                                        title: display,
                                        lineNumber: lineNr + 1,
                                        calendarId: calendar.id
                                });

                                if (CalendarDays) {
                                        if (dateString in CalendarDays) {
                                                CalendarDays[dateString] = [...CalendarDays[dateString], item];
                                        } else {
                                                CalendarDays[dateString] = [item];
                                        }
                                } else {
                                        if (dateString in this.CALENDAR_DAYS_STATE) {
                                                this.CALENDAR_DAYS_STATE[dateString] = [...this.CALENDAR_DAYS_STATE[dateString], item];
                                        } else {
                                                this.CALENDAR_DAYS_STATE[dateString] = [item];
                                        }
                                }

                                changeFlag = true;
                        }
                }

                return changeFlag;
        };

	/**
	 * Use this function to force update the calendar and file list view
	 */
	calendarForceUpdate = () => {
		window.dispatchEvent(
			new CustomEvent(this.EVENT_TYPES.forceUpdate, {
				detail: {},
			})
		);
	};

	/* ------------ HANDLE VAULT CHANGES - LISTENER FUNCTIONS ------------ */

	handleCacheChange = async (file: TFile, data: string, cache: CachedMetadata) => {
		// First, remove ALL existing entries for this file
		// This ensures we don't have duplicate entries when the file content changes
		this.removeFilePathFromState(file.path);

		// Process each enabled calendar configuration
		for (const calendar of this.settings.calendars.filter(cal => cal.enabled)) {
			// Process based on source type
			if (calendar.sourceType === 'yaml' && calendar.yamlKey) {
				if (cache && cache.frontmatter) {
					let fm = cache.frontmatter;
					for (let k of Object.keys(cache.frontmatter)) {
						if (k === calendar.yamlKey) {
							let fmValue = String(fm[k]);
							let parsedDate = dayjs(fmValue, calendar.format);
							if (parsedDate.isValid()) {
								let parsedDayISOString = parsedDate.format('YYYY-MM-DD');
								// Add the file to the state with calendar ID
								if (parsedDayISOString in this.CALENDAR_DAYS_STATE) {
									this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
										...this.CALENDAR_DAYS_STATE[parsedDayISOString],
										fileToCalendarItem({ note: file, calendarId: calendar.id }),
									];
								} else {
									this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
										fileToCalendarItem({ note: file, calendarId: calendar.id })
									];
								}
							}
						}
					}
				}
			} else if (calendar.sourceType === 'filename') {
				if (dayjs(file.name, calendar.format).isValid()) {
					let parsedDayISOString = dayjs(file.name, calendar.format).format('YYYY-MM-DD');
					if (parsedDayISOString in this.CALENDAR_DAYS_STATE) {
						this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
							...this.CALENDAR_DAYS_STATE[parsedDayISOString],
							fileToCalendarItem({ note: file, calendarId: calendar.id }),
						];
					} else {
						this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
							fileToCalendarItem({ note: file, calendarId: calendar.id })
						];
					}
				}
                        } else if (calendar.sourceType === 'inline' && calendar.inlinePattern) {
                                // Scan file content for the specified inline pattern
                                await this.scanFileForInlinePattern(file, calendar);
                        } else if (calendar.sourceType === 'note-heading') {
                                await this.scanFileForDateHeadings(file, calendar);
                        }
		}

		// Legacy code removed

		// Update the calendar view
		this.calendarForceUpdate();
	};

	handleRename = async (file: TFile, oldPath: string) => {
		// First, remove all entries for the old path
		let changeFlag = this.removeFilePathFromState(oldPath);

		if (file instanceof TFile && file.extension === 'md') {
			// Process each enabled calendar configuration
			for (const calendar of this.settings.calendars.filter(cal => cal.enabled)) {
				// Process based on source type
				if (calendar.sourceType === 'filename') {
					if (dayjs(file.name, calendar.format).isValid()) {
						let parsedDayISOString = dayjs(file.name, calendar.format).format('YYYY-MM-DD');
						if (parsedDayISOString in this.CALENDAR_DAYS_STATE) {
							this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
								...this.CALENDAR_DAYS_STATE[parsedDayISOString],
								fileToCalendarItem({ note: file, calendarId: calendar.id }),
							];
						} else {
							this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
								fileToCalendarItem({ note: file, calendarId: calendar.id })
							];
						}
						changeFlag = true;
					}
				} else if (calendar.sourceType === 'yaml' && calendar.yamlKey) {
					let cache = this.app.metadataCache.getCache(file.path);
					if (cache && cache.frontmatter) {
						let fm = cache.frontmatter;
						for (let k of Object.keys(cache.frontmatter)) {
							if (k === calendar.yamlKey) {
								let fmValue = String(fm[k]);
								let parsedDate = dayjs(fmValue, calendar.format);
								if (parsedDate.isValid()) {
									let parsedDayISOString = parsedDate.format('YYYY-MM-DD');
									if (parsedDayISOString in this.CALENDAR_DAYS_STATE) {
										this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
											...this.CALENDAR_DAYS_STATE[parsedDayISOString],
											fileToCalendarItem({ note: file, calendarId: calendar.id }),
										];
									} else {
										this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
											fileToCalendarItem({ note: file, calendarId: calendar.id })
										];
									}
									changeFlag = true;
								}
							}
						}
					}
                                } else if (calendar.sourceType === 'inline' && calendar.inlinePattern) {
                                        // Scan file content for the specified inline pattern
                                        const patternFound = await this.scanFileForInlinePattern(file, calendar);
                                        if (patternFound) {
                                                changeFlag = true;
                                        }
                                } else if (calendar.sourceType === 'note-heading') {
                                        const headingFound = await this.scanFileForDateHeadings(file, calendar);
                                        if (headingFound) {
                                                changeFlag = true;
                                        }
                                }
			}

			// Legacy code removed
		}

		// If change happened force update the component
		if (changeFlag) this.calendarForceUpdate();
	};

	handleDelete = (file: TAbstractFile) => {
		let changeFlag = this.removeFilePathFromState(file.path);
		if (changeFlag) this.calendarForceUpdate();
	};

	handleCreate = async (file: TAbstractFile) => {
		if (file instanceof TFile && file.extension === 'md') {
			// First, make sure there are no existing entries for this file
			// (shouldn't be any for a new file, but just to be safe)
			this.removeFilePathFromState(file.path);

			let changeFlag = false;

			// Process each enabled calendar configuration
			for (const calendar of this.settings.calendars.filter(cal => cal.enabled)) {
				// Process based on source type
				if (calendar.sourceType === 'filename') {
					if (dayjs(file.name, calendar.format).isValid()) {
						let parsedDayISOString = dayjs(file.name, calendar.format).format('YYYY-MM-DD');
						if (parsedDayISOString in this.CALENDAR_DAYS_STATE) {
							this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
								...this.CALENDAR_DAYS_STATE[parsedDayISOString],
								fileToCalendarItem({ note: file, calendarId: calendar.id }),
							];
						} else {
							this.CALENDAR_DAYS_STATE[parsedDayISOString] = [
								fileToCalendarItem({ note: file, calendarId: calendar.id })
							];
						}
						changeFlag = true;
					}
				} else if (calendar.sourceType === 'yaml' && calendar.yamlKey) {
					// For new files, we need to wait for the metadata cache to be updated
					// This will be handled by the handleCacheChange method
                                } else if (calendar.sourceType === 'inline' && calendar.inlinePattern) {
                                        // Scan file content for the specified inline pattern
                                        const patternFound = await this.scanFileForInlinePattern(file, calendar);
                                        if (patternFound) {
                                                changeFlag = true;
                                        }
                                } else if (calendar.sourceType === 'note-heading') {
                                        const headingFound = await this.scanFileForDateHeadings(file, calendar);
                                        if (headingFound) {
                                                changeFlag = true;
                                        }
                                }
			}

			// Legacy code removed

			// Update the calendar if any changes were made
			if (changeFlag) {
				this.calendarForceUpdate();
			}
		}
	};

	/* ------------ OTHER FUNCTIONS ------------ */

	openCalendarLeaf = async (params: { showAfterAttach: boolean }) => {
		const { showAfterAttach } = params;
		let leafs = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (leafs.length === 0) {
			let leaf = this.app.workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE });
			if (showAfterAttach) this.app.workspace.revealLeaf(leaf);
		} else {
			if (showAfterAttach && leafs.length > 0) {
				this.app.workspace.revealLeaf(leafs[0]);
			}
		}
	};

	reloadPlugin = async () => {
		// @ts-ignore
		await this.app.plugins.disablePlugin('calendar');
		// @ts-ignore
		await this.app.plugins.enablePlugin('calendar');
	};

	getNotesWithDates = async (): Promise<CalendarDaysMap> => {
		let mdFiles = this.app.vault.getMarkdownFiles();
		let CalendarDays: CalendarDaysMap = {};

		// Process each markdown file
		for (let mdFile of mdFiles) {
			// Process each enabled calendar configuration
			for (const calendar of this.settings.calendars.filter(cal => cal.enabled)) {
				// Process based on source type
				if (calendar.sourceType === 'yaml' && calendar.yamlKey) {
					// Get the file Cache
					let fileCache = this.app.metadataCache.getFileCache(mdFile);
					// Check if there is Frontmatter
					if (fileCache && fileCache.frontmatter) {
						let fm = fileCache.frontmatter;
						// Check the FM keys vs the provided key by the user in settings
						for (let k of Object.keys(fm)) {
							if (k === calendar.yamlKey) {
								let fmValue = String(fm[k]);
								// Parse the date with provided date format
								let parsedDayJsDate = dayjs(fmValue, calendar.format);
								if (parsedDayJsDate.isValid()) {
									// Take only YYYY-MM-DD part from the date as String
									let parsedDayISOString = parsedDayJsDate.format('YYYY-MM-DD');
									// Check if it already exists
									if (parsedDayISOString in CalendarDays) {
										CalendarDays[parsedDayISOString] = [
											...CalendarDays[parsedDayISOString],
											fileToCalendarItem({ note: mdFile, calendarId: calendar.id }),
										];
									} else {
										CalendarDays[parsedDayISOString] = [fileToCalendarItem({ note: mdFile, calendarId: calendar.id })];
									}
								}
							}
						}
					}
				} else if (calendar.sourceType === 'filename') {
					if (dayjs(mdFile.name, calendar.format).isValid()) {
						let parsedDayISOString = dayjs(mdFile.name, calendar.format).format('YYYY-MM-DD');
						if (parsedDayISOString in CalendarDays) {
							CalendarDays[parsedDayISOString] = [
								...CalendarDays[parsedDayISOString],
								fileToCalendarItem({ note: mdFile, calendarId: calendar.id }),
							];
						} else {
							CalendarDays[parsedDayISOString] = [fileToCalendarItem({ note: mdFile, calendarId: calendar.id })];
						}
					}
                                } else if (calendar.sourceType === 'inline' && calendar.inlinePattern) {
                                        // Scan file content for the specified inline pattern
                                        await this.scanFileForInlinePattern(mdFile, calendar, CalendarDays);
                                } else if (calendar.sourceType === 'note-heading' && calendar.notePath && mdFile.path === calendar.notePath) {
                                        await this.scanFileForDateHeadings(mdFile, calendar, CalendarDays);
                                }
			}

			// Legacy code removed
		}

		return CalendarDays;
	};

	// Context menu handler removed
}
