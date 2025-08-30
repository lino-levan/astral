---
title: Env vars
description:
index: 5
---

Astral lets you configure some of its behavior using environment variables.

## `ASTRAL_QUIET_INSTALL`

By default, if Astral needs to install a browser binary, it will print progress
information to the console. You can disable this behavior by setting the
`ASTRAL_QUIET_INSTALL` environment variable to `1`.

If `CI` is set to `true`, Astral will assume `ASTRAL_QUIET_INSTALL`.

## `ASTRAL_BIN_PATH`

If you already installed a supported browser binary, you can force Astral to use
it by setting the `ASTRAL_BIN_PATH` environment variable.

The `getBinary()` function will then always return that path.

This is especially useful in containerized environments where you might reuse an
existing base image or pre-install the browser binary yourself.

```dockerfile
RUN apt-get install -y google-chrome-stable
ENV ASTRAL_BIN_PATH=/usr/bin/google-chrome-stable
```

## `ASTRAL_BIN_ARGS`

You may want to pass additional arguments to the browser binary when launching
it without having to change your Astral `launch()` calls.

It can be achieved by setting the `ASTRAL_BIN_ARGS` environment variable.
Arguments passed via this variable will be appended to any arguments passed to
the `launch()` function.

This is especially useful in containerized environments where you might need to
pass specific arguments to make the browser work properly.

```dockerfile
ENV ASTRAL_BIN_ARGS="--no-sandbox"
```
