# The `cmangos_mangosd_data` Volume

CMaNGOS Docker uses a **Docker volume** called `cmangos_mangosd_data` to persist the game data that lives between container restarts. This page explains what the volume holds, why it is managed separately from the containers, and how to work with it.

## What it is

A Docker volume is a persistent storage area that survives even when containers are deleted or recreated. The `cmangos_mangosd_data` volume is where CMaNGOS stores:

| Directory | Contents |
|-----------|----------|
| `Cameras/` | Camera definitions for cinematics |
| `dbc/` | Database client files — game strings, definitions, and lookup tables |
| `maps/` | Terrain geometry and map data |
| `mmaps/` | Movement mesh data for NPC pathfinding |
| `vmaps/` | Visual mesh data for line-of-sight calculations |
| `logs/` | Extraction logs from the `extract` command |
| `backups/` | Database backups created with `backup-db` |

These files are **copyrighted by Blizzard Entertainment** and are extracted from your legally owned game client. They cannot be distributed with the Docker image, which is why you must generate them yourself.

## Why it is external

In `docker-compose.yml`, the volume is declared as `external: true`:

```yaml
volumes:
  cmangos_mangosd_data:
    external: true
```

This means Docker Compose expects the volume to exist before you start the server. The volume is **not** created automatically when you run `docker compose up`.

The volume is shared between:
- The **builder** container (when extracting data or running backups)
- The **mangosd** and **realmd** containers (at runtime, read-only)

Because multiple services need access to the same files, a named volume — rather than a bind mount — is the cleanest solution. It works identically across Linux, macOS, and Windows.

## Creating the volume

Before your first extraction or server start, create the volume manually:

```sh
docker volume create cmangos_mangosd_data
```

If you skip this step, you will see an error like:

```
Error response from daemon: create cmangos_mangosd_data: volume name must be unique
```

or:

```
no such volume: cmangos_mangosd_data
```

## Checking the volume

To verify the volume exists and see where Docker stores it:

```sh
docker volume inspect cmangos_mangosd_data
```

To see how much space it is using:

```sh
docker system df -v | grep cmangos_mangosd_data
```

A typical volume after extraction is **2–5 GB**, depending on the expansion.

## Removing the volume

::: danger Data loss warning
Removing the volume will delete **all** extracted game data and any backups stored inside it. You will need to re-run the extraction step and restore backups from external copies.
:::

If you need to start completely fresh:

```sh
# Stop all services first
docker compose down

# Remove the volume
docker volume rm cmangos_mangosd_data

# Recreate it
docker volume create cmangos_mangosd_data
```

## Moving the volume to a different location

By default, Docker stores volumes on your system drive. If you need to move the volume to a larger or faster disk:

1. Stop the server:
   ```sh
   docker compose down
   ```

2. Back up the current volume contents to a local directory:
   ```sh
   docker run --rm \
              -v cmangos_mangosd_data:/from \
              -v /new/path/cmangos_data:/to \
              alpine cp -a /from/. /to/
   ```

3. Remove the old volume:
   ```sh
   docker volume rm cmangos_mangosd_data
   ```

4. Create a new volume from the backup directory:
   ```sh
   docker volume create --driver local \
     --opt type=none \
     --opt o=bind \
     --opt device=/new/path/cmangos_data \
     cmangos_mangosd_data
   ```

5. Start the server:
   ```sh
   docker compose up -d
   ```

::: tip Windows and macOS
On Docker Desktop for Windows and macOS, volumes live inside the Docker virtual machine. Moving them to a different host disk requires adjusting the Docker Desktop resource settings rather than bind-mounting directly.
:::

## Troubleshooting

### "No such volume: cmangos_mangosd_data"

You forgot to create the volume. Run:

```sh
docker volume create cmangos_mangosd_data
```

### Extraction fails with permission errors

The builder container runs as the `mangos` user (UID/GID created at build time). On Linux, if your Docker daemon runs as root, permissions should align automatically. On systems with rootless Docker or unusual UID mappings, you may need to adjust ownership:

```sh
# Inspect the volume's actual mount point
docker volume inspect cmangos_mangosd_data --format '{{ .Mountpoint }}'

# Adjust permissions if needed (requires root on the host)
sudo chown -R 1000:1000 /var/lib/docker/volumes/cmangos_mangosd_data/_data
```

### Volume grows unexpectedly large

Check for old backup files or repeated extraction runs:

```sh
# Inspect the volume contents
docker run --rm -v cmangos_mangosd_data:/data alpine sh -c "du -sh /data/*"
```

Clean up old backups:

```sh
# Remove backups older than 30 days (run from inside the builder)
./builder/run.sh bash -c "find /home/mangos/data/backups -type f -mtime +30 -delete"
```
