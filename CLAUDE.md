Track work using git, commit at key milestones.

## Deactivate conda first

Deactivate the conda/micromamba env before running anything. Its `gcc` comes before `/usr/bin` on PATH and can't link Rust std. `micromamba deactivate` is not enough, because the shell profile puts `~/micromamba/bin` on PATH directly. Shell state does not persist between commands, so start each shell command with:

```sh
export PATH=$(echo "$PATH" | tr : '\n' | grep -v micromamba | paste -sd:)
```

Check with `which gcc`, which should print `/usr/bin/gcc`. With this done, `RUST_VERIFY_LINKER` is not needed.
