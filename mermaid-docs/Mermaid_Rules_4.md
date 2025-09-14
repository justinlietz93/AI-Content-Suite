## 4. Styling and Theming Directives

### 4.1 Styling Engine
*   The entry point for the styling engine is `src/styles.js`. The `getStyles` function within `src/styles.js` is invoked by Mermaid for style application.
*   **Color Representation:** The theming engine recognizes hex colors (e.g., `#ff0000`). Color names (e.g., `red`) are not supported, except for explicit `rgb()` or `rgba()` syntax for Sequence diagram `rect` blocks.

### 4.2 Theme Customization
*   Only the `base` theme is directly customizable.
*   Custom themes are created by modifying `themeVariables` via frontmatter configuration.
*   Color options and values are defined in `src/theme/theme-[xyz].js`.

### 4.3 Node and Link Styling
*   **Direct Styles:** Apply specific styles to a node or link using `style <nodeId> <styleList>` or `linkStyle <linkNumber> <styleList>`. Multiple nodes/links can be styled by listing their IDs/numbers.
*   **Style Classes:**
    *   Define reusable style classes with `classDef <className> <styleList>`. Multiple classes can be defined per `classDef`.
    *   Attach a class to a node/link using `class <nodeId> <className>` or `class <nodeId1>,<nodeId2> <className>`.
    *   Shorthand syntax: `nodeId:::className`. Multiple classes: `nodeId:::className1,className2`.
*   **Styling Priority:** Specific direct styles supersede class styles, which in turn supersede theme styles. A class named `default` applies to all nodes lacking specific class definitions; custom styles and specific classes override these defaults.

### 4.4 Styling Limitations
*   Notes and namespaces in Class diagrams do not support individual styling, though they respect themes.
*   The `:::` class shorthand cannot be used concurrently with a relation statement in Class diagrams.
*   `classDef` styles, when applied via `class` or `:::`, cannot target start/end states or states within composite states in Requirement or State diagrams.

### 4.5 Diagram-Specific Theme Variables
*   **GitGraph:** `git0` to `git7` for branch colors; `gitBranchLabel0` to `gitBranchLabel7` for branch label colors; `commitLabelColor`, `commitLabelBackground`, `commitLabelFontSize`, `tagLabelFontSize`, `tagLabelColor`, `tagLabelBackground`, `tagLabelBorder`; `gitInv0` to `gitInv7` for highlight commit colors. Supports up to 8 branches before cyclic color repetition.
*   **Radar:** Color scales `cScale${i}` for curves (where `i` is from 0 to the theme's maximum); specific options under the `radar` key within `themeVariables` (e.g., `radar: axisColor: "#FF0000"`).
*   **Timeline:** `cScale0` to `cScale11` for section/time-period background colors; `cScaleLabel0` to `cScaleLabel11` for foreground colors. Colors repeat after 12 sections.
*   **XY Chart:** Variables under the `xyChart` attribute (e.g., `xyChart: titleColor: '#ff0000'`). `plotColorPalette: '#color1, #color2, ...'` defines colors sequentially for lines and bars.
