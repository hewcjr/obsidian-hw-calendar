import React, { useEffect, useState } from 'react';
import Calendar, { CalendarTileProperties } from 'react-calendar';
import { RxDotFilled } from 'react-icons/rx';
import CalendarPlugin from '../main';
import NoteListComponent from './noteList';
import dayjs from 'dayjs';
import useForceUpdate from 'hooks/forceUpdate';
import { DayChangeCommandAction } from 'types';

export default function MyCalendar(params: { plugin: CalendarPlugin }) {
	const { plugin } = params;
	const [selectedDay, setSelectedDay] = useState<Date>(new Date());
	const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
	const [selectedWeek, setSelectedWeek] = useState<{ weekNumber: number, date: Date } | null>(null);
	const { forceValue, forceUpdate } = useForceUpdate();

	useEffect(() => setActiveStartDate(selectedDay), [selectedDay]);

	useEffect(() => {
		window.addEventListener(plugin.EVENT_TYPES.forceUpdate, forceUpdate);
		window.addEventListener(plugin.EVENT_TYPES.changeDate, changeDate);
		return () => {
			window.removeEventListener(plugin.EVENT_TYPES.forceUpdate, forceUpdate);
			window.removeEventListener(plugin.EVENT_TYPES.changeDate, changeDate);
		};
	}, []);

	// createNote function removed

	const changeDate = (e: CustomEvent) => {
		let action = e.detail.action as DayChangeCommandAction;
		let currentSelectedDay = selectedDay;

		// Event listener is not capable of getting the updates after event listener is added
		// This is created to capture current state value during the custom event dispatch
		setSelectedDay((selectedDay) => {
			currentSelectedDay = selectedDay;
			return selectedDay;
		});

		let newDate = dayjs(currentSelectedDay);
		if (action === 'next-day') {
			newDate = dayjs(currentSelectedDay).add(1, 'day');
		} else if (action === 'previous-day') {
			newDate = dayjs(currentSelectedDay).add(-1, 'day');
		} else if (action === 'today') {
			newDate = dayjs();
		}
		setSelectedDay(newDate.toDate());
		setSelectedWeek(null); // Clear week selection when changing date
	};

	const customTileContent = ({ date, view }: CalendarTileProperties) => {
		if (view === 'month') {
			const dateString = dayjs(date).format('YYYY-MM-DD');
			let dotsCount =
				dateString in plugin.CALENDAR_DAYS_STATE ? plugin.CALENDAR_DAYS_STATE[dateString].length : 0;
			return (
				<div className="dots-wrapper">
					{[...Array(Math.min(dotsCount, 2))].map((_, index) => (
						<RxDotFilled key={index} viewBox="0 0 15 15" />
					))}
					{dotsCount > 2 && <span>+{dotsCount - 2}</span>}
				</div>
			);
		}
		return null;
	};

	const customTileClass = ({ date }: CalendarTileProperties) => {
		// Assign a custom class in case the day is the current day
		let today = new Date();
		return date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
			? 'calendar-plugin-today'
			: '';
	};

	const fixedCalendarClass = plugin.settings.fixedCalendar ? 'fixed' : '';

	const handleWeekNumberClick = (weekNumber: number, date: Date) => {
		setSelectedWeek({ weekNumber, date });
		// Set the selected day to the first day of the week
		setSelectedDay(date);
	};

	return (
		<div className={'calendar-plugin-view ' + fixedCalendarClass}>
			<Calendar
				onChange={(date: Date) => {
					setSelectedDay(date);
					setSelectedWeek(null); // Clear week selection when a day is clicked
				}}
				value={selectedDay}
				maxDetail="month"
				minDetail="month"
				showWeekNumbers={plugin.settings.showWeekNumbers}
				view="month"
				tileContent={customTileContent}
				tileClassName={customTileClass}
				calendarType={plugin.settings.calendarType}
				showFixedNumberOfWeeks={plugin.settings.fixedCalendar}
				activeStartDate={activeStartDate}
				onClickWeekNumber={handleWeekNumberClick}
				onActiveStartDateChange={(props) => {
					if (props.action === 'next') {
						setActiveStartDate(dayjs(activeStartDate).add(1, 'month').toDate());
					} else if (props.action === 'next2') {
						setActiveStartDate(dayjs(activeStartDate).add(12, 'month').toDate());
					} else if (props.action === 'prev') {
						setActiveStartDate(dayjs(activeStartDate).add(-1, 'month').toDate());
					} else if (props.action === 'prev2') {
						setActiveStartDate(dayjs(activeStartDate).add(-12, 'month').toDate());
					}
				}}
				formatMonthYear={(_locale, date) => dayjs(date).format('MMM YYYY')}
				// @ts-ignore - This prop exists in react-calendar but might not be in the type definitions
				formatShortWeekday={(_locale, date) => dayjs(date).format('ddd')}
				// @ts-ignore - This prop exists in react-calendar but might not be in the type definitions
				formatDay={(_locale, date) => dayjs(date).format('D')}
				// Custom prop to format week numbers - might not be in type definitions
				// @ts-ignore
				formatWeekNumber={(weekNumber) => `${weekNumber}`}
			/>
			<>
				<div id="calendar-divider"></div>
				<NoteListComponent
					selectedDay={selectedDay}
					setSelectedDay={setSelectedDay}
					setActiveStartDate={setActiveStartDate}
					plugin={plugin}
					forceValue={forceValue}
					selectedWeek={selectedWeek}
					setSelectedWeek={setSelectedWeek}
				/>
			</>
		</div>
	);
}
