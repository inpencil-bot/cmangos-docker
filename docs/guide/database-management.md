# Database Management

CMaNGOS uses a MariaDB database to store all game data, player characters, and server logs.  
This guide covers common database operations like backups, restores, running queries, and maintenance.

## Prerequisites

Before performing any database operations, make sure the database server is running:

```sh
docker compose up mariadb -d
```

The `-d` flag runs the container in detached mode (background).

## Backups

Regular backups are essential for protecting your server data.  
CMaNGOS Docker provides built-in tools for creating and restoring backups.

### Creating a backup

From within your project directory, run:

::: code-group

```sh [All databases]
./builder/run.sh backup-db --all > backups/cmangos_$(date +"%Y-%m-%d_%H-%M-%S").tar.gz
```

```sh [World database only]
./builder/run.sh backup-db --world > backups/world_$(date +"%Y-%m-%d").tar.gz
```

```sh [Characters database only]
./builder/run.sh backup-db --characters > backups/characters_$(date +"%Y-%m-%d").tar.gz
```

:::

::: tip Backup options
The `backup-db` command supports these flags:
- `--all` — Backup all databases
- `--world` — World data (NPCs, items, quests, etc.)
- `--characters` — Player characters and progression
- `--logs` — Server activity logs
- `--realmd` — Realm and account data
:::

::: info Where backups are stored
The command outputs the backup archive to **standard output** (stdout).  
The examples above redirect it to a local `backups/` directory. Make sure this directory exists before running the command:

```sh
mkdir -p backups
```
:::

### Restoring a backup

To restore from a backup file:

```sh
./builder/run.sh restore-db < backups/cmangos_2024-01-15_12-30-00.tar.gz
```

::: danger Destructive operation
Restoring a backup will **overwrite** the current database contents.  
Make sure you have a recent backup of your current data before proceeding.
:::

## Interactive database management

For advanced operations — such as installing custom content, applying specific SQL patches, or running the full database installer menu — use the `manage-db` command:

```sh
./builder/run.sh manage-db
```

This launches the CMaNGOS `InstallFullDB.sh` interactive menu inside the builder container, giving you direct access to all database maintenance options provided by the upstream project.

## Querying databases

To execute queries and perform various operations on the databases, CMaNGOS Docker provides both a graphical interface through **[phpMyAdmin](https://www.phpmyadmin.net/)** and the MariaDB CLI command within the `builder` Docker container.

Choose the one that best suits your needs.

### Using phpMyAdmin

phpMyAdmin is included in CMaNGOS Docker but is disabled by default.  
To run it, you can either start it manually or use the `debug` profile.

::: code-group

```sh [Start manually]
docker compose up phpmyadmin
```

```sh [Use debug profile]
docker compose --profile debug up
```

:::

After running one of these commands, visit [`http://localhost:8080`](http://localhost:8080) to access phpMyAdmin's graphical interface.

::: info Default credentials
Use the database credentials from your `.env` file to log in.  
The root user is `root` with the password you set in `MYSQL_SUPERPASS`.
:::

### Using the MariaDB CLI

For command-line access, you can use the `builder` container to run MariaDB commands directly.

::: code-group

```sh [Linux / Unix / macOS]
# The builder container has your .env credentials loaded automatically.
# Use the --password flag with the variable (no space after -p):

./builder/run.sh mariadb -h mariadb -u root -p"$MYSQL_SUPERPASS" classicrealmd -e "SELECT * FROM realmlist;"

# Execute queries from a file
./builder/run.sh mariadb -h mariadb -u root -p"$MYSQL_SUPERPASS" classicmangos < path/to/queries.sql
```

```bat [Windows Command Prompt]
:: Execute a single inline query
docker run -it --rm ^
           --network "cmangos_default" ^
           --env MYSQL_SUPERPASS="root00" ^
    ^
    ghcr.io/byloth/cmangos/{version}/builder:latest ^
    mariadb -h mariadb -u root -p"root00" classicrealmd -e "SELECT * FROM realmlist;"
```

```powershell [Windows PowerShell]
# Execute a single inline query
docker run -it --rm `
           --network "cmangos_default" `
           --env MYSQL_SUPERPASS="root00" `
    `
    ghcr.io/byloth/cmangos/{version}/builder:latest `
    mariadb -h mariadb -u root -p"root00" classicrealmd -e "SELECT * FROM realmlist;"
```

:::

::: warning Placeholders
Replace `{version}` with your expansion keyword (`classic`, `tbc`, or `wotlk`).  
On Windows, replace `root00` with the actual password from your `.env` file.
:::

::: tip Using mysql vs mariadb commands
The builder image includes MariaDB 11.x client tools. The canonical commands are `mariadb` and `mariadb-dump`.  
A `mysql` symlink may also be available, but `mariadb` is the preferred command for forward compatibility.
:::

## Database structure

CMaNGOS uses four separate databases for each expansion:

| Database | Purpose |
|----------|---------|
| `{expansion}mangos` | World data (NPCs, items, quests, spells, loot tables, etc.) |
| `{expansion}characters` | Player data (characters, inventories, skills, achievements, etc.) |
| `{expansion}logs` | Server logs (chat, trades, GM commands, etc.) |
| `{expansion}realmd` | Account and realm data (login credentials, realm list, bans, etc.) |

Where `{expansion}` is one of: `classic`, `tbc`, or `wotlk`.

## Common issues

### "No such volume: cmangos_mangosd_data"

If you see this error when running `./builder/run.sh`, make sure the Docker volume has been created:

```sh
docker volume create cmangos_mangosd_data
```

This volume is required before you can extract game data, initialize the database, or create backups.

### Interactive commands hang or fail

Commands like `init-db`, `extract`, and `update-db --world` require an interactive terminal (TTY) to display confirmation prompts.  
Always run them from a proper terminal session. If you are scripting or piping, ensure a TTY is allocated:

```sh
./builder/run.sh init-db
```

Do not redirect stdin from `/dev/null` or run these commands in non-interactive CI environments without modification.
