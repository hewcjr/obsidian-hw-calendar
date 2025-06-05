import React, { useMemo } from 'react';
import { BsArrowRight, BsArrowLeft } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { RiPhoneFindLine } from 'react-icons/ri';
import { MdToday } from 'react-icons/md';
import dayjs from 'dayjs';
import CalendarPlugin from 'main';
import { isMouseEvent, openFile } from '../util/utils';
import { Menu, TFile } from 'obsidian';
import { VIEW_TYPE } from 'view';
import { CalendarNote, CalendarInlineTimestamp } from 'types';

interface NoteListComponentParams {
	selectedDay: Date;
	setSelectedDay: (selectedDay: Date) => void;
	setActiveStartDate: (newActiveStartDate: Date) => void;
	plugin: CalendarPlugin;
	forceValue: number;
	selectedWeek: { weekNumber: number, date: Date } | null;
	setSelectedWeek: (week: { weekNumber: number, date: Date } | null) => void;
}

export default function NoteListComponent(params: NoteListComponentParams) {
	const { setSelectedDay, selectedDay, plugin, setActiveStartDate, forceValue, selectedWeek, setSelectedWeek } = params;

	const setNewSelectedDay = (nrChange: number) => {
		let newDate = dayjs(selectedDay).add(nrChange, 'day');
		setSelectedDay(newDate.toDate());
	};

	const extractFileName = (filePath: string) => {
		let lastIndexOfSlash = filePath.lastIndexOf('/');
		let endIndex = filePath.lastIndexOf('.');
		if (lastIndexOfSlash === -1) {
			return filePath.substring(0, endIndex);
		} else {
			return filePath.substring(lastIndexOfSlash + 1, endIndex);
		}
	};

	const openFilePath = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, filePath: string, lineNumber?: number) => {
		let abstractFile = plugin.app.vault.getAbstractFileByPath(filePath);
		let openFileBehaviour = plugin.settings.openFileBehaviour;
		if (abstractFile && abstractFile instanceof TFile) {
			// Define the Default Open Behaviour by looking at the plugin settings
			let openInNewLeaf: boolean = openFileBehaviour === 'new-tab';
			let openInNewTabGroup: boolean = openFileBehaviour === 'new-tab-group';
			if (openFileBehaviour === 'obsidian-default') {
				openInNewLeaf = (e.ctrlKey || e.metaKey) && !(e.shiftKey || e.altKey);
				openInNewTabGroup = (e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey);
			}
			// Open the file by using the open file behaviours above
			openFile({
				file: abstractFile,
				plugin: plugin,
				newLeaf: openInNewLeaf,
				leafBySplit: openInNewTabGroup,
				line: lineNumber
			});
		}
	};

	const selectedDayItems = useMemo(() => {
		// If a week is selected, get all items for the entire week
		if (selectedWeek) {
			// Create an array to hold items grouped by day
			const weekDays: {
				date: Date;
				dayString: string;
				notes: CalendarNote[];
				inlineTimestamps: CalendarInlineTimestamp[]
			}[] = [];

			// Get the start date of the week (the date passed from onClickWeekNumber)
			const startDate = dayjs(selectedWeek.date);

			// Loop through 7 days of the week
			for (let i = 0; i < 7; i++) {
				const currentDate = startDate.add(i, 'day');
				const currentDateIso = currentDate.format('YYYY-MM-DD');
				let dayNotes: CalendarNote[] = [];
				let dayInlineTimestamps: CalendarInlineTimestamp[] = [];

				if (currentDateIso in plugin.CALENDAR_DAYS_STATE) {
					// Get regular notes for this day
					dayNotes = plugin.CALENDAR_DAYS_STATE[currentDateIso].filter(
						(calendarItem) => calendarItem.type === 'note'
					) as CalendarNote[];

					// Get inline timestamp entries for this day
					dayInlineTimestamps = plugin.CALENDAR_DAYS_STATE[currentDateIso].filter(
						(calendarItem) => calendarItem.type === 'inline-timestamp'
					) as CalendarInlineTimestamp[];

					// Sort notes by display name
                                        dayNotes = dayNotes.sort((a, b) => {
                                                return plugin.settings.sortingOption === 'name-rev'
                                                        ? b.displayName.localeCompare(a.displayName, 'en', { numeric: true })
                                                        : a.displayName.localeCompare(b.displayName, 'en', { numeric: true });
                                        });

					// Sort inline timestamps by display name
                                        dayInlineTimestamps = dayInlineTimestamps.sort((a, b) => {
                                                return plugin.settings.sortingOption === 'name-rev'
                                                        ? b.displayName.localeCompare(a.displayName, 'en', { numeric: true })
                                                        : a.displayName.localeCompare(b.displayName, 'en', { numeric: true });
                                        });
				}

				// Only add days that have items
				if (dayNotes.length > 0 || dayInlineTimestamps.length > 0) {
					weekDays.push({
						date: currentDate.toDate(),
						dayString: currentDate.format('ddd, DD MMM YYYY'),
						notes: dayNotes,
						inlineTimestamps: dayInlineTimestamps
					});
				}
			}

			// Get calendar information for each item
			const getCalendarInfo = (calendarId?: string) => {
				if (!calendarId) return null;
				return plugin.settings.calendars.find(cal => cal.id === calendarId);
			};

			return {
				isWeekView: true,
				weekDays,
				weekNumber: selectedWeek.weekNumber,
				notes: [], // Empty for week view
				inlineTimestamps: [], // Empty for week view
				getCalendarInfo
			};
		} else {
			// Regular day view
			const selectedDayIso = dayjs(selectedDay).format('YYYY-MM-DD');
			let notes: CalendarNote[] = [];
			let inlineTimestamps: CalendarInlineTimestamp[] = [];

			if (selectedDayIso in plugin.CALENDAR_DAYS_STATE) {
				// Get regular notes
				notes = plugin.CALENDAR_DAYS_STATE[selectedDayIso].filter(
					(calendarItem) => calendarItem.type === 'note'
				) as CalendarNote[];

				// Get inline timestamp entries
				inlineTimestamps = plugin.CALENDAR_DAYS_STATE[selectedDayIso].filter(
					(calendarItem) => calendarItem.type === 'inline-timestamp'
				) as CalendarInlineTimestamp[];
			}

			// Sort notes by display name
                        notes = notes.sort((a, b) => {
                                return plugin.settings.sortingOption === 'name-rev'
                                        ? b.displayName.localeCompare(a.displayName, 'en', { numeric: true })
                                        : a.displayName.localeCompare(b.displayName, 'en', { numeric: true });
                        });

			// Sort inline timestamps by display name
                        inlineTimestamps = inlineTimestamps.sort((a, b) => {
                                return plugin.settings.sortingOption === 'name-rev'
                                        ? b.displayName.localeCompare(a.displayName, 'en', { numeric: true })
                                        : a.displayName.localeCompare(b.displayName, 'en', { numeric: true });
                        });

			// Get calendar information for each item
			const getCalendarInfo = (calendarId?: string) => {
				if (!calendarId) return null;
				return plugin.settings.calendars.find(cal => cal.id === calendarId);
			};

			return { isWeekView: false, notes, inlineTimestamps, getCalendarInfo };
		}
	}, [selectedDay, selectedWeek, forceValue, plugin.CALENDAR_DAYS_STATE, plugin.settings.sortingOption, plugin.settings.calendars]);

	const triggerFileContextMenu = (e: React.MouseEvent | React.TouchEvent, filePath: string) => {
		let abstractFile = plugin.app.vault.getAbstractFileByPath(filePath);
		if (abstractFile) {
			const fileMenu = new Menu();
			plugin.app.workspace.trigger('file-menu', fileMenu, abstractFile, VIEW_TYPE);
			if (isMouseEvent(e)) {
				fileMenu.showAtPosition({ x: e.pageX, y: e.pageY });
			} else {
				// @ts-ignore
				fileMenu.showAtPosition({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
			}
		}
	};

	return (
		<>
			<div className="calendar-notelist-header-container">
				{selectedDayItems.isWeekView ? (
					<>
						<div className="calendar-nav-action-left">
							{/* No left arrow in week view */}
						</div>
						<div
							className="calendar-nav-action-middle"
							aria-label="Week view">
							Week {selectedDayItems.weekNumber}
						</div>
						<div className="calendar-nav-action-right">
							{/* No right arrow in week view */}
						</div>
						<div className="calendar-nav-action-plus">
							<MdToday
								size={20}
								aria-label="Exit week view"
								onClick={() => {
									setSelectedWeek(null);
								}}
							/>
						</div>
					</>
				) : (
					<>
						<div className="calendar-nav-action-left">
							<BsArrowLeft size={22} aria-label="Go to previous day" onClick={() => setNewSelectedDay(-1)} />
						</div>
						<div
							className="calendar-nav-action-middle"
							aria-label="Show active date on calendar"
							onClick={() => setActiveStartDate(selectedDay)}>
							{dayjs(selectedDay).format('DD MMM YYYY')}
						</div>
						<div className="calendar-nav-action-right">
							<BsArrowRight size={22} aria-label="Go to next day" onClick={() => setNewSelectedDay(1)} />
						</div>
						<div className="calendar-nav-action-plus">
							<MdToday
								size={20}
								aria-label="Set today as selected day"
								onClick={() => {
									setActiveStartDate(new Date());
									setSelectedDay(new Date());
								}}
							/>
						</div>
					</>
				)}
			</div>
			<div
				className={
					'calendar-notelist-container ' +
					(plugin.settings.fileNameOverflowBehaviour == 'scroll' ? 'calendar-overflow-scroll' : '')
				}>
				{selectedDayItems.isWeekView ? (
					// Week view
					<>
						{selectedDayItems.weekDays.length === 0 ? (
							<div className="calendar-note-no-note">
								<RiPhoneFindLine className="calendar-no-note-icon" />
								No entries found for this week
							</div>
						) : (
							// Display items grouped by day
							selectedDayItems.weekDays.map((day) => (
								<div key={day.dayString} className="calendar-week-day-section">
									<div className="calendar-week-day-header" onClick={() => {
										setSelectedDay(day.date);
										setSelectedWeek(null);
									}}>
										{day.dayString}
									</div>

									{/* Display regular notes for this day */}
									{day.notes.map((note) => {
										const calendarInfo = selectedDayItems.getCalendarInfo(note.calendarId);
										return (
											<div
												className={
													'calendar-note-line' +
													(plugin.settings.fileNameOverflowBehaviour == 'hide'
														? ' calendar-overflow-hide'
														: '')
												}
												id={note.path}
												key={note.path}
												data-calendar-id={note.calendarId}
												style={calendarInfo?.color ? { '--calendar-color': calendarInfo.color } as React.CSSProperties : undefined}
												onClick={(e) => openFilePath(e, note.path)}
												onContextMenu={(e) => triggerFileContextMenu(e, note.path)}>
												<HiOutlineDocumentText className="calendar-note-line-icon" />
												<span>
													{calendarInfo && (
														<span className="calendar-item-label" title={calendarInfo.name}>
															{calendarInfo.name}:
														</span>
													)}
													{note.displayName}
												</span>
											</div>
										);
									})}

									{/* Display inline timestamp entries for this day */}
									{day.inlineTimestamps.map((item) => {
										const calendarInfo = selectedDayItems.getCalendarInfo(item.calendarId);
										return (
											<div
												className={
													'calendar-note-line calendar-inline-timestamp' +
													(plugin.settings.fileNameOverflowBehaviour == 'hide'
														? ' calendar-overflow-hide'
														: '')
												}
												id={`${item.path}-${item.lineNumber}`}
												key={`${item.path}-${item.lineNumber}`}
												data-calendar-id={item.calendarId}
												style={calendarInfo?.color ? { '--calendar-color': calendarInfo.color } as React.CSSProperties : undefined}
												onClick={(e) => openFilePath(e, item.path, item.lineNumber)}
												onContextMenu={(e) => triggerFileContextMenu(e, item.path)}>
												<HiOutlineDocumentText className="calendar-note-line-icon" />
												<span>
													{calendarInfo && (
														<span className="calendar-item-label" title={calendarInfo.name}>
															{calendarInfo.name}:
														</span>
													)}
													{item.displayName}
												</span>
											</div>
										);
									})}
								</div>
							))
						)}
					</>
				) : (
					// Day view
					<>
						{selectedDayItems.notes.length === 0 && selectedDayItems.inlineTimestamps.length === 0 && (
							<div className="calendar-note-no-note">
								<RiPhoneFindLine className="calendar-no-note-icon" />
								No entries found
							</div>
						)}

						{/* Display regular notes */}
						{selectedDayItems.notes.length > 0 && (
							<>
								{selectedDayItems.notes.map((note) => {
									const calendarInfo = selectedDayItems.getCalendarInfo(note.calendarId);
									return (
										<div
											className={
												'calendar-note-line' +
												(plugin.settings.fileNameOverflowBehaviour == 'hide'
													? ' calendar-overflow-hide'
													: '')
											}
											id={note.path}
											key={note.path}
											data-calendar-id={note.calendarId}
											style={calendarInfo?.color ? { '--calendar-color': calendarInfo.color } as React.CSSProperties : undefined}
											onClick={(e) => openFilePath(e, note.path)}
											onContextMenu={(e) => triggerFileContextMenu(e, note.path)}>
											<HiOutlineDocumentText className="calendar-note-line-icon" />
											<span>
												{calendarInfo && (
													<span className="calendar-item-label" title={calendarInfo.name}>
														{calendarInfo.name}:
													</span>
												)}
												{note.displayName}
											</span>
										</div>
									);
								})}
							</>
						)}

						{/* Display inline timestamp entries */}
						{selectedDayItems.inlineTimestamps.length > 0 && (
							<>
								{selectedDayItems.inlineTimestamps.map((item) => {
									const calendarInfo = selectedDayItems.getCalendarInfo(item.calendarId);
									return (
										<div
											className={
												'calendar-note-line calendar-inline-timestamp' +
												(plugin.settings.fileNameOverflowBehaviour == 'hide'
													? ' calendar-overflow-hide'
													: '')
											}
											id={`${item.path}-${item.lineNumber}`}
											key={`${item.path}-${item.lineNumber}`}
											data-calendar-id={item.calendarId}
											style={calendarInfo?.color ? { '--calendar-color': calendarInfo.color } as React.CSSProperties : undefined}
											onClick={(e) => openFilePath(e, item.path, item.lineNumber)}
											onContextMenu={(e) => triggerFileContextMenu(e, item.path)}>
											<HiOutlineDocumentText className="calendar-note-line-icon" />
											<span>
												{calendarInfo && (
													<span className="calendar-item-label" title={calendarInfo.name}>
														{calendarInfo.name}:
													</span>
												)}
												{item.displayName}
											</span>
										</div>
									);
								})}
							</>
						)}
					</>
				)}
			</div>
		</>
	);
}
