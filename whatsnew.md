Check the full list of changes at https://docs.webix.com/desktop__whats_new.html

Version 11.1 (April 2025)
=============================

### Major features

- Rich Text Editor widget
- File Manager and Document Manager:
	- data limits: amount of items loaded to every folder can be limited to a specified number
	- API method for selecting an item: `selectFile`
- Spreadsheet:
	- XSS safety mode
	- zoom on `Ctrl`+`mousewheel`
	- API methods for number formatting: `addFormat()`, `getFormat()`, `setFormat()`, `removeFormat()`
- Diagram:
	- new hotkeys: zoom on `Ctrl`+`+`, `Ctrl`+`-`, `Ctrl`+`0`

### Updates

- hotkeys now can support QWERTY (default), QWERTZ and AZERTY layouts (e.g. `Ctrl`+`Ö` will be recognized as valid hotkey)
- File Manager and Document Manager: Location is added into the displayed item's details
- Scheduler: the Units view is now scrollable, the configurable `minWidth` is set for unit columns
- Spreadsheet: (UX for formatted dates) if a cell displays only time, the date editor will open as a timepicker
- User Manager: `cursor:pointer` is displayed over clickable checkboxes in matrices ("user/role", "rule/role", "rule/user")
- Gantt: tasks outside the specified scale now will not be displayed on Gantt's chart area
- ToDo: better indication of the applied search

### Fixes

- hotkeys set with UIManager didn't work in non-latin keyboard layouts
- Texthighlight: with `labelPosition:"top"` highlighted text was shifting from the input
- Multicombo: wrong sizing with `labelPosition: "left"`
- Button: `maxWidth` was ignored durging resize
- Calendar: `minDate`/`maxDate` limits were ignored during time selection (in an empty widget)
- Window: "Close" icon was misaligned
- Tree with `threeState`: disabled items could be affected by checking/unchecking a parent node

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_11_1.html)

Version 11.0 (November 2024)
=============================

### Major features

- Export of images is now available in the common toExcel() method and in Spreadsheet
- The *mode: "auto"* configuration property for webix.print()
- export to Excel: frozen rows/cols
- Spreadsheet:
	- a method that allows getting the cell reference from the cell ID in a table
	- import from Excel: filters, zoom, header visibility, gridlines
	- export to Excel: export frozen rows/cols, zoom, header visibility, gridlines
	- the find and replace functionality
	- displaying and filtering math formulas by category
	- highlighting references in the formulas mode
- File Manager and Document Manager:
	- extended filters for searching files
	- view search results in the Grid mode
- Report Manager: 
	- ability to show reports as standalone widgets 

### Updates

- Supported PDF.js version updated to 4.7.76

### Fixes

- regression in Multicombo: suggest stays hidden while a user is typing
- regression in Multicombo: bottomLabel leads to wrong sizing
- improved data export to CSV (filterHTML)
- typescript definitions are improved
- Datatable: configuration of filters may ignore optionWidth in inputConfig
- Datatable: multisort state is shared across instances
- Datatable: concurrent data loads throw an error
- Treetable: client-side filters cannot be reset after additional parse
- Datatable in Firefox: a tooltip is still visible after the cursor has left the table 
- Datatable in Firefox on Windows, any browser on macOS: inactive scrollbars
- Datatable: unnecessary mutations in the column's config
- Dynamic loading in Datatable: keyboard navigation does not load data upwards
- Dynamic loading in Datatable: dragging scrollbar triggers an additional request with incorrect parameters

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_11_0.html)


Version 10.3 (August 2024)
=============================

### Updates

- TypeScript definitions are improved

### Fixes

