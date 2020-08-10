#dotauniversity-bot

You'll need to set up your own discord bot to test with.
[Discord Developers](https://discord.com/developers/applications)

Under the Bot tab, you should see a Token that you can copy.

If you want to properly test the bot you should make your own discord server, it will need all of the roles and channels that are listed in the `.env.example` file.

If you don't want to make your own you can DM me and add it to the test server I had already setup. This is likely easier but might get annoying if you want to do extensive changes with roles and channels.

You will need a psql database set up somewhere as the lobby posts are synced up with a database.
The table definitions are below. The users table is not necessary as it was for handling the server roles transfer from the old discord server.

```
-- Table Definition ----------------------------------------------

CREATE TABLE lobbies (
    id text PRIMARY KEY,
    data json
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX lobbies_pkey ON lobbies(id text_ops);

-- Table Definition ----------------------------------------------

CREATE TABLE users (
    id text PRIMARY KEY,
    roles text[],
    username text
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX users_pkey ON users(id text_ops);
```

Beyond this all you need is the normal npm setup stuff. 
