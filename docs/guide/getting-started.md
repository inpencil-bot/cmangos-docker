# Getting Started

One of the main goals of the **CMaNGOS Docker** project is **optimization**.  
To achieve this, **two different types** of Docker images have been developed: one used for **maintenance** (larger) and one used for **execution** (smaller and optimized).

With this principle in mind, we can now begin!

::: warning Not production-ready
This procedure doesn't describe a _production-ready_ deployment and doesn't delve into security best practices.  
It's just a simple practical example of a basic CMaNGOS Docker configuration; be careful when using it directly in a production environment.

If you're looking for more specific guidance, see the [Use in Production](/guide/use-in-production) page.
:::

## First time setup

First of all, you have to decide which client version you want your server to support.  
Both CMaNGOS and CMaNGOS Docker use **three keywords** to identify it. Select the one you need and **keep it in mind** for the next steps:

| Game name | Game version | Keyword |
|-----------|--------------|---------|
| World of Warcraft | **v1.12.x** | `classic` |
| World of Warcraft: The Burning Crusade | **v2.4.3** | `tbc` |
| World of Warcraft: Wrath of the Lich King | **v3.3.5a** | `wotlk` |

## Preliminary configuration

### Create a project directory

Create a new directory on your computer to store everything related to your WoW server.  
It's best **NOT** to use the same directory as the client — keep them separate from each other.