- Complex widgets: checking whether a CSS class name starts with the widget-specific prefix instead of checking the whole class name is implemented
- memory leaks related to filters
- memory leaks related to custom scroll
- handling errors within GraphQL proxy
- wrong "placeholder" CSS style in .min version
- Datepicker: format set as a string with type: "month"/"year" doesn't apply correctly
- DataLayout can't pass data to elements inside the Accordion item
- Dashboard: returning false in the factory crashes restore()
- Dynamic UI rebuilding does not work for MultiView
- The onBeforeEditStop event can't handle popup editors
- SideMenu with context and selection
- MultiView with the enabled keepViews config does not add PDFViewer properly
- Incorrect work of the elementsConfig property of Form
- Incorrect value of a checkbox in Property Sheet
- Timeline: details do not always appear with the height:"auto" setting specified
- A typo in the French locale
- Incorrect behavior when the cursor hovers over the resizer line
- Daterange: time of the end date is not displayed properly
- Radio button with empty options/no options breaks UI rendering
- DataTable: incorrect work of the inputConfig property
- DataTable: zeros are not displayed when using webix.print()
- The onItemSingleClick event doesn't work for DataView
- MultiCombo: wrong size if the parent window was closed with Escape while the suggest list was opened
- Unwanted filter icons in the headermenu options
- The label and placeholder properties of Bullet Graph ignore the change of value
- DOMException is thrown when validating the Text control with the type "number"
- The adjustRowHeight method ignores complex templates
- The DashBoard panel border disappears on minimizing the panel
- webix.Date.strToDate can't parse ISO 8601 short expressions
- DatePicker: the format set as a string with the type: "month"/"year" doesn't apply correctly
- Wrong "placeholder" CSS style in the minified version
- Export to Excel: calling toExcel() in the Numbers editor (iOS/macOS) results in replacing empty values with zeroes

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_10_3.html)

Version 10.2 (October 2023)
=============================

### Updates

- typescript definitions are improved

### Fixes

- incorrect height of multicombo with top label
- incorrect export to excel for data with array-based formulas
- selecting values from the list doesn't work for combo with data feed
- incorrect rendering of bullet graphs in the firefox
- calendar widget doesn't preserve correct date value in the timepicker mode

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_10_2.html)

Version 10.1 (May 2023)
=============================

### Major features

- Group calls in the Chat widget
- Year view in the Scheduler widget
- Improved UX in the ToDo list

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_10_1.html)

Version 10.0 (November 2022)
=============================

### Major features

- Willow and Dark skins
- Desktop widget
- ToDo list

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_10_0.html)

Version 9.4 (July 2022)
=============================

### Major features

- Diagram: curved links
- Pie and Donut charts with multiple levels and 3D
- SpreadSheet and Pivot with support of all charts

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_9_4.html)

Version 9.3 (April 2022)
=============================

### Major features

- Chat: ability to send emojis and add reactions
- More chart types for Pivot
- Spreadsheet: special paste and more charts and sparkline types
- Scheduler: ability to copy events

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_9_3.html)

Version 9.2 (March 2022)
=============================

### Major features

- Problems with touch handlers on hybrid devices (Microsoft Surface or a laptop with touchscreen)
- Grouplist: setOpenState method is added
- combo: ability to add new options via the input
- $onBlur handler for inputs is added

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_9_2.html)

Version 9.1 (November 2021)
===============================

### Major features

- Chat: the ability to send files
- Spreadsheet: new math methods
- the ability to customize the document footer for export to PDF

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_9_1.html)

Version 9.0 (October 2021)
===============================

### Major features

- New Pivot widget
- Updates for Diagram Editor:
	- ability to change links in UI
	- ability to rotate shapes in UI
	- ability to adjust items to their content
	- ability to preserve ratio of items during resize
	- ability to define new non-svg shapes and create shapes based on built-in templates
- Gantt:
	- separate calendars for resources
	- loading UTC dates
- Spreadsheet:
	- Excel export supports stub cells
	- a much wider range of supported math methods
	- increased column count limit

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_9_0.html)

Version 8.4 (July 2021)
==============================

### Major features

- Diagram Editor
- Chat: video calls
- Gantt: optimize performance on task reordering
- Spreadsheet: wide set of rules for conditional formatting
- Chart: ability to add text inside Donut charts
- Form: autowidth for labels within all form controls
- Export to Excel: ability to hide arbitrary rows or columns

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_8_4.html)

