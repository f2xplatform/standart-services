# standart-services

## To receive `standart-services` in repositories execute this commands

**Preferable**.

```bash
git submodule update --recursive --init
```

Uses the **pinned commit** from the parent repo. Prefer this command for setup and usage.

**Not preferable**.

```bash
git submodule update --recursive --init --remote
```

Uses the **latest** commit on the submodule’s tracked branch. 