Download the [`cmangos-docker.zip`](https://github.com/Byloth/cmangos-docker/archive/refs/heads/master.zip) archive, open it, and extract its contents into the newly created directory.

::: tip Using Git
If you're familiar with [Git](https://git-scm.com/), you can clone the repository directly instead of downloading the archive.
:::

::: info Keeping files up to date
This archive may be updated over time. Make sure to check it periodically and follow the [update procedure](/guide/install-updates) when needed.
:::

### Locate the client directory

To play World of Warcraft, you'll need a legally owned copy of the game installed on your computer.

Locate the installation directory. On Windows, the default location is typically `C:\Program Files\World of Warcraft`.  
Once you find it, copy the path — we'll need it shortly.

### Create the `.env` file

The `.env` file is a configuration file that allows you to customize your WoW server.

Although it's required for the application to work properly, it cannot be included pre-configured due to its nature. This means you'll need to create it yourself.  
To simplify this process, there's a `.env.example` file that you can copy and modify using any text editor (e.g., Notepad) to suit your needs.

It contains 6 key-value pairs. Here's what each one means:

| Variable | Description |
|----------|-------------|
| `MYSQL_SUPERPASS` | The password for the `root` user that will be used to administer the MySQL database. |
| `MANGOS_DBUSER` | The username of the user that the application server will use to connect to the MySQL database. |
| `MANGOS_DBPASS` | The password of the user that the application server will use to connect to the MySQL database. |
| `WOW_CLIENT_DIR` | The path to the WoW installation directory you located in the previous step. |
| `WOW_TIMEZONE` | The [time zone identifier](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) that specifies which time zone the server should use. |
| `WOW_VERSION` | The keyword that describes which version of WoW client the server should support (the one you chose in the first step). |

Once you're done, save the file and close your text editor.

### Extract files from the client

Due to legal reasons and copyright policies, CMaNGOS (and CMaNGOS Docker) cannot be distributed in a fully _ready-to-run_ state. It requires **some additional copyrighted files** from Blizzard Entertainment.

Fortunately, these files are present within the WoW client — the same client you need to play the game.  
If you've legally purchased a copy, you can use a CMaNGOS tool to extract these files directly from it.

::: code-group

```sh [Linux / Unix / macOS]
./builder/run.sh extract
```

```bat [Windows Command Prompt]
docker run -it --rm ^
           --volume "cmangos_mangosd_data:/home/mangos/data" ^
           --volume "{path}:/home/mangos/wow-client" ^
    ^
    ghcr.io/byloth/cmangos/{version}/builder:latest extract
```

```powershell [Windows PowerShell]
docker run -it --rm `
           --volume "cmangos_mangosd_data:/home/mangos/data" `
           --volume "{path}:/home/mangos/wow-client" `
    `
    ghcr.io/byloth/cmangos/{version}/builder:latest extract
```

:::

::: warning Placeholders
For Windows users: replace `{path}` with your WoW installation directory path and `{version}` with your chosen expansion keyword (`classic`, `tbc`, or `wotlk`).
:::

## Database initialization

Since this is the first run, you need to create the databases and load the initial data required by CMaNGOS to function correctly.

::: info What's in the database?
The database contains information about NPCs, mobs, items, spells, quests, events, and their related stats such as strength, speed, hit points, spawn rates, drop ratios, experience, gold, and more.

If you find something that seems wrong or missing while playing, feel free to [report it](https://github.com/cmangos/issues/issues/new/choose) to the CMaNGOS team.
:::

Open a terminal inside the server project directory you created earlier and run:

```sh
docker compose up mariadb
```

This terminal will now display log output and won't be interactive.  
As long as it's printing messages, the database server is running. Leave it running and open a **new terminal** in the same directory.

In the new terminal, run:

::: code-group

```sh [Unix/Linux/macOS]
./builder/run.sh init-db
```

```bat [Windows Command Prompt]
docker run -it --rm ^
           --env MYSQL_SUPERUSER="root" ^
           --env MYSQL_SUPERPASS="root00" ^
           --env MANGOS_DBHOST="mariadb" ^
           --env MANGOS_DBUSER="mangos" ^
           --env MANGOS_DBPASS="mangos00" ^
           --network "cmangos_default" ^
           --volume "cmangos_mangosd_data:/home/mangos/data" ^
    ^
    ghcr.io/byloth/cmangos/{version}/builder:latest init-db
```

```powershell [Windows PowerShell]
docker run -it --rm `
           --env MYSQL_SUPERUSER="root" `
           --env MYSQL_SUPERPASS="root00" `
           --env MANGOS_DBHOST="mariadb" `
           --env MANGOS_DBUSER="mangos" `
           --env MANGOS_DBPASS="mangos00" `
           --network "cmangos_default" `
           --volume "cmangos_mangosd_data:/home/mangos/data" `
    `
    ghcr.io/byloth/cmangos/{version}/builder:latest init-db
```

:::

::: warning Placeholders
For Windows users: don't forget to replace `{version}` with the correct expansion keyword.
:::

Once the initialization is complete, go back to the first terminal (which should still be running) and press `Ctrl+C` to stop the database server.  
This will cause the program to print some shutdown messages, and execution will stop within a few seconds.

### Configure the realmlist

The last step before starting the server is to tell the client which realms exist and where to find them.  
CMaNGOS applies a basic configuration by default that should work for a single-realm server running on the local machine.

However, if your scenario is different — or if you find yourself in a loop where the WoW client repeatedly asks you to select a realm — you'll need to configure the `realmlist` table in the `realmd` database.

Run these SQL queries to fix the issue:

```sql
DELETE FROM realmlist WHERE id = 1;

INSERT INTO realmlist (id, name, address, port, icon, realmflags, timezone, allowedSecurityLevel)
VALUES ('1', 'CMaNGOS', '127.0.0.1', '8085', '1', '0', '1', '0');
```

::: tip Customizing the realm
You'll likely want to customize the `name`, `address`, and `port` columns to match your setup.  
The other fields (`realmflags` and `timezone`) can also be configured via the `mangosd.conf` file.
:::

::: info Running SQL queries
If you're not sure how to run these queries, see the [Database Management](/guide/database-management#querying-databases) page.
:::

## Running the server

Once you've initialized the database, you're ready to run your very own WoW server for the first time!

From your project directory, run:

```sh
docker compose up
```

As before, this terminal will no longer be interactive. As long as it prints messages, your CMaNGOS server is up and running.

### Using the CMaNGOS console

The CMaNGOS server provides a command-line interface where you can manage users and the server itself.  
You won't need this during normal operation, but it's useful for tasks like creating user accounts.

While your CMaNGOS server is running, you can access the console by running in a new terminal:

```sh
docker attach cmangos-mangosd-1
```

Now you can type CMaNGOS commands.

::: danger Exiting the console safely
**DO NOT** press `Ctrl+C` to exit the console — this will stop the server entirely and disconnect all players.

To properly detach from the console, press `Ctrl+P` followed by `Ctrl+Q`.
:::

### Creating a new account

To create a new account, type the following command in the CMaNGOS console:

```sh
account create {username} <password>
```

Replace `{username}` and `<password>` with your desired credentials.

### Enabling expansions for an account

Regardless of which expansion your CMaNGOS server supports, you can choose for each individual account which expansion content they can access.

This works just like official WoW servers: when a new expansion is released, the server supports it, but players can only access the new content after purchasing it.  
This setting allows you to implement the same behavior.

| Game name | Game version | Level |
|-----------|--------------|-------|
| World of Warcraft | **v1.12.x** | `0` |
| World of Warcraft: The Burning Crusade | **v2.4.3** | `1` |
| World of Warcraft: Wrath of the Lich King | **v3.3.5a** | `2` |

::: info Expansion levels are cumulative
A higher level automatically includes all previous expansions.  
For example, setting level `2` (WotLK) also grants access to TBC and Classic content.
:::

To set the expansion level for an account:

```sh
account set addon {username} {level}
```

Replace `{username}` and `{level}` with the desired values.

### Setting GM levels

Game Masters (GMs) can perform various administrative actions depending on their level, such as banning players or teleporting stranded characters.

| GM type | Level |
|---------|-------|
| Normal Player | `0` |
| Moderator | `1` |
| Game Master | `2` |
| Administrator | `3` |

To change the GM level for an account:

```sh
account set gmlevel {username} {level}
```

Replace `{username}` and `{level}` with the desired values.

## Stopping the server

To stop the server gracefully, press `Ctrl+C` in the terminal where the CMaNGOS server is running.  
This may take a few seconds, but the server will shut down properly.

::: tip Ensuring a clean shutdown
To make sure everything was shut down properly, you can run:

```sh
docker compose down
```
:::
