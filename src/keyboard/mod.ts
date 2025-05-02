import type { Celestial } from "../../bindings/celestial.ts";
import {
  KEY_DEFINITIONS,
  type KeyDefinition,
  type KeyInput,
} from "./layout.ts";

/** Options for typing on the keyboard */
export interface KeyboardTypeOptions {
  delay?: number;
}

/** Options for pressing a key down */
export interface KeyDownOptions {
  text?: string;
}

/** Options for pressing a key */
export interface KeyPressOptions extends KeyDownOptions {
  delay?: number;
}

export interface KeyboardPageData {
  modifiers: number;
}

/**
 * Keyboard provides an api for managing a virtual keyboard. The high level api is `Keyboard.type()`, which takes raw characters and generates proper `keydown`, `keypress`/`input`, and `keyup` events on your page.
 */
export class Keyboard {
  #celestial: Celestial;
  #pageData: KeyboardPageData;
  #pressedKeys = new Set<string>();

  constructor(celestial: Celestial, pageData?: KeyboardPageData) {
    this.#celestial = celestial;
    this.#pageData = pageData || { modifiers: 0 };
  }

  /**
   * Returns the modifier bit for a given key
   */
  #modifierBit(key: string): number {
    if (key === "Alt") return 1;
    if (key === "Control") return 2;
    if (key === "Meta") return 4;
    if (key === "Shift") return 8;
    return 0;
  }

  /**
   * Gets key description including code, key, text, and keyCode
   */
  #getKeyDescription(key: KeyInput): KeyDefinition {
    const shift = this.#pageData.modifiers & 8;
    const description: KeyDefinition = {
      key: "",
      keyCode: 0,
      code: "",
      text: "",
      location: 0,
    };

    // Get definition from your keyboard layout
    const definition = KEY_DEFINITIONS[key];

    if (!definition) {
      throw new Error(`Unknown key: "${key}"`);
    }

    if (definition.key) {
      description.key = definition.key;
    }
    if (shift && definition.shiftKey) {
      description.key = definition.shiftKey;
    }

    if (definition.keyCode) {
      description.keyCode = definition.keyCode;
    }
    if (shift && definition.shiftKeyCode) {
      description.keyCode = definition.shiftKeyCode;
    }

    if (definition.code) {
      description.code = definition.code;
    }

    if (definition.location) {
      description.location = definition.location;
    }

    if (description.key && description.key.length === 1) {
      description.text = description.key;
    }

    if (definition.text) {
      description.text = definition.text;
    }
    if (shift && definition.shiftText) {
      description.text = definition.shiftText;
    }

    // If any modifiers besides shift are pressed, no text should be sent
    if (this.#pageData.modifiers & ~8) {
      description.text = "";
    }

    return description;
  }

  /**
   * Dispatches a `keydown` event and updates modifier state.
   */
  async down(key: KeyInput, options: KeyDownOptions = {}) {
    const description = this.#getKeyDescription(key);

    const autoRepeat = this.#pressedKeys.has(description.code || "");
    if (description.code) this.#pressedKeys.add(description.code);
    if (description.key) {
      this.#pageData.modifiers |= this.#modifierBit(description.key);
    }

    const text = options.text === undefined ? description.text : options.text;

    await this.#celestial.Input.dispatchKeyEvent({
      type: text ? "keyDown" : "rawKeyDown",
      modifiers: this.#pageData.modifiers,
      windowsVirtualKeyCode: description.keyCode,
      code: description.code,
      key: description.key,
      text: text,
      unmodifiedText: text,
      autoRepeat,
      location: description.location,
      isKeypad: description.location === 3,
    });
  }

  /**
   * Dispatches a `keyup` event and updates modifier state.
   */
  async up(key: KeyInput) {
    const description = this.#getKeyDescription(key);

    if (description.key) {
      this.#pageData.modifiers &= ~this.#modifierBit(description.key);
    }
    if (description.code) this.#pressedKeys.delete(description.code);

    await this.#celestial.Input.dispatchKeyEvent({
      type: "keyUp",
      modifiers: this.#pageData.modifiers,
      windowsVirtualKeyCode: description.keyCode,
      key: description.key,
      code: description.code,
      location: description.location,
    });
  }

  /**
   * Dispatches a `keypress` and `input` event. This does not send a `keydown` or `keyup` event.
   */
  async sendCharacter(char: string) {
    await this.#celestial.Input.insertText({ text: char });
  }

  /**
   * Shortcut for `Keyboard.down()` and `Keyboard.up()`.
   */
  async press(key: KeyInput, options: KeyPressOptions = {}) {
    const delay = options.delay;
    await this.down(key, options);
    if (delay) {
      await new Promise((f) => setTimeout(f, delay));
    }
    await this.up(key);
  }

  /**
   * Sends a `keydown`, `keypress`/`input`, and `keyup` event for each character in the text.
   */
  async type(text: string | KeyInput[], options: KeyboardTypeOptions = {}) {
    const delay = options.delay;
    for (const char of text) {
      const key = char as KeyInput;
      if (key in KEY_DEFINITIONS) {
        await this.press(key, { delay });
      } else {
        if (delay) {
          await new Promise((f) => setTimeout(f, delay));
        }
        await this.sendCharacter(char as string);
      }
    }
  }
}
