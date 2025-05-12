import CalendarPlugin from 'main';
import { PluginSettingTab, App, Setting } from 'obsidian';
import { CalendarConfig } from 'types';

export type OpenFileBehaviourType = 'new-tab' | 'new-tab-group' | 'current-tab' | 'obsidian-default';
export type SortingOption = 'name' | 'name-rev';
export type DateSourceOption = 'filename' | 'yaml' | 'inline';
export type CalendarType = 'US' | 'ISO 8601';
export type OverflowBehaviour = 'scroll' | 'hide' | 'next-line';

export interface CalendarPluginSettings {
	openViewOnStart: boolean;
	calendarType: CalendarType;
	fixedCalendar: boolean;
	openFileBehaviour: OpenFileBehaviourType;
	sortingOption: SortingOption;
	fileNameOverflowBehaviour: OverflowBehaviour;
	showWeekNumbers: boolean;
	calendars: CalendarConfig[]; // Multiple calendars configuration
}

export const DEFAULT_SETTINGS: CalendarPluginSettings = {
	openViewOnStart: true,
	calendarType: 'ISO 8601',
	fixedCalendar: true,
	openFileBehaviour: 'current-tab',
	sortingOption: 'name',
	fileNameOverflowBehaviour: 'hide',
	showWeekNumbers: false,
	calendars: [
		{
			id: 'default',
			name: 'Default Calendar',
			sourceType: 'yaml',
			format: 'YYYY-MM-DD hh:mm:ss',
			yamlKey: 'created',
			enabled: true
		},
		{
			id: 'inline-timestamp',
			name: 'Inline Timestamps',
			sourceType: 'inline',
			format: 'YYYYMMDDHHmm',
			inlinePattern: '^-\\s+(\\d{12}):',
			enabled: true
		}
	]
};

export class CalendarPluginSettingsTab extends PluginSettingTab {
	plugin: CalendarPlugin;