Version 8.3 (April 2021)
==============================

### Major features

- New Diagram widget
- Gantt: split tasks
- Scheduler
	- Timeline view
	- Units view
- Spreadsheet
	- Chart usability: legend settings and labels
	- Currency symbol to custom format window
	- Export to Excel with hidden rows and columns

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_8_3.html)

Version 8.2 (March 2021)
==============================

### Major features

- Gantt: Resource Management
	- Allocating resources
	- Resource view
	- Resource Diagram
- Gantt: Scheduling benefits
	- Critical path
	- Conversion of all tasks with sub tasks into projects
	- Excluding holidays from task duration
- Spreadsheet: new math engine to support fully-fledged multi-sheet math and global named ranges.
- File and Document Manager: ability to edit several text files simultaneously
- Datatable: ability to deny resizing of a particular column
- Form controls: a "clear" icon to remove value from the input field
- Form and Controls: ability to differentiate between API and user changes
- Tabbar: ability to fine-tune the popup in detail

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_8_2.html)

Version 8.1 (December 2020)
==============================

### Major features

- New Report Manager widget
- Updates for Gantt widget

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_8_1.html)

Version 8.0 (October 2020)
==============================

### Major features

- New Scheduler widget
- New Gantt widget
- Updates for Spreadsheet
- Horizontal mode for Timeline
- ColorSelect and TimeBoard conrols
- Updated ColorBoard palette
- Overflow-Only tooltips
- Enhanced performance for Datatable header

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_8_0.html)

Version 7.4 (July 2020)
==============================

### Major features

- New Chat widget
- Advanced chart wizard for Spreadsheet
- Managing tags in Document Manager 
- Text and Excel file versioning in Document Manager
- Prompt window

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_7_4.html)

Version 7.3 (April 2020)
==============================

### Major features

- New Document Manager widget
- New Query widget
- Ability to embed Charts in Spreadsheet
- global filtering rules
- ability to cancel hide-on-escape behaviour for windows

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_7_3.html)

Version 7.2 (February 2020)
==============================

### Major features

- New File Manager widget
- Multi-column sorting for Datatable
- ExcelFilter for Datatable
- Customization API for Filter widget
- Export to PDF with styles

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_7_2.html)

Version 7.1.0 (December 2019)
==============================

### Major features

- Filter widget
- TextHighlight widget
- Improved behaviors on touch devices

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_7_1.html)


Version 7.0.0 (September 2019)
==============================

### Major features

- [Visual designer tool](https://designer.webix.com)
- Timeline widget
- Mention suggest widget
- Ability to hide/disable options and items across widgets

[Full list of changes and fixes](https://docs.webix.com/desktop__whats_new_7_0.html)


Version 6.4 (June 2019)
==================

### Major features

- .Net Core demos for major widgets
- AWS S3 backend for FileManager widget

### Minor features

- wjet cli tool update
- monthHeader property in the Calendar widget
- drag scroll during column drag-n-drop in the Datatable

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_6_4.html)


Version 6.3 (April 2019)
==================

### Major features

- Updated styling for buttons
- Optional fullscreen mode for all widgets
- Compatibility with SalesForce
- Promises for data saving operations
- Close buttons for Window widget

### Minor features

- Extended grouping functionality
- Unified API for Datatable column options
- Mentions in Comments widget
- Drag-n-drop events for dashboard
- Ability to style modal boxes

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_6_3.html)

Version 6.2 (February 2019)
==================

### Major features

- Tooltips are available for all widgets
- Ability to export charts and images to PDF
- Improved drag-n-drop
- webix.proxy, webix.alert and webix.confirm work with promises
- NodeJs backend for Spreadsheet and FileManager

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_6_2.html)

Version 6.1 (November 2018)
==================

### Major features

- Comments widget
- Major update for Kanban widget
- Full support of skins for all complex widgets
- NodeJs backend for package samples

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_6_1.html)

Version 6.0 (October 2018)
==================

### Major features

