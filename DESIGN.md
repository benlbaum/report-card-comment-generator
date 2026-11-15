---
name: Report Card Comment Builder
description: A focused writing desk for teachers composing report card comments.
colors:
  ink: "#302b36"
  muted: "#6b6471"
  plum: "#4d385d"
  plum-hover: "#3b2849"
  plum-tint: "#f0e9f4"
  brass: "#b78836"
  line: "#dfdbe3"
  canvas: "#f6f3f7"
  paper: "#ffffff"
  danger: "#a12e35"
  focus: "#9c742b"
  field-border: "#b9b2c0"
  draft-highlight: "#e0cbe9"
  done-background: "#e0efe6"
  done-text: "#2c6545"
  draft-background: "#fbefcf"
  draft-text: "#795812"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  section:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.55
  helper:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
  metadata:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  badge: "4px"
  control: "6px"
  surface: "8px"
  dialog: "12px"
spacing:
  tight: "6px"
  small: "8px"
  control-gap: "10px"
  compact: "12px"
  standard: "16px"
  section: "20px"
  roomy: "24px"
  medium-gutter: "28px"
  large: "32px"
  workspace-gutter: "28px"
  page-gutter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.plum-hover}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.plum}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
    typography: "{typography.label}"
  button-text:
    textColor: "{colors.plum}"
    padding: "6px 0"
    typography: "{typography.label}"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    typography: "{typography.body}"
  navigation:
    textColor: "{colors.muted}"
    padding: "10px 0 8px"
    typography: "{typography.label}"
  group-tab:
    textColor: "{colors.muted}"
    padding: "12px 0 10px"
    typography: "{typography.label}"
  status:
    rounded: "{rounded.badge}"
    padding: "3px 8px"
  writing-surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px 28px"
  phrase-option:
    rounded: "{rounded.control}"
    padding: "16px"
  phrase-option-selected:
    backgroundColor: "{colors.plum-tint}"
    rounded: "{rounded.control}"
    padding: "16px"
  live-draft:
    backgroundColor: "{colors.plum-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "18px 20px"
---

# Design System: Report Card Comment Builder

## Overview

**Creative North Star: "Focused writing desk"**

The Focused writing desk is a calm, practical writing environment. A compact plum masthead anchors white work surfaces on lavender-white canvas; brass is a small orientation cue. Familiar system sans keeps attention on student names and complete phrases.

The built interface uses restrained underlines, visible field boundaries, and tonal selection states. Its personality comes from proportion, whitespace, and useful text rather than decorative imagery. There are no shipping raster assets.

**Key Characteristics:**
- Compact, sentence-case hierarchy.
- White editing surfaces with plum interaction states.
- Quiet underline navigation and clearly bounded controls.
- Tonal draft feedback with a distinct final writing surface.

## Colors

Muted plum and brass provide orientation against soft lavender neutrals. The frontmatter holds the normative values.

### Primary
- **Plum:** masthead, primary buttons, active navigation text, caret, and radio accent.
- **Deep plum:** primary hover and text-action hover.
- **Plum tint:** chosen phrase, live draft, and import preview surfaces.

### Secondary
- **Brass:** selected broad writing-group underline. The darker focus token supplies the visible keyboard outline.
- **Danger:** destructive text actions and over-limit counts.
- **Progress tones:** green done and warm gold draft badges; each keeps an explicit text label.

### Neutral
- **Lavender-white canvas:** the outer application ground.
- **White paper:** workspace, editing controls, overview, phrase bank, and dialog interiors.
- **Ink / muted:** principal text and subordinate instructions or metadata.
- **Line / field border:** quiet surface dividers and stronger input boundaries.
- **Draft highlight:** the active topic's sentence inside the tinted live draft.

**The Brass Orientation Rule.** Use brass for the selected writing-group underline; keep primary actions and selected text plum.

## Typography

**Body and heading font:** the platform system sans stack from the frontmatter. There is no separate display face or large display role.

The hierarchy is compact and sentence case. Weight, tighter heading tracking, and spacing carry emphasis; full phrases remain ordinary readable text.

