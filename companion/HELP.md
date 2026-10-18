# PresentationTools CueTimer

Controls CueTimer by [PresentationTools](https://presentationtools.com/).

Requires Companion 5.1 or later. Older Companion versions can keep using module version 2.2.x.

## Configuration

- IP address of the computer running CueTimer. For local use 127.0.0.1.
- Port, the default is 31601. Check that it matches Preferences / Triggers / Companion in CueTimer.
- List: the CueTimer list this connection follows, or "Active list" to follow whichever list is active.

## Available actions

- Start (fire the next timer)
- Stop (cue next)
- Stop and go back
- Pause
- Restart
- Undo
- Blackout
- Add 1 minute / Subtract 1 minute
- Add X minutes / Subtract X minutes
- Increase speed by 5% / Decrease speed by 5%
- Fullscreen, Preview, Presenter (on / off / toggle)
- NDI
- Message
- Single Timer Mode
- Clock
- Multitimer Preview, Multitimer Fullscreen (on / off / toggle), Multitimer NDI
- Move next up / Move next down
- Start timer with ID / Cue timer with ID
- Set duration
- Initialize list
- Initialize and start a new EndTime timer
- Activate next list / Activate previous list / Activate this list / Activate list by number

Text options (ID, duration, minutes, end time) accept Companion variables such as `$(custom:duration)`, and can be switched to expression mode.

## Variables

Variables are used as `$(instancename:variablename)`, e.g. `$(cuetimer:hours)`.

##### Main counter

- hours
- minutes
- seconds
- name
- speed
- endTime
- nextTimerName
- nextTimerDuration
- scheduleOffset
- scheduleOffsetStatus

##### Timers with an ID

- timer_X_name
- timer_X_duration

`X` is the timer ID as shown in CueTimer. Characters other than letters, digits, `-`, `_`, `.` and `!` are removed from the ID, for example `timer_AB_name` for the ID `A B`.

##### Lists

- listName: the name of the list this connection follows (without number prefix)
- listNumber: the number of the list this connection follows
- listGUID: the GUID of the list this connection follows
- listDisplayLink / listControlLink: display and control links of that list
- list_X_name: number-prefixed name of each list (e.g. `list_1_name` = `1 - ABC`)
- list_X_display_link / list_X_control_link: links of each list

## Feedbacks

##### Main counter colors from timer

- Foreground and background colors of the running timer

##### Main counter background color (status)

- Orange / black for on / off of: Fullscreen, Preview, Presenter, NDI, Message, Single Timer Mode, Clock, Pause, Blackout, Multitimer Preview, Multitimer Fullscreen, Multitimer NDI

##### Timer with ID

- ID timer name
- ID timer duration
- ID timer background

##### Lists

- Active list: changes the style when the chosen list number is the active one

## Presets

All actions, variables and feedbacks are available from the Presets tab, in the sections Commands, List control and Feedbacks.
