import { existsSync } from "https://deno.land/std@0.195.0/fs/exists.ts";

export interface JSDocable {
  description?: string;
  experimental?: boolean;
  deprecated?: boolean;
}

export type ObjectProperty =
  & JSDocable
  & {
    name: string;
    optional?: boolean;
  }
  & (
    {
      type: "number" | "integer" | "boolean" | "any" | "object" | "binary";
    } | {
      type: "string";
      enum?: string[];
    } | {
      type: "array";
      items: {
        $ref: string;
      } | {
        type: "number" | "string" | "integer" | "any";
      };
    } | {
      $ref: string;
    }
  );

export type Type =
  & JSDocable
  & {
    id: string;
  }
  & (
    {
      type: "string";
      enum?: string[];
    } | {
      type: "number" | "integer";
    } | {
      type: "object";
      properties?: ObjectProperty[];
    } | {
      type: "array";
      items: {
        $ref: string;
      } | {
        type: "number" | "string" | "integer" | "any";
      };
    }
  );

export type CommandParameter =
  & JSDocable
  & {
    name: string;
    optional?: boolean;
  }
  & (
    {
      type: "boolean" | "integer" | "number" | "binary";
    } | {
      type: "string";
      enum?: string[];
    } | {
      type: "array";
      items: {
        $ref: string;
      } | {
        type: "string";
      };
    } | {
      $ref: string;
    }
  );

export type Command = JSDocable & {
  name: string;
  parameters?: CommandParameter[];
  // TODO: strongly type events
  events?: {}[];
  // TODO: strongly return command return value
  returns?: {}[];
};

export type Domain = JSDocable & {
  domain: string;
  dependencies?: string[];
  types?: Type[];
  commands?: Command[];
};

export interface Protocol {
  version: {
    major: number;
    minor: number;
  };
  domains: Domain[];
}

export async function getProtocol(): Promise<Protocol> {
  if (existsSync("types.json")) {
    return JSON.parse(Deno.readTextFileSync("types.json"));
  } else {
    // Configuration
    const path =
      `/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`;

    // Launch child process
    const launch = new Deno.Command(path, {
      args: [
        "-remote-debugging-port=9222",
        "--headless=new",
      ],
      stderr: "piped",
    });
    const process = launch.spawn();

    // Wait until first write to stdout
    // This probably means that the process is read to accept communication
    const reader = process.stderr
      .pipeThrough(new TextDecoderStream())
      .getReader();
    await reader.read();

    // Get protocol information and close process
    const protocolReq = await fetch("http://localhost:9222/json/protocol");
    const res = await protocolReq.json();
    process.kill();
    return res;
  }
}