### Hierarchy
- **Headline:** application title; overview and phrase-bank page headings also use its size, retaining their heading line-height.
- **Title:** writing and final-comment headings.
- **Section:** live-draft and row subheadings.
- **Body:** general copy and final editor. Final-editor line-height is more open (1.7).
- **Label:** field labels, navigation, and semibold buttons. Phrase choices and draft copy use the same size with regular weight.
- **Helper / metadata:** instructions, save status, counts and status text. Counts use tabular numerals where appropriate.

Paragraphs have an observed maximum width (72ch). At the medium breakpoint the application title steps down (1.25rem); at the narrow breakpoint it becomes (1.125rem), while writing section headings become (1.25rem).

**The Readable Phrase Rule.** Show full phrases in wrapping text, with text labels and native radio state supporting the selected tint.

## Layout

The centered application is bounded (1440px), with desktop page gutters from the frontmatter. The masthead and white main navigation extend through those gutters. The writing workspace has two top-aligned columns in a (1.1fr / 1fr) ratio, a workspace gutter, and a fine dividing line. The right comment column is sticky from (1100px), with a top offset (24px).

At widths up to (1100px), page gutters reduce to the medium-gutter step, workspace padding becomes (24px). The topic navigation stays on one row at every breakpoint, using narrower equal-width buttons on phones. At widths up to (800px), the workspace becomes one column: selections precede draft and final editor, separated by a horizontal rule. Gutters reduce to (18px) and main surfaces use padding (20px). At widths up to (480px), outer gutters become compact, surfaces use padding (18px 16px), overview filters stack and the student editor scrolls horizontally within its list, and phrase padding becomes (14px).

Class overview uses compact single rows: clickable student name, progress badge, wrapped full comment or topic entry. Names are native text buttons that open the student’s comment and focus the final editor; there is no separate Open button. Long names use ellipses; comments retain line breaks and wrap within their column. On narrow screens the full comment appears below the name and progress. Topic-editing rows scroll horizontally within the list to keep their controls on one row.

Spacing is pragmatic rather than a strict mathematical scale: compact gaps separate related controls, standard-to-roomy gaps separate groups, and the larger steps define work-area boundaries. Controls and text wrap within their columns. The phrase bank keeps a sticky white save bar at the bottom of its area; dialogs scroll within the viewport.

## Elevation & Depth

Tonal layering, white surfaces, and thin dividers provide normal depth. Main work surfaces have no shadow. Dialogs sit over a translucent plum-black backdrop; toasts lift only enough to separate feedback from content.

### Shadow Vocabulary
- **Dialog:** (`0 18px 60px #00000040`).
- **Toast:** (`0 6px 24px #00000030`).

**The Flat Desk Rule.** Keep work surfaces flat. Reserve cast shadows for dialogs and transient toast feedback.

## Shapes

Forms are gently rectangular: controls, phrase choices, and draft panels share the control radius; main surfaces use the surface radius; dialogs use the dialog radius. Badges are compact rounded rectangles rather than pills. Ordinary fields and phrase rows have thin borders (1px). Selected navigation is a flat underline (3px), with square tab geometry. Native radio controls are small circles (17px).

## Components

### Buttons

Compact semibold text actions have a minimum height (42px), the control radius, and the frontmatter padding. Primary buttons are plum with white text; secondary buttons are white with plum text and a muted border. Secondary hover adds plum tint; active adds a deeper lavender fill. Text actions are underlined with an offset (4px), thickening on hover. Disabled buttons reduce opacity (.45). The masthead share button is white with plum text.

Keyboard focus is an external outline (3px) offset (3px); inside the plum masthead the outline is pale gold (`#efd08c`). The draft's secondary action is deliberately smaller (36px minimum height), matching its subordinate role.

### Cards / Containers

The large white writing surface is a shared work area rather than a repeated card grid. Overview and phrase bank use the same white surface and surface radius. Dividers organize content internally; ordinary surfaces remain flat. Live draft and import preview use the plum tint and control radius.

### Inputs / Fields

