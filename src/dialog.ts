import type {
  Celestial,
  Page_DialogType,
  Page_javascriptDialogOpening,
} from "../bindings/celestial.ts";

/** The type of the dialog. */
export type DialogType = Page_DialogType;

/**
 * Dialog provides an api for managing a page's dialog events.
 */
export class Dialog {
  #celestial: Celestial;

  /**
   * The default value of the prompt, or an empty string if the dialog is not a prompt.
   */
  readonly defaultValue: string;

  /**
   * The message displayed in the dialog.
   */
  readonly message: string;

  /**
   * The type of the dialog.
   */
  readonly type: DialogType;

  constructor(celestial: Celestial, config: Page_javascriptDialogOpening) {
    this.#celestial = celestial;
    this.defaultValue = config.defaultPrompt ?? "";
    this.message = config.message;
    this.type = config.type;
  }

  /**
   * Returns when the dialog has been accepted.
   *
   * @param promptText A text to enter in prompt. Does not cause any effects if the dialog's type is not prompt. Optional.
   */
  async accept(promptText?: string) {
    await this.#celestial.Page.handleJavaScriptDialog({
      accept: true,
      promptText,
    });
  }

  /**
   * Returns when the dialog has been dismissed.
   */
  async dismiss() {
    await this.#celestial.Page.handleJavaScriptDialog({
      accept: false,
    });
  }
}
