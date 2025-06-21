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
import { CalendarNote, CalendarInlineTimestamp, CalendarNoteHeading, CalendarItem } from 'types';

interface NoteListComponentParams {
	selectedDay: Date;
	setSelectedDay: (selectedDay: Date) => void;
	setActiveStartDate: (newActiveStartDate: Date) => void;
	plugin: CalendarPlugin;
	forceValue: number;
	selectedWeek: { weekNumber: number, date: Date } | null;
	setSelectedWeek: (week: { weekNumber: number, date: Date } | null) => void;
}

interface CalendarGroup {
        calendarId: string;
        items: CalendarItem[];
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
                const sortItems = (arr: CalendarItem[]): CalendarItem[] => {
                        return arr.sort((a, b) => {
                                return plugin.settings.sortingOption === 'name-rev'
                                        ? b.displayName.localeCompare(a.displayName, 'en', { numeric: true })
                                        : a.displayName.localeCompare(b.displayName, 'en', { numeric: true });
                        });
                };

                const groupByCalendar = (items: CalendarItem[]): CalendarGroup[] => {
                        const map: Record<string, CalendarItem[]> = {};
                        for (const item of items) {
                                const id = item.calendarId || 'none';
                                if (!map[id]) map[id] = [];
                                map[id].push(item);
                        }
                        return Object.entries(map).map(([calendarId, arr]) => ({
                                calendarId,
                                items: sortItems(arr),
                        }));
                };

                const getCalendarInfo = (calendarId?: string) => {
                        if (!calendarId) return null;
                        return plugin.settings.calendars.find(cal => cal.id === calendarId);
                };

                if (selectedWeek) {
                        const weekDays: { date: Date; dayString: string; groups: CalendarGroup[] }[] = [];
                        const startDate = dayjs(selectedWeek.date);

                        for (let i = 0; i < 7; i++) {
                                const currentDate = startDate.add(i, 'day');
                                const iso = currentDate.format('YYYY-MM-DD');
                                const items = iso in plugin.CALENDAR_DAYS_STATE ? plugin.CALENDAR_DAYS_STATE[iso] : [];
                                const groups = groupByCalendar(items);
                                if (groups.length > 0) {
                                        weekDays.push({
                                                date: currentDate.toDate(),
                                                dayString: currentDate.format('ddd, DD MMM YYYY'),
                                                groups,
                                        });
                                }
                        }

                        return { isWeekView: true, weekDays, weekNumber: selectedWeek.weekNumber, groups: [], getCalendarInfo };
                } else {
                        const dayIso = dayjs(selectedDay).format('YYYY-MM-DD');
                        const items = dayIso in plugin.CALENDAR_DAYS_STATE ? plugin.CALENDAR_DAYS_STATE[dayIso] : [];
                        const groups = groupByCalendar(items);

                        return { isWeekView: false, groups, getCalendarInfo };
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

        const renderCalendarItem = (item: CalendarItem) => {
                const calendarInfo = selectedDayItems.getCalendarInfo(item.calendarId);
                const baseClass =
                        'calendar-note-line' +
                        (item.type === 'inline-timestamp'
                                ? ' calendar-inline-timestamp'
                                : item.type === 'note-heading'
                                ? ' calendar-note-heading'
                                : '');
                const idKey = item.type === 'note' ? item.path : `${item.path}-${item.lineNumber}`;
                return (
                        <div
                                className={
                                        baseClass +
                                        (plugin.settings.fileNameOverflowBehaviour == 'hide' ? ' calendar-overflow-hide' : '')
                                }
                                id={idKey}
                                key={idKey}
                                data-calendar-id={item.calendarId}
                                style={
                                        calendarInfo?.color
                                                ? ({ '--calendar-color': calendarInfo.color } as React.CSSProperties)
                                                : undefined
                                }
                                onClick={(e) =>
                                        openFilePath(
                                                e,
                                                item.path,
                                                item.type === 'note' ? undefined : item.lineNumber
                                        )
                                }
                                onContextMenu={(e) => triggerFileContextMenu(e, item.path)}
                        >
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
                                        <>
                                                {selectedDayItems.weekDays.length === 0 ? (
                                                        <div className="calendar-note-no-note">
                                                                <RiPhoneFindLine className="calendar-no-note-icon" />
                                                                No entries found for this week
                                                        </div>
                                                ) : (
                                                        selectedDayItems.weekDays.map((day) => (
                                                                <div key={day.dayString} className="calendar-week-day-section">
                                                                        <div className="calendar-week-day-header" onClick={() => { setSelectedDay(day.date); setSelectedWeek(null); }}>
                                                                                {day.dayString}
                                                                        </div>
                                                                        {day.groups.map((group) => {
                                                                                const info = selectedDayItems.getCalendarInfo(group.calendarId);
                                                                                return (
                                                                                        <React.Fragment key={group.calendarId}>
                                                                                                <div className="calendar-object-group-header">{info ? info.name : group.calendarId}</div>
                                                                                                {group.items.map(renderCalendarItem)}
                                                                                        </React.Fragment>
                                                                                );
                                                                        })}
                                                                </div>
                                                        ))
                                                )}
                                        </>
                                ) : (
                                        <>
                                                {selectedDayItems.groups.length === 0 ? (
                                                        <div className="calendar-note-no-note">
                                                                <RiPhoneFindLine className="calendar-no-note-icon" />
                                                                No entries found
                                                        </div>
                                                ) : (
                                                        selectedDayItems.groups.map((group) => {
                                                                const info = selectedDayItems.getCalendarInfo(group.calendarId);
                                                                return (
                                                                        <React.Fragment key={group.calendarId}>
                                                                                <div className="calendar-object-group-header">{info ? info.name : group.calendarId}</div>
                                                                                {group.items.map(renderCalendarItem)}
                                                                        </React.Fragment>
                                                                );
                                                        })
                                                )}
                                        </>
                                )}
                        </div>
		</>
	);
}
