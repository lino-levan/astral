import type { Celestial } from "../bindings/celestial.ts";

// Modifier bit flags
const enum Modifiers {
  None = 0,
  Alt = 1,
  Control = 2,
  Meta = 4,
  Shift = 8,
}

// Map of modifier keys to their corresponding bit flags
const MODIFIER_MAP = new Map<KeyInput, Modifiers>([
  ["Alt", Modifiers.Alt],
  ["AltLeft", Modifiers.Alt],
  ["AltRight", Modifiers.Alt],
  ["Control", Modifiers.Control],
  ["ControlLeft", Modifiers.Control],
  ["ControlRight", Modifiers.Control],
  ["Meta", Modifiers.Meta],
  ["MetaLeft", Modifiers.Meta],
  ["MetaRight", Modifiers.Meta],
  ["Shift", Modifiers.Shift],
  ["ShiftLeft", Modifiers.Shift],
  ["ShiftRight", Modifiers.Shift],
]);

// https://pptr.dev/api/puppeteer.keyinput
/** Valid keys. */
export type KeyInput =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "Power"
  | "Eject"
  | "Abort"
  | "Help"
  | "Backspace"
  | "Tab"
  | "Numpad5"
  | "NumpadEnter"
  | "Enter"
  | "\r"
  | "\n"
  | "ShiftLeft"
  | "ShiftRight"
  | "ControlLeft"
  | "ControlRight"
  | "AltLeft"
  | "AltRight"
  | "Pause"
  | "CapsLock"
  | "Escape"
  | "Convert"
  | "NonConvert"
  | "Space"
  | "Numpad9"
  | "PageUp"
  | "Numpad3"
  | "PageDown"
  | "End"
  | "Numpad1"
  | "Home"
  | "Numpad7"
  | "ArrowLeft"
  | "Numpad4"
  | "Numpad8"
  | "ArrowUp"
  | "ArrowRight"
  | "Numpad6"
  | "Numpad2"
  | "ArrowDown"
  | "Select"
  | "Open"
  | "PrintScreen"
  | "Insert"
  | "Numpad0"
  | "Delete"
  | "NumpadDecimal"
  | "Digit0"
  | "Digit1"
  | "Digit2"
  | "Digit3"
  | "Digit4"
  | "Digit5"
  | "Digit6"
  | "Digit7"
  | "Digit8"
  | "Digit9"
  | "KeyA"
  | "KeyB"
  | "KeyC"
  | "KeyD"
  | "KeyE"
  | "KeyF"
  | "KeyG"
  | "KeyH"
  | "KeyI"
  | "KeyJ"
  | "KeyK"
  | "KeyL"
  | "KeyM"
  | "KeyN"
  | "KeyO"
  | "KeyP"
  | "KeyQ"
  | "KeyR"
  | "KeyS"
  | "KeyT"
  | "KeyU"
  | "KeyV"
  | "KeyW"
  | "KeyX"
  | "KeyY"
  | "KeyZ"
  | "MetaLeft"
  | "MetaRight"
  | "ContextMenu"
  | "NumpadMultiply"
  | "NumpadAdd"
  | "NumpadSubtract"
  | "NumpadDivide"
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9"
  | "F10"
  | "F11"
  | "F12"
  | "F13"
  | "F14"
  | "F15"
  | "F16"
  | "F17"
  | "F18"
  | "F19"
  | "F20"
  | "F21"
  | "F22"
  | "F23"
  | "F24"
  | "NumLock"
  | "ScrollLock"
  | "AudioVolumeMute"
  | "AudioVolumeDown"
  | "AudioVolumeUp"
  | "MediaTrackNext"
  | "MediaTrackPrevious"
  | "MediaStop"
  | "MediaPlayPause"
  | "Semicolon"
  | "Equal"
  | "NumpadEqual"
  | "Comma"
  | "Minus"
  | "Period"
  | "Slash"
  | "Backquote"
  | "BracketLeft"
  | "Backslash"
  | "BracketRight"
  | "Quote"
  | "AltGraph"
  | "Props"
  | "Cancel"
  | "Clear"
  | "Shift"
  | "Control"
  | "Alt"
  | "Accept"
  | "ModeChange"
  | " "
  | "Print"
  | "Execute"
  | "\u0000"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "Meta"
  | "*"
  | "+"
  | "-"
  | "/"
  | ";"
  | "="
  | ","
  | "."
  | "`"
  | "["
  | "\\"
  | "]"
  | "'"
  | "Attn"
  | "CrSel"
  | "ExSel"
  | "EraseEof"
  | "Play"
  | "ZoomOut"
  | ")"
  | "!"
  | "@"
  | "#"
  | "$"
  | "%"
  | "^"
  | "&"
  | "("
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z"
  | ":"
  | "<"
  | "_"
  | ">"
  | "?"
  | "~"
  | "{"
  | "|"
  | "}"
  | '"'
  | "SoftLeft"
  | "SoftRight"
  | "Camera"
  | "Call"
  | "EndCall"
  | "VolumeDown"
  | "VolumeUp";

/** Options for typing on the keyboard */
export interface KeyboardTypeOptions {
  delay?: number;
}

/**
 * Keyboard provides an api for managing a virtual keyboard. The high level api is `Keyboard.type()`, which takes raw characters and generates proper `keydown`, `keypress`/`input`, and `keyup` events on your page.
 */
export class Keyboard {
  #celestial: Celestial;
  #modifiers = Modifiers.None;

  constructor(celestial: Celestial) {
    this.#celestial = celestial;
  }

  /**
   * Updates the modifier state based on the key and whether it's being pressed or released
   */
  #updateModifierState(key: KeyInput, pressed: boolean) {
    const modifier = MODIFIER_MAP.get(key);
    if (modifier !== undefined) {
      if (pressed) {
        this.#modifiers |= modifier;
      } else {
        this.#modifiers &= ~modifier;
      }
    }
  }

  /**
   * Dispatches a `keydown` event and updates modifier state.
   */
  async down(key: KeyInput) {
    this.#updateModifierState(key, true);
    await this.#celestial.Input.dispatchKeyEvent({
      type: "keyDown",
      modifiers: this.#modifiers,
      text: key,
    });
  }

  /**
   * Shortcut for `Keyboard.down()` and `Keyboard.up()`.
   */
  async press(key: KeyInput, opts?: KeyboardTypeOptions) {
    await this.down(key);
    await new Promise((r) => setTimeout(r, opts?.delay ?? 0));
    await this.up(key);
  }

  /**
   * Dispatches a `keypress` and `input` event. This does not send a `keydown` or `keyup` event.
   */
  async sendCharacter(char: string) {
    await this.#celestial.Input.insertText({ text: char });
  }

  /**
   * Sends a `keydown`, `keypress`/`input`, and `keyup` event for each character in the text.
   */
  async type(text: string | KeyInput[], opts?: KeyboardTypeOptions) {
    for (const char of text) {
      await this.press(char as KeyInput, opts);
    }
  }

  /**
   * Dispatches a `keyup` event and updates modifier state.
   */
  async up(key: KeyInput) {
    this.#updateModifierState(key, false);
    await this.#celestial.Input.dispatchKeyEvent({
      type: "keyUp",
      modifiers: this.#modifiers,
      text: key,
    });
  }
}