- New Material skin and its compact version
- ES6-based toolchain for code building
- Possibility to create a custom Webix build with necessary widgets both in GPL and PRO versions

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_6_0.html)

Version 5.4 (June 2018)
==================

### Major features

- GraphQL support
- Ability to draw various graphs in the Scatter Chart (points, lines, shapes)
- Handy interface for working with number formats in SpreadSheet
- WJet utility for faster prototyping with Webix Jet

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_5_4.html)

Version 5.3 (April 2018)
=================

### Major features

- Multiple updates and improvements in Webix SpreadSheet
- Enhanced compatibility of Jet views with Webix widgets
- Ability to select custom icon packs for stylesheets

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_5_3.html)

Version 5.2 (February 2018)
=================

### Major features

- Dynamic rendering for the List widget
- New Switch Button Form control
- Vertical mode and a moving title for the RangeSlider control
- The Sidebar widget is added to the main library
- New styling for the Pivot complex widget
- Improved performance of the Kanban Board complex widget

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_5_2.html)

Version 5.1 (November 2017)
================

### Major features

- Numeric format for inputs and numeric data editors
- Multiple selection in Calendar and DatePicker 
- GridLayout component 
- The gridlayout-based Dashboard widget 

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_5_1.html)

Version 5.0 (September 2017)
================

### New tools

- Webix Jet 1.0 


### Major features

- Hint widget
- GeoChart control
- Vertical slider control
- Export to Excel includes styles
- Export to CSV for all widgets
- Improved accessibility and keyboard navigation

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_5_0.html)


Version 4.4 (June 2017)
================

### Major features

- webix.print API
- Query Builder widget
- Demos for .Net, NodeJS and PHP

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_4_4.html)

Version 4.3 (April 2017)
================

### Major features

- BulletChart integration
- DoubleList and FormInput widgets
- compatibility with ReactJS

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_4_3.html)


Version 4.2 (February 2017)
================

### Major features

- VueJs integration
- ability to upload Folders
- export to CSV for all widgets

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_4_2.html)


Version 4.1 (November 2016)
================

### Major features

- Gage widget
- RichText widget
- Exra modes for charts

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_4_1.html)


Version 4.0 (September 2016)
================

### Major features

- ARIA compatibility
- Keyboard navigation for all widgets
- High-contrast theme
- DateRange control
- FlexLayout control
- Google Map control

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_4_0.html)


Version 3.4 (July 2016)
================

### Major features

- "Frozen" rows in Datatable
- Patterns for text inputs
- Area, Spline, Pie and Bar sparklines
- "Month" and "year" time pickers
- Webix Remote

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_3_3.html)


Version 3.3 (April 2016)
================

### Major features

- AbsLayout widget
- DataLayout widget
- sparklines for DataTable and TreeTable
- ability to use JSON payload in Ajax calls
- drag-n-drop on touch devices

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_3_3.html)


Version 3.2 (February 2016)
================

### Major features

- Spreadsheet widget
- Rangechart widget
- undo functionality
- export to PDF
- area selection

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_3_2.html)


Version 3.1
==============

### Major features

- SideMenu widget
- SideBar widget
- TreeMap widget
- autowidth for menu and buttons

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_3_1.html)


Version 3.0
==============

### New tools

- Visual editor
- Webix Jet frameworks

### Major features

- Excel viewer
- PDF viewer
- export to Excel
- export to PNG
- SubViews and SubGrids

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_3_0.html)


Version 2.5
==============

### Major features

- Support of Microsoft Edge
- Handling of complex data in Form widget
- Swimlanes in Kanban widget
- Total calculations in Pivot widget

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_2_5.html)


Version 2.4
==============

### Major features

- Portlet widget
- MultiCombo widget
- Range Slider widget
- Advanced validation messages for forms

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_2_4.html)


Version 2.3
============

### Major features

- New material skin
- Barcode widget
- Organogram (organization chart) widget
- Badges and icons for list, buttons and menus (and views based on them)
- "Today" and "Clear" buttons are added to the date editor.
- Better default styling, ability to customize layout configuration

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_2_3.html)


