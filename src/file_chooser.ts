import { resolve } from "@std/path/resolve";

import type {
  Celestial,
  Page_fileChooserOpened,
} from "../bindings/celestial.ts";

/**
 * Dialog provides an api for managing a page's dialog events.
 */
export class FileChooser {
  #celestial: Celestial;
  #backendNodeId: number;

  /**
   *  Whether this file chooser accepts multiple files.
   */
  readonly multiple: boolean;

  constructor(celestial: Celestial, config: Required<Page_fileChooserOpened>) {
    this.multiple = config.mode === "selectMultiple";
    this.#celestial = celestial;
    this.#backendNodeId = config.backendNodeId;
  }

  /**
   * Sets the value of the file input this chooser is associated with. If some of the filePaths are relative paths, then they are resolved relative to the current working directory. For empty array, clears the selected files.
   */
  async setFiles(files: string[]) {
    await this.#celestial.DOM.setFileInputFiles({
      files: files.map((file) => resolve(file)),
      backendNodeId: this.#backendNodeId,
    });
  }
}