Native inputs, selects, and textareas use white interiors, the field-border token, control radius, and frontmatter padding. Hover strengthens the boundary (`#8c7e96`); focus uses the global outline. Textareas resize vertically. The final editor is at least (250px) high. Labels sit above fields with a tight gap. Student details are edited in the separate Student roster tab beside Phrase bank. The writing screen contains only an Edit student details link, which opens and focuses the selected student’s full-name field. Names, preferred names, pronouns, and progress autosave without rerendering the active input or overwriting final comments. Pronoun choices include standard and neopronoun presets plus a validated custom X/Y input. Add student is available at the top and as a plus button below the last row; Class overview always returns to the comments view.

Where customizable selects are supported, select menus are anchored outside their fields with a (6px) gap. They choose the side with more space, stay within the viewport, and scroll long option lists. The native select, keyboard behavior, and change events are preserved. Other browsers retain their standard select rendering. Menus use the surface radius and a neutral overlay shadow (`0 8px 24px #00000030`).

Bank option rows contain a single phrase textarea, Up/Down controls, and Remove action on one line on desktop. The phrase textarea fills the space up to the actions; there is no separate label field. The action controls wrap below the phrase on phones. Textareas fill the available page width. Their default is one line with minimum height (44px) and line-height (1.5). The boxes automatically grow and shrink to fit wrapped text while editing and when the page width changes; vertical resizing remains available.

### Navigation

White main navigation uses muted semibold labels, plum selected text, and a plum bottom border. Its links have minimum height (48px); the class count badge hides on narrower layouts. All writing topics are available in one native dropdown, without group tabs. Class overview and phrase bank also choose topics with native selects.

### Phrase Choices

Full-width radio rows are bordered, wrapping, and comfortably padded. Hover adds a faint lavender wash; a chosen row uses plum tint and a darker border. The skip option uses the same padding, border, hover, and selected styling as every other choice. Only phrase background and border colors animate (160ms ease-out), and only when reduced motion is not requested.

### Live Draft and Final Editor

The live draft is a tinted inset with plum heading and a stronger highlight behind the active topic's sentence. Long draft text scrolls after (230px); it retains whitespace and wraps long content. The white final textarea remains visually and behaviorally independent: phrase choices update the live draft, while “Use draft” explicitly transfers it into the final editor. Existing final text requires replacement confirmation.

### Status and Feedback

Not started, Draft, and Done appear as text-bearing badges, with warm and green progress variants. Warnings are warm tinted text panels, destructive actions use danger text, and toast feedback is white text on plum. Dialogs use rounded white panels (620px maximum width; smaller confirmation and category dialogs use 460px), bounded height, and the dialog shadow.

## Do's and Don'ts

### Do:
- Do use the existing plum, brass, lavender-white, and white roles.
- Do keep navigation quiet and selected states visibly distinct.
- Do show full phrases and preserve a separate final editor.
- Do retain visible keyboard focus and reduced-motion behavior.

### Don't:
- Don't restore rainbow category colors.
- Don't expand every phrase category into a competing tab.
- Don't add decorative raster imagery or shadows to ordinary work surfaces.

## Compact copy

Main working views omit repetitive instructions and the footer. Student labels remain available to assistive technology. Phrase-token help is collapsed behind a disclosure; sharing, import, and confirmation text retains the information needed to understand file contents or destructive changes.

Student roster places its editable class name and Start a new class action in the top toolbar, with Export roster, Import roster, and Add student. Roster import previews new and duplicate students in a tinted inline panel, with Add students to class, Start class from roster, and Cancel actions. Adding keeps existing work; starting a class requires confirmation. Both support Undo, and incoming files supply identities only. Export is disabled when there are no named students. Class overview shows the class name as a read-only heading and has only Export comments in its header. The student list has no settings area below it. The toolbar wraps on narrow screens while keeping class controls together.

Previous and Next are matching buttons to the right of the topic dropdown. The two button columns have equal fixed widths, while the dropdown fills the left; all controls are 42px high. The topic count shares the label line. Their positions do not depend on the number or length of phrase options. Clicking either preserves keyboard focus on that action without scrolling; at the first or last topic, unavailable navigation stays visible and disabled.