Version 2.2
================

### Major features
- Data binding for Tree, TreeTable and TreeCollection
- Optional Today and Clear buttons in the Calendar
- Ability to define file types for file uploader
- Webix.ajax api can be used to fetch binary data ( file downloading by ajax )
- Optional hover for rows in Datatable
- Improved scrolling on touch devices


[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_2_2.html)


Version 2.1
================

### Major features
- Better compatibility with Bootstrap and jQuery
- Icon font contains 479 icons now ( Font Awesome updated to 4.2 )
- "strict" mode for Webix
- Datatable and treetable math can be extended with custom functions
- Uploader can work in Internet Explorer 8

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_2_1.html)


Version 2.0
================

### Major features

- Promises API for all ajax operations
- Progress bars and overlays
- Icons and close button in tabbar
- Improved keyboard navigation
- Extra locales added
- Package includes source map files
- [pro] PRO edition includes Pivot component
- [pro] Multiselect and multitext inputs
- [pro] Advanced editors for DataTable and Property views
- [pro] Colspans and Rowspans in DataTable
- [pro] Column menu in DataTable
- [pro] Optional custom scrollbars
- [pro] Grouped columns in DataTable
- [pro] Advanced filters for DataTable


[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_2.html)


Version 1.10
================

### Major new features

- IE12 compatibility
- Column Batches in the DataTable

[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_1_10.html)


Version 1.9
================

### Major new features

- Hotkey for inputs
- HTML links in menu


[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_1_9.html)


Version 1.8
================

###Responsive Layouts and Tabbar

- Layout view can be hidden or moved if there's not enough space for them on the screen. [Check details](desktop/responsive_layout.md).
- Tabbar tabs can be moved to a related popup if there're not enoght space for them on the screen. [Check details](desktop/responsive_tabbar.md).


###Disabling dates in Calendar

