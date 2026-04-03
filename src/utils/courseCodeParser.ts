/**
 * ============================================================
 * courseCodeParser.ts — Course Code Parsing & Formatting Utilities
 * ============================================================
 *
 * Architectural Role:
 *   This module parses structured course and session codes to extract
 *   human-readable metadata for display in the UI. Course codes encode
 *   course info (e.g., "CBT101" = Cognitive Behavioral Therapy, course 101).
 *   Session codes append module/type info (e.g., "CBT101M1L" = Module 1 Lesson).
 *
 * Code Structures:
 *   - Course codes: "{Prefix}{Number}" e.g., "CBT101", "ACT201"
 *   - Session codes (course intro): "{CourseCode}INT" e.g., "CBT101INT"
 *   - Session codes (module): "{CourseCode}M{ModuleNumber}{Type}" e.g., "CBT101M1L"
 *     - Type: L (Lesson) or P (Practice)
 *
 * Design Patterns:
 *   - String Parsing: Uses regex pattern matching to extract module number
 *     and session type from session codes.
 *   - Formatting: String interpolation for display output.
 *   - Map/Dictionary: SESSION_TYPE_MAP translates single-char type codes
 *     to human-readable labels (L -> "Lesson", P -> "Practice").
 *
 * Consumed By:
 *   Course screens and listening history UI to display course metadata.
 * ============================================================
 */

/**
 * Session type discriminator: Lesson or Practice.
 */
type SessionType = 'L' | 'P';

/**
 * Map: single-char session type to display label.
 *
 * Used in parseSessionCode to convert 'L' -> 'Lesson', 'P' -> 'Practice'.
 */
const SESSION_TYPE_MAP: Record<SessionType, string> = {
  L: 'Lesson',
  P: 'Practice',
};

/**
 * Parse a session code to extract human-readable module info
 * 
 * @param sessionCode - The session code (e.g., "CBT101M1P")
 * @param courseCode - The course code (e.g., "CBT101")
 * @returns Human-readable string (e.g., "Module 1 Practice")
 * 
 * @example
 * parseSessionCode("CBT101INT", "CBT101") // "Course Intro"
 * parseSessionCode("CBT101M1L", "CBT101") // "Module 1 Lesson"
 * parseSessionCode("CBT101M1P", "CBT101") // "Module 1 Practice"
 * parseSessionCode("ACT201M3P", "ACT201") // "Module 3 Practice"
 */
export function parseSessionCode(sessionCode: string, courseCode: string): string {
  if (!sessionCode || !courseCode) {
    return '';
  }

  // Extract the suffix after the course code
  const suffix = sessionCode.replace(courseCode, '');
  
  if (!suffix) {
    return '';
  }

  // Handle Course Intro
  if (suffix === 'INT') {
    return 'Course Intro';
  }

  // Parse module pattern: M1L, M2P, M10L, etc.
  const moduleMatch = suffix.match(/M(\d+)([LP])?$/);
  
  if (!moduleMatch) {
    // Unknown pattern - return empty or raw suffix
    return '';
  }

  const moduleNumber = moduleMatch[1];
  const typeChar = moduleMatch[2] as SessionType | undefined;

  const modulePart = `Module ${moduleNumber}`;
  const typePart = typeChar ? SESSION_TYPE_MAP[typeChar] : '';

  return [modulePart, typePart].filter(Boolean).join(' ');
}

/**
 * Format a course code for display (adds space before numbers)
 * 
 * @param courseCode - The course code (e.g., "CBT101")
 * @returns Formatted display string (e.g., "CBT 101")
 * 
 * @example
 * formatCourseCode("CBT101") // "CBT 101"
 * formatCourseCode("ACT201") // "ACT 201"
 */
/**
 * Format a course code for display.
 *
 * Inserts a space between the prefix and number for readability.
 * Example: "CBT101" -> "CBT 101"
 *
 * Regex breakdown: (\D+)(\d+) matches letters followed by digits.
 * Replacement: $1 $2 inserts a space between captured groups.
 *
 * @param courseCode - The course code (e.g., "CBT101", "ACT201")
 * @returns Formatted string with space before digits (e.g., "CBT 101")
 */
export function formatCourseCode(courseCode: string): string {
  if (!courseCode) {
    return '';
  }

  return courseCode.replace(/(\D+)(\d+)/, '$1 $2');
}

/**
 * Build the complete meta info string for a session
 * 
 * @param sessionCode - The session code (e.g., "CBT101M1P")
 * @param courseCode - The course code (e.g., "CBT101")
 * @returns Complete meta string (e.g., "CBT 101 · Module 1 Practice")
 */
export function buildSessionMetaInfo(sessionCode: string, courseCode: string): string {
  if (!sessionCode || !courseCode) {
    return '';
  }

  const formattedCourseCode = formatCourseCode(courseCode);
  const parsedSessionInfo = parseSessionCode(sessionCode, courseCode);

  if (!parsedSessionInfo) {
    return formattedCourseCode;
  }

  return `${formattedCourseCode} · ${parsedSessionInfo}`;
}