The writing workspace matches the header's outer width. Student selection and Edit details sit together on the left of the student row, with matching Previous/Next buttons aligned to the right of the section. The topic row sits below, with no group tabs. Student and topic dropdowns share the same width, with identical Previous/Next button columns to their right. Edit details is right-aligned on the Student label row. Student and topic counters appear beside their labels. The repeated heading and progress are available to assistive technology without taking visual space. The workspace starts directly below the main navigation without an outer gap.

The Student roster tab provides a compact Remove action per student. Removing a student requires confirmation and supports Undo, including restoration of saved comments and phrase selections.


## Phrase bank

Topics have two entry types: Selection (labeled phrase choices) or Value Entry (an optional number/text field). Older phrase/dropdown types normalize to Selection. Value topics use their topic name as the entry label and configure number/text format, unit, optional bounds, and a matching phrase with [Value]. There is no separate Entry label field. Fluency is one configurable topic with percent defaults; it is absent from student details. Older phrases and selected [Score] templates remain compatible. Empty value entries skip their topic. Topic order controls draft order; option reordering preserves selected phrase identity.

Phrase bank opens to a flat list of every topic, with aligned Name, Entry type, and Options / value columns. Each row has a six-dot drag handle on the left and an Edit button on the right. Selection rows show an option count; Value Entry rows show number/text format, units, and configured limits. On narrow screens each row becomes a name with wrapping metadata beneath it, retaining its handle and Edit button without horizontal scrolling.

Edit opens the existing topic editor; Back to phrase bank returns to the list and focuses the corresponding Edit button. Pending edits survive this navigation. New topics open directly in the editor; removal returns to the list, including a useful empty state when no topics remain. An invalid topic name keeps the editor open with its inline error. Previous/Next and the topic dropdown remain inside the editor with a visible position counter. Both topics in the list and phrase options in the editor reorder directly using left handles. Pointer dragging supports mouse/touch, previews the insertion point, and applies on release; Escape or pointer cancellation leaves the order unchanged. Focused handles support Up/Down arrow keys and announce the new position. Saving commits all pending edits and ordering; no separate Change order window is needed.

The dark primary Export comments button is available in overview; there is no Generate all drafts action. Successful local saves have no header status line. The full-width Undo notice meets the navigation without an outside gap and hides after six seconds. Hover does not pause dismissal; keyboard focus inside the notice pauses it until focus leaves.


Bank header actions export/import only the bank definitions and configuration. Import previews offer Add new topics (existing names are kept) or Replace bank; replacement remains staged until Save bank and supports Undo afterward. Student identities and final comments are excluded from bank exports and unchanged by import. A bank can also be extracted from an older class backup.

A full-width divider below the topic and entry-type controls separates configuration from the definition. Configured units appear as an attached suffix next to value inputs and accompany value tokens in generated phrases; a literal unit already following the token is not repeated.

The bank keeps Topic name, Entry type, Remove topic, and value configuration visible, with no collapse control. A full-width divider below topic navigation separates these settings from the dropdown. Another divider separates settings from a Phrases or Matching phrase heading and the editor. Phrase tokens sit beside that heading. Wide, growing phrase boxes sit between a compact drag handle and one quiet Remove action. Export and Import use quieter text buttons in the header. The save bar stays in normal page flow on narrow screens so it cannot cover fields.

Names are edited in the pending bank and committed with Save bank. Inline validation rejects blank, reserved, or duplicate names beside the visible name field. Renaming preserves topic order and migrates student selections and entered values to the new name; Undo restores the previous state.

Back to phrase bank is a bordered button with a left-arrow SVG and plum-tinted background above the topic controls. Its explicit destination, semibold label, and 42px target distinguish it from secondary text links while retaining the primary emphasis on Save bank.

Main navigation groups Student roster and Phrase bank together on the right. Roster setup always shows the full class; comment review can filter by progress. Student-name search boxes are omitted to conserve space. The main Edit details link opens the roster and focuses the selected student. On phones the four navigation labels wrap within a single row, and the roster table scrolls inside its own region.

Student roster places a Sort students action dropdown beside the student count. First name, last name, and preferred name sort A–Z, with blank rows last and first-name fallback for missing preferred names. Sorting changes the saved class order, preserves the current student and all work, and offers Undo. The dropdown returns to its prompt after applying a sort so subsequent edits do not imply automatic re-sorting.