Calendar dates can be disabled to prevent their selection. [Check details](desktop/calendar.md#blockdates).


### Breaking changes
 - webix.proxy.$callback was replaced with webix.ajax.$callback
 - adjustHeaders deprecated


[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_1_8.html)



Version 1.7
==============

### Breaking changes in API

Datatable.locate method returns object with "row" and "column" properties, in previous version result object has "row" and "col" properties respectfully.


### Default skin

Default skin changed to flat ( you still can use the old skin by using skins/air.css )  
Compact skin changed to flat theme as well ( old one renamed to skins/aircompact.css )  


### Improvments in API
- text sorting mode for Datatable
- autoheight property for "property" view
- ability to edit math formulas in the Datatable
- "touch" mode for multiselect


[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_1_7.html)



Version 1.6
==============

### Breaking changes in DataProcessor

Parameters of onBeforeSync, onAfterSync was changed  
onError event replaced with two new events - onBeforeSaveError and onAfterSaveError


### Improved support for mobile devices
- win8 touch support
- drag-n-drop on touch devices


### Improvments in Server side integrations
- full support of REST API
- data in components can be updated from server side
- client side code can't be broken by server side errors anymore
- ability to set custom headers for server side calls

### UI components
- better memory cleaning after component destruction
- improved API for complex forms


[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_1_6.html)



Version 1.5
-----------

### Improved support for mobile devices
- new skin for mobile UI
- functionality of desktop UI adapted to touch events and gestures

### Improvments in DataTable
- adjustRowHeight method added to Datatable
- fillspace can be used for multiple columsn
- richselect can be used as editor in the Datatable
- checkboxes can have checkValue and uncheckValue options
 
### Improvments in Angular and Backbone 

- [angular] webix-ui is compatible with ng-repeat
- [angular] webix-data works for options in combo and select
- [angular] init through angular directive links event handlers to the current scope

- [backbone] handling of reset event
- [backbone] handling of models with getters
- [backbone] WebixView is compatible with backbone 1.1
- [backbone] using sync with already loaded collection


[Full list of changes and fixes](http://docs.webix.com/desktop__whats_new_1_5.html)
	


Version 1.4
-----------

### Advanced data selection controls

- mutli-column select box
- rich content select box

### New Server Integrations

- loading and saving data through websockets
- loading and saving data through indexedDB

### Improvements in Window Positioning

- window can have complex relation size and position (details)
- window can be shown in fullscreen mode

### Others 

- autoConfig option for the Datatable
- dataprocessor tracks data moving events
- keyboard navigation for list component
- correct sizing of layout with hidden pannels
- elementsConfig supported for nested collections
- getSelection deprecated in favor of getSelectionId
- better styling for icon buttons
- webix.onReady event
- webix.ui.zindexBase property added
- different small fixes in UX and styling


Version 1.3
-----------
### New skins
- 6 new skins added

### Others
- video player component (ui.video) added
- API and look of carousel control improved
- charts can use logarithmic scale
- small fixes


Version 1.2
-----------

### Integration with AngularJS
- webix-ui directive to define webix views directly in HTML
- webix-show, webix-event, webix-data directives to link webix components and scope
- webix component can be used with angular data bindings

### Integration with Backbone

- webix components can load data from Backbone Collections
- webix components can save data back to Backbone Collections
- WebixView, that can be used as normal Backbone View
- Backbone Router can be used to alter Webix Layouts

### Others
- *setContent* method for template component
- *isolate* configuration property for layout components
- *onBeforeDropOut* event added
- more than 50 different fixes


Version 1.1
------------

### Server side integration 
- all components can save data through REST API
- offline and caching loading strategies
- custom data saving and data loading transports

### UI improvments

- "disabled" configuration options for all views ( including all form controls )
- webix.history can be used with multiview control
- per-submenu configuration is possible ( "config" property of menu item )
- improved visual filtering in treetable and tree

### API
- onViewResize event added
- "disabled" option added for all views
- ability to define XSS safe templates

### Fixes

- popup's visibility on iOS
- incorrect sizing of multiview and accordion
- incorrect behavior of drag-n-drop in Datatable
- setValue doesn't work for radio buttons



Version 1.0.2
--------------

### New functionality

- getText method for Datatable	
- lineMaxLimit parameter that cuts a line in "non-item" position
- ui.fullScreen solution for FF
- default size of resizer changed
- xml parse can recognize arrays	
- addView adds to the end of layout if index was not defined	
- skin updates, important flags removed where possible
- csrf key now sent through http headers

### Fixes

- IE ignores hotkeys
- IE8 doesn't generated dblClick events	
- IE8 sets invalid value after changing cell value with select editor
- minWidth and maxWidth settings from xml
- loading tree-like data from XML
- Datatable do not allow to define order of columns during export to pdf and excel
- incorrect remove action for local and session storage
- regression in layout rendering when views are added through addView
- dataprocessor and id change during binding	
- label align in segmented button 
- incorrect in-layout positions after showBatch call
- invalid animations in FF and Chrome



Version 1.0.1
--------------

### New functionality

- layouts are correctly shown when they are zoomed by a browser
- selectFilter can show data from the attached collections
- better strategy for x-layout rendering
- API calls against hidden items in menu
- init from html|xml markup improved
- dataprocessor can have different urls for different action
- value attribute for tabview
- getTopParentView method added for all views 
- getPopup method added to the datepicker
- setHTML method added to the label
- setValue and getValue methods added to the multiview


### Fixes

- invalid size and focus of popup editors
- toggle button ignores inputWidth settings
- regression in treetable checkbox behavior
- regression in Datatable markup parsing
- conflict between data and content properties of template
- row markers are not removed during clearAll
- mulitiview with no animation
- chart rendering in multiview (no animation case)
- label position in pie chart
- validation and htmlform control
- incorrect column autosizing in case of hidden container
- native selection during cell resize
- hideItem throws an error for menu's item which was already hidden
- incorrect handling of custom popups in editors
- sizing of scrollview was broken
- window ignores y parameter of show command
- dnd in tree as child
