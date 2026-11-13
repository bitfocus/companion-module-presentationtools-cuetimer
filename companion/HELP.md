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

Newly added **Start timer with ID** / **Cue Timer with ID** actions and all **ID timer** feedbacks start with an empty ID. Enter the timer ID yourself, or use a shared local variable in expression mode. Existing buttons retain their saved IDs. An action with an empty ID sends no timer command.

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

The **ID** field in CueTimer is optional and can usually be left empty. Assign an ID when you want to address a particular timer from Companion. An ID can be a number or text, such as `1`, `Opening` or `Speaker A`, and is independent of the timer's position in the list. IDs can appear in any order; moving a timer does not change which timer its ID identifies.

These variables are available only for timers with an assigned ID:

- timer_X_name
- timer_X_duration

To show the name of timer ID `1`, enter `$(cuetimer:timer_1_name)` in the button's **Style > Text** field (replace `cuetimer` with your connection label). You can add your own text around the variable, or replace it with a custom label. The Start timer with ID and Cue timer with ID sections provide presets with the matching name variable, action and background feedback already configured for each assigned ID.

To show the duration of timer ID `1`, use `$(cuetimer:timer_1_duration)` in **Style > Text**. You can combine it with the name variable and your own text, or replace it with a custom label.

The original `timer_X_name` / `timer_X_duration` variable names and **ID timer Name** / **ID timer Duration** feedbacks are retained for existing buttons. New presets use variables in **Style > Text** so you can edit the text freely.

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

The original name and duration feedbacks replace the button text. **ID timer Name value** and **ID timer Duration value** instead supply a local variable, so the new presets keep their text editable. You can also use the `timer_X_name` and `timer_X_duration` variables in **Style > Text**.

##### Lists

- Active list: changes the style when the chosen list number is the active one (app only)

## Presets

All actions, variables and feedbacks are available from the Presets tab, in the sections Commands, List control and Feedbacks. On CueTimer Cloud the output and list presets are not shown.

**Start timer with ID** and **Cue timer with ID** are always available, with both the CueTimer app and Cloud. Each section starts with a clearly marked generic preset: **Start with ID — enter ID manually** or **Cue with ID — enter ID manually**. These work as templates even while offline or before IDs have been assigned. They start with an empty ID and show **Set timer ID** until you enter one. Pressing them before entering an ID sends no timer command. Once configured, they show only the matching timer’s name, just like the list-generated Start/Cue buttons; the generic label stays in the preset browser.

When a list is connected, each section also has a pair of presets for every eligible timer, in cue-list order:

- **Name / Start** shows only the timer name, and starts that ID when pressed.
- **Name / Cue**, in the Cue section, shows only the timer name, and cues that ID as the next timer when pressed.
- **Duration**, immediately after the name button in each section, shows the timer duration and has no press action.

**Change the ID in one place:** choose **When placed → Linked** in the Presets tab, then drag any ID preset onto your page. Select the button and change **timer_id** under **Preset variables**, directly below Connection. There is no need to click **Edit** or open Local Variables. The button stays linked and can receive preset updates. The action, displayed name or duration, and background all follow that value. Each button has its own Timer ID; if you use a name/action button and a separate duration button, set the ID on each button. Numeric and text IDs (such as `A` or `Speaker A`) are supported.

When the selected ID has no matching timer, both name/action and duration buttons show **ID: <value>** and **Not found**. While disconnected or waiting for the first list snapshot, they show **ID: <value>** and **Offline**. An empty ID shows **Set timer ID**. A matching timer with no name shows **Unnamed timer** on its name/action button. The normal name or duration returns automatically when the matching timer becomes available. Pressing a button with no matching timer does not send a timer command.

The name and duration are supplied by feedback-driven local variables, `$(local:timer_name)` and `$(local:timer_duration)`. You can combine these with your own text in **Style > Text**. Leave their ID references pointing to `$(local:timer_id)` so that only Timer ID needs editing.

The list-generated presets update when timers are added, removed, renamed, reordered, or assigned different IDs, and when the connection follows a different list. Timers without an ID are omitted, as are IDs whose variables cannot be published because of a collision. These list entries disappear on disconnect, but the generic presets remain available. Buttons already placed on a page continue to target their assigned ID in the list this connection follows; changing an ID in CueTimer requires changing Timer ID on those buttons.

If you place a preset as a **Copy**, or click **Edit** to unlink it for full customization, change **Timer ID** (`timer_id`) in **Local Variables** instead.

Previously placed buttons do not gain the new preset parameter automatically. Replace an older button with a freshly dragged **Linked** preset to get the direct **timer_id** field.

## Connection status

- _Selected list not found, active list will be used_: the configured list no longer exists in CueTimer; the connection follows the active list until you pick another one.
- _Cloud sync needs attention in the CueTimer control page_: CueTimer Cloud is holding a change it could not save. Commands are refused until the cue list is reloaded in the control page.
- _Fix the cue list in CueTimer Cloud, then save or re-enable this connection_: the cue list is missing, deleted or its trial has expired. After fixing it on CueTimer Cloud, save the connection settings or disable and re-enable the connection.
- _CueTimer does not support the Companion API_: the CueTimer at this address is too old for module version 3. Update CueTimer, or use module version 2.
