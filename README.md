# Calendar Plugin
- This version of Obsidian plugin uses a calendar view for any timestamped notes and/or blocks of text.
- Currently supports looking for timestamps in YAML frontmatter, file names, or In-Line regex patterns.
- Supports viewing multiple "calendars" containing different formats. Just set and test your date formats in the plugin settings.
- This plugin is a based from the work of [oz-calendar](https://github.com/ozntel/oz-calendar).

# Changes
- Settings inputs now allow normal typing without workarounds.

# Multiple Formats, Multiple Calendar Types
- The mission of this plugin is to integrate different calendar objects from different timestamps into a single calendar widget.
- For viewing, the widget currently The supports multiple "calendars" with different configurations. You can:
    - Enable/disable individual calendars as needed (only in the settings page)
    - Assign colors to different calendars for visual distinction (color picker needed)

# Timestamp Formats > Calendar Types
- For each format, set a name of the type of calendar object, expected date format, and color.
- Go to the plugin settings
- Click "Add Calendar" to create a new calendar object type.

# YAML

- YAML frontmatter at the beginning of a file contains the following:

```
---
date: 2023-05-11
---
```

- In settings, set the key and expected date format
- Set the Source Type to **YAML**
- Define the **YAML Key** you are using for dates
- Define the **Date Format** that matches your YAML key value
    - YAML can included additional characters in the file name. The plugin parses the beginning of the value. (example: YAML value contains "2025-03-10 This is the file" is fine.)

# File Name

- Dates in the file name are parsed and displayed in the calendar.
- Set the Source Type to **Filename**
- Define the **Date Format** you are using in your filenames
    - File names can include additional characters. The plugin parses the beginning of the filename. (example: filename contains "2023-03-10 This is the file" is fine.)

# In-Line Pattern Option as Date Source

- Lines containing patterns can be parsed and displayed in the calendar.
- After a line is matched, a date pattern is extracted and displayed as a calendar object
- Set the Source Type to **In-Line Pattern**
- Define the **Inline Pattern** as a regular expression with parentheses to capture the date part
    - Example: `^-\\s+(\\d{8})\\s+-` will match `- 20250311 - Optional Practices 8:35-9:25am` and capture `20250311`
- Define the **Date Format** that matches your captured date structure
- Use provided tests in the settings to verify your pattern works correctly
- Optionally specify a whitelist of note paths to limit searching for matches. Use the **Add Note** button in settings to fuzzy search and add notes from your vault.


- use **Reload Plugin** option to activate the changes in the vault.
- Calendar entries in the note list are grouped by their calendar name.

# Note Heading Option

- Parse headings in a specific note for date stamps.
- Set the Source Type to **Note Heading**.
- Select the note using the **Select Note** button.
- Optionally browse headings in that note with **Browse Headings** to verify available dates.
- Define the **Date Format** used at the beginning of the heading text. Additional text after the date is allowed.
- Each non-empty line under a matched heading becomes its own calendar entry using the heading's date.

# Support
- Hopefully this plugin will keep getting improved as much as possible. If you find this plugin useful, please support it at https://ko-fi.com/

# Log
- 202506080818: [Improved White-List Settings Option] There is now a white-list option for In-Line patterns that are often repeated in other notes, likely resulting in unwanted calendar objects in the view. The white-list option will act as a filter for these situations. For example my found articles use the same date stamp as my Calendar entries. In this case when the object type is created I would set "Calendar" as only note in my white-list.