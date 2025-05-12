# Calendar Plugin
## HW Calendar

- This version of obsidian calendar plugin views timestamped notes and/or blocks of text on a calendar view.
- Currently supports looking in YAML frontmatter, file names, or In-Line regex patterns containing custom date patterns.
- Supports viewing multiple "calendars" containing different formats. Just set and test your date formats in the plugin settings.
- This plugin is a based from the work of [oz-calendar](https://github.com/ozntel/oz-calendar).

## Sample View



## Current Bugs
- In the settings sometimes the text fields refuses to be written on. I found copy and pasting text into the fields tend to work.

## Multiple Formats, Multiple Calendars
- The mission of this plugin is to integrate different calendar objects coming from different "dated note formats" into a calendar widget.
- Said formats can be from folder, files, or blocks of text


The supports multiple "calendars" with different configurations. You can:

1. Create multiple calendar configurations with different source types
2. Assign colors to different calendars for visual distinction
3. Enable/disable individual calendars as needed

## Calendar formats

- For each format, set a name of the type of calendar object, expected date format, and color.
- Go to the plugin settings
- Click "Add Calendar" to create a new calendar object type.

### YAML

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

### File Name

- Dates in the file name are parsed and displayed in the calendar.
- Set the Source Type to **Filename**
- Define the **Date Format** you are using in your filenames
    - File names can include additional characters. The plugin parses the beginning of the filename. (example: filename contains "2023-03-10 This is the file" is fine.)

### In-Line Pattern Option as Date Source

- Lines containing patterns can be parsed and displayed in the calendar.
- After a line is matched, a date pattern is extracted and displayed as a calendar object
- Set the Source Type to **In-Line Pattern**
- Define the **Inline Pattern** as a regular expression with parentheses to capture the date part
    - Example: `^-\\s+(\\d{8})\\s+-` will match `- 20250311 - Optional Practices 8:35-9:25am` and capture `20250311`
- Define the **Date Format** that matches your captured date structure
- Use provided tests in the settings to verify your pattern works correctly

## Conclusion
- use **Reload Plugin** option to activate the changes in the vault.

## Support
- I want to keep improving this plugin as much as possible. If you find this plugin useful, please support me at https://ko-fi.com/