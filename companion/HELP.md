# PresentationTools CueTimer

Controls CueTimer by [PresentationTools](https://presentationtools.com/): the CueTimer app on your network, or a cue list on CueTimer Cloud.

Requires Companion 5.1 or later and CueTimer 5 with the Companion API. For CueTimer 4, or an older CueTimer 5 build, use module version 2 (Companion lets you pick the module version in the connection's settings).

## Configuration

**Connect to**

- _CueTimer app on this network_: the CueTimer app on this or another computer.
  - Target IP: the computer running CueTimer. For local use 127.0.0.1.
  - Target Port: the LAN port CueTimer shows under Preferences / Network for display and control links (31609 by default). This is not the Companion TCP port of module version 2.
  - List: the CueTimer list this connection follows, or "Active list" to follow whichever list is active. Lists chosen before CueTimer was reachable are matched by number once it is.
- _CueTimer Cloud_: a cue list on CueTimer Cloud.
  - Cue list ID: the id in the cue list's control link (`?id=…`), the same one the CueTimer app asks for under Cloud.

**Connection name** (Cloud mode) is shown in CueTimer Cloud's dashboard for the cue list.

Connections created with module version 2 are converted automatically: the app mode with the same IP and list, on the LAN port.

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
- Message
- Single Timer Mode
- Clock
- Move next up / Move next down
- Start timer with ID / Cue timer with ID
- Set duration
- Initialize list

Only with the CueTimer app (not on CueTimer Cloud):

- Fullscreen, Preview, Presenter (on / off / toggle)
- NDI
- Multitimer Preview, Multitimer Fullscreen (on / off / toggle), Multitimer NDI
- Activate next list / Activate previous list / Activate this list / Activate list by number

Text options (ID, duration, minutes) accept Companion variables such as `$(custom:duration)`, and can be switched to expression mode.

Pause, Blackout, Message, Clock and Single Timer Mode toggle from the state last received from CueTimer. Two presses within the same tenth of a second, or a change made by another operator at the same moment, count as one toggle; the button then shows the real state and the next press works as expected.

## Variables

Variables are used as `$(instancename:variablename)`, e.g. `$(cuetimer:hours)`. The values are computed by CueTimer; the module does no counting.

##### Main counter

- hours, minutes, seconds: the counter as shown on the outputs, split into its parts (overtime shows a `+`)
- name
- speed
- endTime: end of the running timer, in the list's time zone
- nextTimerName, nextTimerDuration
- scheduleOffset, scheduleOffsetStatus (auto-schedule)

##### Timers with an ID

- timer_X_name
- timer_X_duration

`X` is the timer ID as shown in CueTimer. IDs made only of letters, digits, `-`, `_`, `.` and `!` are used as they are. Any other ID has those characters removed (a space becomes `_`) and gets an 8-character suffix derived from the full ID, for example `timer_A_B_546d26b2_name` for the ID `A B`. If two timers still end up with the same variable id, neither is published and the connection log names the IDs to rename.

##### Lists

- listName: the name of the list this connection follows
- listNumber: its number (0 on CueTimer Cloud)
- listGUID: its id
- listDisplayLink / listControlLink: display and control links of that list (app only)
- list_X_name: number-prefixed name of each list (e.g. `list_1_name` = `1 - ABC`) (app only)
- list_X_display_link / list_X_control_link: links of each list (app only)

## Feedbacks

##### Main counter colors from timer

- Foreground and background colors of the running timer

##### Main counter background color (status)

- Orange / black for on / off of: Fullscreen, Preview, Presenter, NDI, Message, Single Timer Mode, Clock, Pause, Blackout, Multitimer Preview, Multitimer Fullscreen, Multitimer NDI

Message feedback shows whether Message is enabled, including while the timer is idle.

##### Timer with ID

- ID timer name
- ID timer duration
- ID timer background

##### Lists

- Active list: changes the style when the chosen list number is the active one (app only)

## Presets

All actions, variables and feedbacks are available from the Presets tab, in the sections Commands, List control and Feedbacks. On CueTimer Cloud the output and list presets are not shown.

## Connection status

- _Selected list not found, active list will be used_: the configured list no longer exists in CueTimer; the connection follows the active list until you pick another one.
- _Cloud sync needs attention in the CueTimer control page_: CueTimer Cloud is holding a change it could not save. Commands are refused until the cue list is reloaded in the control page.
- _Fix the cue list in CueTimer Cloud, then save or re-enable this connection_: the cue list is missing, deleted or its trial has expired. After fixing it on CueTimer Cloud, save the connection settings or disable and re-enable the connection.
- _CueTimer does not support the Companion API_: the CueTimer at this address is too old for module version 3. Update CueTimer, or use module version 2.
