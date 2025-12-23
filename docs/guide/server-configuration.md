# Server Configuration

::: warning Work in Progress
This page is currently under construction and may be incomplete.
:::

In this section, we'll cover how to configure the CMaNGOS server using Docker containers.
Configuration values are injected into the container through a directory mounted as a volume.

As a user of CMaNGOS Docker, you'll simply need to edit the configuration file located at `runner/config/mangosd.conf`.

## Configuration file

This configuration file doesn't contain all available properties and settings for CMaNGOS.
By default, CMaNGOS has its own default values for everything — you only need to add entries for settings you want to override.

### Overriding default values

To override a default configuration, simply add the desired property and its value to the configuration file.

For example, if you want to change the `GameType` from its default value, add the following line:

```ini
GameType = 1
```

This will set the `GameType` configuration to the specified value, overriding the default.

### Available settings

Here's a reference of commonly used configuration options:

| Property | Default | Description |
|----------|---------|-------------|
| `GameType` | `0` | Server type: `0` = Normal, `1` = PvP, `4` = Normal+, `6` = RP, `8` = RP PvP |
| `RealmZone` | `1` | Realm timezone for client display |
| `Motd` | (empty) | Message of the Day shown to players on login |
| `MaxPlayerLevel` | `60`/`70`/`80` | Maximum player level (depends on expansion) |
| `StartPlayerLevel` | `1` | Starting level for new characters |
| `StartPlayerMoney` | `0` | Starting money for new characters (in copper) |
| `Rate.XP.Kill` | `1` | Experience multiplier for killing mobs |
| `Rate.XP.Quest` | `1` | Experience multiplier for completing quests |
| `Rate.Drop.Money` | `1` | Gold drop rate multiplier |
| `AllFlightPaths` | `0` | Set to `1` to unlock all flight paths |
| `InstantLogout` | `0` | Set to `1` to allow instant logout anywhere |

::: tip Complete documentation
For a complete list of all available configurations and their default values, refer to the original `mangosd.conf.dist` file in the CMaNGOS repository for your expansion:

- [Classic mangosd.conf.dist](https://github.com/cmangos/mangos-classic/blob/master/src/mangosd/mangosd.conf.dist.in)
- [TBC mangosd.conf.dist](https://github.com/cmangos/mangos-tbc/blob/master/src/mangosd/mangosd.conf.dist.in)
- [WotLK mangosd.conf.dist](https://github.com/cmangos/mangos-wotlk/blob/master/src/mangosd/mangosd.conf.dist.in)
:::

## Realm configuration

The realm/login server (`realmd`) also has its own configuration file at `runner/config/realmd.conf`.

This file follows the same override pattern — add only the properties you want to change from their defaults.

| Property | Default | Description |
|----------|---------|-------------|
| `LogsDir` | `.` | Directory for log files |
| `MaxPingTime` | `30` | Maximum ping time before disconnect (minutes) |
| `WrongPass.MaxCount` | `0` | Max failed login attempts (`0` = unlimited) |
| `WrongPass.BanTime` | `600` | Ban duration after max failed attempts (seconds) |
| `WrongPass.BanType` | `0` | Ban type: `0` = IP, `1` = Account |
