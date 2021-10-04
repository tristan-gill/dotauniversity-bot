/* ----- Channel Structures -----

Lobby Voice Channels
  Main Lobby #1         754026825394552844
  Team Radiant #1       754027018378674250
  Team Dire #1          754026980550115350
  Tryouts #1            754027813920833587

Voice Channels
  #muted-text-channel
  General #1            631605827337191428
  Team #1               754027683889020928
  AFK
*/

let generalArray = [];
let teamArray = [];
let lobbyArray = [];
let watchingVoiceChannels = {};

const createVoiceChannelHandling = async () => {
  await mutex.runExclusive(async () => {
    generalArray = [];
    teamArray = [];
    lobbyArray = [];
    watchingVoiceChannels = {};

    const guild = await client.guilds.fetch(process.env.DFZ_GUILD, true, true);

    const mainLobbyArray = [];
    const radiantArray = [];
    const direArray = [];

    // populate the lobby arrays with existing channels
    for (const channel of guild.channels.cache.array()) {
      if (channel.type !== 'voice') {
        continue;
      }

      if (channel.name.startsWith('🤍 Main Lobby')) {
        const newChannel = {
          id: channel.id,
          order: parseInt(channel.name.slice(-1)),
          members: channel.members.size
        };

        if (newChannel.order !== (mainLobbyArray.length + 1)) {
          newChannel.order = (mainLobbyArray.length + 1);
          await channel.edit({ name: `🤍 Main Lobby #${newChannel.order}` });
        }

        await channel.setPosition(((newChannel.order - 1) * 3) + 0);

        mainLobbyArray.push(newChannel);
        watchingVoiceChannels[channel.id] = 'lobbyArray';
      } else if (channel.name.startsWith('Team Radiant')) {
        const newChannel = {
          id: channel.id,
          order: parseInt(channel.name.slice(-1)),
          members: channel.members.size
        };

        if (newChannel.order !== (radiantArray.length + 1)) {
          newChannel.order = (radiantArray.length + 1);
          await channel.edit({ name: `Team Radiant #${newChannel.order}` });
        }

        await channel.setPosition(((newChannel.order - 1) * 3) + 1);

        radiantArray.push(newChannel);
        watchingVoiceChannels[channel.id] = 'lobbyArray';
      } else if (channel.name.startsWith('Team Dire')) {
        const newChannel = {
          id: channel.id,
          order: parseInt(channel.name.slice(-1)),
          members: channel.members.size
        };

        if (newChannel.order !== (direArray.length + 1)) {
          newChannel.order = (direArray.length + 1);
          await channel.edit({ name: `Team Dire #${newChannel.order}` });
        }

        await channel.setPosition(((newChannel.order - 1) * 3) + 2);

        direArray.push(newChannel);
        watchingVoiceChannels[channel.id] = 'lobbyArray';
      } else if (channel.name.startsWith('General')) {
        const newChannel = {
          id: channel.id,
          order: parseInt(channel.name.slice(-1)),
          members: channel.members.size
        };

        if (newChannel.order !== (generalArray.length + 1)) {
          newChannel.order = (generalArray.length + 1);
          await channel.edit({ name: `General #${newChannel.order}` });
        }

        generalArray.push(newChannel);
        watchingVoiceChannels[channel.id] = 'generalArray';
      } else if (channel.name.startsWith('Team')) {
        const newChannel = {
          id: channel.id,
          order: parseInt(channel.name.slice(-1)),
          members: channel.members.size
        };

        if (newChannel.order !== (teamArray.length + 1)) {
          newChannel.order = (teamArray.length + 1);
          await channel.edit({ name: `Team #${newChannel.order}` });
        }

        teamArray.push(newChannel);
        watchingVoiceChannels[channel.id] = 'teamArray';
      }
    }

    // order them by the numbers at the end of the channel names
    mainLobbyArray.sort((a, b) => a.order - b.order);
    radiantArray.sort((a, b) => a.order - b.order);
    direArray.sort((a, b) => a.order - b.order);
    teamArray.sort((a, b) => a.order - b.order);
    generalArray.sort((a, b) => a.order - b.order);

    // group the lobby ones together
    for (let i = 0; i < mainLobbyArray.length; i++) {
      lobbyArray.push({
        ids: [mainLobbyArray[i].id, radiantArray[i].id, direArray[i].id],
        order: mainLobbyArray[i].order,
        members: mainLobbyArray[i].members + radiantArray[i].members + direArray[i].members,
      });
    }

    let deletedCount = 0;
    let deletedIds = [];

    // clean up extra lobby channels
    for (const channel of lobbyArray) {
      if (channel.members === 0 && channel !== lobbyArray[lobbyArray.length - 1]) {
        const mainLobbyDiscordChannel = await client.channels.fetch(channel.ids[0]);
        const radiantDiscordChannel = await client.channels.fetch(channel.ids[1]);
        const direDiscordChannel = await client.channels.fetch(channel.ids[2]);
        await mainLobbyDiscordChannel.delete();
        await radiantDiscordChannel.delete();
        await direDiscordChannel.delete();

        deletedCount++;

        deletedIds.push(channel.ids[0]);
        deletedIds.push(channel.ids[1]);
        deletedIds.push(channel.ids[2]);

        channel.deleted = true;

        continue;
      }

      if (deletedCount > 0) {
        // alter the names
        const mainLobbyDiscordChannel = await client.channels.fetch(channel.ids[0]);
        const radiantDiscordChannel = await client.channels.fetch(channel.ids[1]);
        const direDiscordChannel = await client.channels.fetch(channel.ids[2]);
        await mainLobbyDiscordChannel.edit({ name: `🤍 Main Lobby #${channel.order - deletedCount}` });
        await radiantDiscordChannel.edit({ name: `Team Radiant #${channel.order - deletedCount}` });
        await direDiscordChannel.edit({ name: `Team Dire #${channel.order - deletedCount}` });

        channel.order = channel.order - deletedCount;
      }
    }
    lobbyArray = lobbyArray.filter((x) => !x.deleted);
    // check if we need another lobby channel
    if (lobbyArray[lobbyArray.length - 1].members !== 0) {
      await addLobbyArrayChannel(guild);
    }

    // clean up extra team channels
    deletedCount = 0;
    for (const channel of teamArray) {
      if (channel.members === 0 && channel !== teamArray[teamArray.length - 1]) {
        const discordChannel = await client.channels.fetch(channel.id);
        await discordChannel.delete();

        deletedCount++;

        deletedIds.push(channel.id);

        channel.deleted = true;

        continue;
      }

      if (deletedCount > 0) {
        // alter the names
        const discordChannel = await client.channels.fetch(channel.id);
        await discordChannel.edit({ name: `Team #${channel.order - deletedCount}` });

        channel.order = channel.order - deletedCount;
      }
    }
    teamArray = teamArray.filter((x) => !x.deleted);
    // check if we need another team channel
    if (teamArray[teamArray.length - 1].members !== 0) {
      await addTeamArrayChannel(guild);
    }

    // clean up extra general channels
    deletedCount = 0;
    for (const channel of generalArray) {
      if (channel.members === 0 && channel !== generalArray[generalArray.length - 1]) {
        const discordChannel = await client.channels.fetch(channel.id);
        await discordChannel.delete();

        deletedCount++;

        deletedIds.push(channel.id);

        channel.deleted = true;

        continue;
      }

      if (deletedCount > 0) {
        // alter the names
        const discordChannel = await client.channels.fetch(channel.id);
        await discordChannel.edit({ name: `General #${channel.order - deletedCount}` });

        channel.order = channel.order - deletedCount;
      }
    }
    generalArray = generalArray.filter((x) => !x.deleted);
    // check if we need another general channel
    if (generalArray[generalArray.length - 1].members !== 0) {
      await addGeneralArrayChannel(guild);
    }

    for (const deletedId of deletedIds) {
      delete watchingVoiceChannels[deletedId];
    }
  });
}