	constructor(app: App, plugin: CalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;
		containerEl.empty();

		/* ------------- General Settings ------------- */

		containerEl.createEl('h1', { text: 'Calendar Plugin Settings' });

		containerEl.createEl('h2', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Open Calendar on Start')
			.setDesc('Disable if you dont want Calendar View to be opened during the initial vault launch')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openViewOnStart).onChange((newValue) => {
					this.plugin.settings.openViewOnStart = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Calendar Type')
			.setDesc(
				`
                Select the calendar type to be displayed. While the week in the US type starts from Sunday,
                in the ISO 8601 type, the week starts from Monday`
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('ISO 8601', 'ISO 8601')
					.addOption('US', 'US')
					.setValue(this.plugin.settings.calendarType)
					.onChange((newValue: CalendarType) => {
						this.plugin.settings.calendarType = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		new Setting(containerEl)
			.setName('Show Week Numbers')
			.setDesc('Enable if you want to have week numbers within the calendar view')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showWeekNumbers).onChange((newValue) => {
					this.plugin.settings.showWeekNumbers = newValue;
					this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
				});
			});

		new Setting(containerEl)
			.setName('Open File Behaviour')
			.setDesc('Select the behaviour you want to have when you click on file name in the calendar view')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('obsidian-default', "Obsidian's Default")
					.addOption('new-tab', 'Open in a New Tab')
					.addOption('new-tab-group', 'Open in a New Tab Group')
					.addOption('current-tab', 'Open in the Active Tab')
					.setValue(this.plugin.settings.openFileBehaviour)
					.onChange((newValue: OpenFileBehaviourType) => {
						this.plugin.settings.openFileBehaviour = newValue;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('File List Sorting')
			.setDesc('Select the sorting behaviour in the file list')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('name', 'File Name (A to Z)')
					.addOption('name-rev', 'File Name (Z to A)')
					.setValue(this.plugin.settings.sortingOption)
					.onChange((newValue: SortingOption) => {
						this.plugin.settings.sortingOption = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		containerEl.createEl('h2', { text: 'Manage Calendars' });

		// Calendars description
		containerEl.createEl('p', {
			text: `The plugin supports multiple calendars with different configurations.`,
			cls: 'setting-item-description',
		});

		// Add button to create a new calendar
		new Setting(containerEl)
			.setName('Add Calendar')
			.setDesc('Add a new calendar configuration')
			.addButton((button) => {
				button.setButtonText('Add Calendar')
					.onClick(() => {
						// Generate a unique ID
						const id = `calendar-${Date.now()}`;

						// Create a new calendar config
						const newCalendar: CalendarConfig = {
							id,
							name: 'New Calendar',
							sourceType: 'yaml',
							format: 'YYYY-MM-DD',
							yamlKey: 'date',
							enabled: true
						};

						// Add to settings
						this.plugin.settings.calendars.push(newCalendar);
						this.plugin.saveSettings();

						// Refresh the display to show the new calendar
						this.display();
					});
			});

		// Display existing calendars
		const calendarsContainer = containerEl.createDiv('calendars-container');
		calendarsContainer.addClass('calendar-calendars-container');

		// For each calendar, create a collapsible section
		this.plugin.settings.calendars.forEach((calendar, index) => {
			const calendarContainer = calendarsContainer.createDiv(`calendar-${calendar.id}`);
			calendarContainer.addClass('calendar-config');

			// Calendar header with name and controls
			const headerSetting = new Setting(calendarContainer)
				.setName(calendar.name)
				.setDesc(`ID: ${calendar.id}`)
				.addToggle((toggle) => {
					toggle.setValue(calendar.enabled)
						.onChange((value) => {
							calendar.enabled = value;
							this.plugin.saveSettings();
							this.plugin.getNotesWithDates().then(result => {
								this.plugin.CALENDAR_DAYS_STATE = result;
								this.plugin.calendarForceUpdate();
							});
							this.plugin.calendarForceUpdate();
						});
				})
				.addButton((button) => {
					button.setButtonText('Delete')
						.setClass('calendar-delete-btn')
						.onClick(() => {
							// Confirm deletion
							if (confirm(`Are you sure you want to delete the calendar "${calendar.name}"?`)) {
								this.plugin.settings.calendars.splice(index, 1);
								this.plugin.saveSettings();
								this.plugin.getNotesWithDates().then(result => {
									this.plugin.CALENDAR_DAYS_STATE = result;
									this.plugin.calendarForceUpdate();
									this.display();
								});
							}
						});
				});

			// Calendar name setting
			new Setting(calendarContainer)
				.setName('Calendar Name')
				.setDesc('The name of this calendar that will be displayed in the calendar widget')
				.addText((text) => {
					text.setValue(calendar.name)
						.onChange((value) => {
							calendar.name = value;
							headerSetting.setName(value);
							this.plugin.saveSettings();
						});
				});

			// Source type setting
			new Setting(calendarContainer)
				.setName('Source Type')
				.setDesc('The type of source to use for this calendar')
				.addDropdown((dropdown) => {
					dropdown
						.addOption('yaml', 'YAML Frontmatter')
						.addOption('filename', 'Filename')
						.addOption('inline', 'In-Line Pattern')
						.setValue(calendar.sourceType)
						.onChange((value: DateSourceOption) => {
							calendar.sourceType = value;
							this.plugin.saveSettings();
							this.display(); // Refresh to show/hide relevant fields
						});
				});

			// YAML Key setting (only shown for YAML source type)
			if (calendar.sourceType === 'yaml') {
				new Setting(calendarContainer)
					.setName('YAML Key')
					.setDesc('The YAML frontmatter key to use for dates')
					.addText((text) => {
						text.setValue(calendar.yamlKey || '')
							.onChange((value) => {
								calendar.yamlKey = value;
								this.plugin.saveSettings();
							});
					});
			}

			// Format setting
			new Setting(calendarContainer)
				.setName('Date Format')
				.setDesc('The format of the date in the source')
				.addText((text) => {
					text.setValue(calendar.format)
						.onChange((value) => {
							calendar.format = value;
							this.plugin.saveSettings();
						});
				});

			// Inline pattern setting (only shown for inline source type)
			if (calendar.sourceType === 'inline') {
				new Setting(calendarContainer)
					.setName('Inline Pattern')
					.setDesc('The regex pattern to match inline dates. Use parentheses to capture the date part.')
					.addText((text) => {
						text.setValue(calendar.inlinePattern || '')
							.onChange((value) => {
								calendar.inlinePattern = value;
								this.plugin.saveSettings();
							});
					});

				// Test pattern field
				new Setting(calendarContainer)
					.setName('Test Pattern')
					.setDesc('Enter a sample line to test your regex pattern. The date should be captured in the first group.')
					.addText((text) => {
						text.setValue(calendar.testPattern || '- 20250311 - Optional Practices 8:35-9:25am')
							.onChange((value) => {
								calendar.testPattern = value;
								this.plugin.saveSettings();
							});
					});

				// Test result display
				const testResultContainer = calendarContainer.createDiv('test-result-container');
				testResultContainer.addClass('calendar-test-result');

				// Add buttons to test the pattern and date extraction
				const testButtonsContainer = new Setting(calendarContainer)
					.setName('Test Your Pattern')
					.setDesc('Test if your pattern matches and if the date can be extracted correctly.');

				// Test 1: Regex Match Test
				testButtonsContainer.addButton((button) => {
					button.setButtonText('Test Regex Match')
						.onClick(() => {
							testResultContainer.empty();

							if (!calendar.inlinePattern || !calendar.testPattern) {
								testResultContainer.createEl('p', {
									text: 'Please provide both a regex pattern and a test string.',
									cls: 'calendar-test-error'
								});
								return;
							}

							try {
								const regex = new RegExp(calendar.inlinePattern);
								const match = calendar.testPattern.match(regex);

								if (match) {
									testResultContainer.createEl('p', {
										text: '✅ Success! The pattern matches the test string.',
										cls: 'calendar-test-success'
									});

									if (match.length > 1) {
										testResultContainer.createEl('p', {
											text: `Captured group: "${match[1]}"`,
											cls: 'calendar-test-success'
										});
									} else {
										testResultContainer.createEl('p', {
											text: '⚠️ The pattern matched but did not capture any groups. Make sure to use parentheses () to capture the date part.',
											cls: 'calendar-test-warning'
										});
									}

									// Show the full match details
									testResultContainer.createEl('p', {
										text: 'Match details:',
										cls: 'calendar-test-info'
									});

									const matchDetails = testResultContainer.createEl('div', {
										cls: 'calendar-test-match-details'
									});

									for (let i = 0; i < match.length; i++) {
										matchDetails.createEl('p', {
											text: `Group ${i}: "${match[i]}"`,
											cls: i === 0 ? 'calendar-test-info' : 'calendar-test-success'
										});
									}
								} else {
									testResultContainer.createEl('p', {
										text: '❌ The pattern does not match the test string.',
										cls: 'calendar-test-error'
									});
								}
							} catch (error) {
								testResultContainer.createEl('p', {
									text: `❌ Error: ${error.message}`,
									cls: 'calendar-test-error'
								});
							}
						});
				});

				// Test 2: Date Extraction Test
				testButtonsContainer.addButton((button) => {
					button.setButtonText('Test Date Extraction')
						.onClick(() => {
							testResultContainer.empty();

							if (!calendar.inlinePattern || !calendar.testPattern || !calendar.format) {
								testResultContainer.createEl('p', {
									text: 'Please provide a regex pattern, test string, and date format.',
									cls: 'calendar-test-error'
								});
								return;
							}

							try {
								const regex = new RegExp(calendar.inlinePattern);
								const match = calendar.testPattern.match(regex);

								if (match && match.length > 1) {
									const capturedDate = match[1];
									const parsedDate = this.plugin.dayjs(capturedDate, calendar.format);

									if (parsedDate.isValid()) {
										const formattedDate = parsedDate.format('YYYY-MM-DD');
										testResultContainer.createEl('p', {
											text: `✅ Success! Captured date: "${capturedDate}"`,
											cls: 'calendar-test-success'
										});
										testResultContainer.createEl('p', {
											text: `Parsed with format: "${calendar.format}"`,
											cls: 'calendar-test-success'
										});
										testResultContainer.createEl('p', {
											text: `Formatted as: "${formattedDate}" (ISO format)`,
											cls: 'calendar-test-success'
										});

										// Show additional date information
										const dateInfo = testResultContainer.createEl('div', {
											cls: 'calendar-test-date-info'
										});

										dateInfo.createEl('p', {
											text: `Year: ${parsedDate.year()}`,
											cls: 'calendar-test-info'
										});

										dateInfo.createEl('p', {
											text: `Month: ${parsedDate.month() + 1} (${parsedDate.format('MMMM')})`,
											cls: 'calendar-test-info'
										});

										dateInfo.createEl('p', {
											text: `Day: ${parsedDate.date()} (${parsedDate.format('dddd')})`,
											cls: 'calendar-test-info'
										});
									} else {
										testResultContainer.createEl('p', {
											text: `⚠️ Captured text "${capturedDate}" could not be parsed with format "${calendar.format}"`,
											cls: 'calendar-test-warning'
										});
										testResultContainer.createEl('p', {
											text: 'Make sure your format matches the captured date structure.',
											cls: 'calendar-test-warning'
										});
									}
								} else {
									testResultContainer.createEl('p', {
										text: '❌ Pattern did not match or did not capture a group.',
										cls: 'calendar-test-error'
									});
									testResultContainer.createEl('p', {
										text: 'Make sure your pattern uses parentheses () to capture the date part.',
										cls: 'calendar-test-error'
									});
								}
							} catch (error) {
								testResultContainer.createEl('p', {
									text: `❌ Error: ${error.message}`,
									cls: 'calendar-test-error'
								});
							}
						});
				});
			}

			// Optional color setting
			new Setting(calendarContainer)
				.setName('Calendar Color')
				.setDesc('Optional color for visual distinction (CSS color value, e.g., #ff0000, red)')
				.addText((text) => {
					text.setValue(calendar.color || '')
						.onChange((value) => {
							calendar.color = value;
							this.plugin.saveSettings();
							this.plugin.calendarForceUpdate();
						});
				});

			// Add a separator
			if (index < this.plugin.settings.calendars.length - 1) {
				calendarContainer.createEl('hr');
			}
		});

		// Reload plugin button
		new Setting(containerEl)
			.setName('Reload the plugin')
			.setDesc('Reload the plugin to apply changes')
			.addButton((button) => {
				button.setButtonText('Reload Plugin');
				button.onClick(() => {
					this.plugin.reloadPlugin();
				});
			});

		// New Note Settings section removed

		containerEl.createEl('h2', { text: 'Style Settings' });

		containerEl.createEl('p', {
			text: `
            You can adjust most of the style settings using Style Settings plugin. Please download from Community Plugins
            to be able to adjust colors, etc. Below you can find some of the Style Settings that can not be incorporated
            to the Style Settings
        `,
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Fixed Calendar (Only File List Scrollable)')
			.setDesc('Disable this if you want whole calendar view to be scrollable and not only the file list')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fixedCalendar).onChange((newValue) => {
					this.plugin.settings.fixedCalendar = newValue;
					this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
				});
			});

		new Setting(containerEl)
			.setName('File Names Overflow Behaviour')
			.setDesc('Change the default behaviour for file names when they dont fit to the view')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('hide', 'Hide Overflow')
					.addOption('scroll', 'Scroll Overflow')
					.addOption('next-line', 'Show Overflow in the Next Line')
					.setValue(this.plugin.settings.fileNameOverflowBehaviour)
					.onChange((newValue: OverflowBehaviour) => {
						this.plugin.settings.fileNameOverflowBehaviour = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});
	}
}
