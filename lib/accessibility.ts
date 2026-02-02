import { type RefObject } from 'react';
import { findNodeHandle, AccessibilityInfo } from 'react-native';

/**
 * Move screen reader focus to a component. Use after navigation or content
 * changes so users land on the new content instead of the top of the screen.
 */
export function setAccessibilityFocus (
  ref: RefObject<unknown>
): void {
  const node = ref?.current;
  if (node == null) return;

  const tag = findNodeHandle(node as never);
  if (tag != null) {
    AccessibilityInfo.setAccessibilityFocus(tag);
  }
}

/**
 * Announce a message to screen reader users (e.g. after tab or content change).
 */
export function announceForAccessibility (message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}
