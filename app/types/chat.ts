export interface ChatMessageMetadata {
  /**
   * Optional text override for UI rendering.
   * The underlying message parts still contain the original content
   * so parsers and the workbench can react to artifacts/actions.
   */
  displayText?: string;

  /**
   * When true, the chat timeline will skip rendering this message.
   * Useful for system-only messages.
   */
  hidden?: boolean;
}
