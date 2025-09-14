
## 5. General Diagram Syntax and Formatting

### 5.1 Diagram Declaration
*   All diagram definitions *must* commence with a declaration of the diagram type (e.g., `flowchart`, `sequenceDiagram`), with the exception of Frontmatter configurations.

### 5.2 Comments
*   Comments *must* occupy their own line and be prefixed with `%%`. All text following `%%` to the next newline is considered a comment. Avoid curly braces (`{}`) within `%%` comments.
*   ZenUML diagrams utilize `// comment`. These comments render above messages or fragments and support Markdown.

### 5.3 Special Characters and Escaping
*   Enclose text containing problematic characters (e.g., parentheses, square brackets) in double quotes: `id1["This is the (text) in the box"]`.
*   Escape characters using HTML entity codes (e.g., `#9829;` for a heart). Entity code numbers are base 10 (e.g., `#35;` for `#`). HTML character names are also supported.
*   To embed a semicolon within Sequence diagram message text, use `#59;`.

### 5.4 Markdown Formatting
*   Bold text: double asterisks (`**`).
*   Italic text: single asterisks (`*`).
*   Line breaks: `\n` or `<br/>` within markdown strings, notes, and messages.
*   Unicode text is generally supported, often requiring enclosure in double quotes: `id["This ❤ Unicode"]`.

### 5.5 Syntax Error Handling
*   Unknown words and misspellings within diagram definitions will cause diagram breakage.
*   Parameters in directives or frontmatter that are badly formed will silently fail or be ignored.
*   Detection of a keyword within unquoted user input in Requirement diagrams will result in a parser failure.

### 5.6 Mathematical Expressions (v10.9.0+)
*   Mathematical expressions *must* be delimited by `$$`.
*   Math rendering is currently supported exclusively for Flowcharts and Sequence diagrams.

### 5.7 Diagram Direction/Orientation
*   Many diagram types support a `direction` statement (e.g., `direction TB|BT|RL|LR`) to define their overall layout orientation. Supported values are diagram-specific.
