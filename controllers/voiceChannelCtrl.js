const CronJob = require('cron').CronJob;
const Discord = require('discord.js');
const Mutex = require('async-mutex').Mutex;
const nconf = require('nconf');

class VoiceChannelCtrl {
  constructor (models, client, controllers) {
    this.models = models;
    this.client = client;
    this.controllers = controllers;

    this.mutex = new Mutex();

    this.generalArray = [];
    this.teamArray = [];
    this.lobbyArray = [];
    this.watchingVoiceChannels = {};
  }

  async addGeneralArrayChannel (guild) {
    const lastChannel = this.generalArray[this.generalArray.length - 1];
    const lastDiscordChannel = await this.client.channels.fetch(lastChannel.id);

    const newGeneralChannel = await guild.channels.create(`General #${lastChannel.order + 1}`, {
      type: 'voice',
      position: lastDiscordChannel.rawPosition,
      parent: lastDiscordChannel.parent
    });

    this.generalArray.push({
      id: newGeneralChannel.id,
      name: newGeneralChannel.name,
      order: lastChannel.order + 1,
      members: 0
    });

    this.watchingVoiceChannels[newGeneralChannel.id] = 'generalArray';
  }

  async addLobbyArrayChannel (guild) {
    const lastChannel = this.lobbyArray[this.lobbyArray.length - 1];
    const lastDiscordChannel = await this.client.channels.fetch(lastChannel.ids[2]);

    const newMainChannel = await guild.channels.create(`🤍 Main Lobby #${lastChannel.order + 1}`, {
      type: 'voice',
      position: lastDiscordChannel.rawPosition,
      parent: lastDiscordChannel.parent,
      userLimit: 99
    });

    const newRadiantChannel = await guild.channels.create(`Team Radiant #${lastChannel.order + 1}`, {
      type: 'voice',
      position: lastDiscordChannel.rawPosition,
      parent: lastDiscordChannel.parent,
      userLimit: 6
    });

    const newDireChannel = await guild.channels.create(`Team Dire #${lastChannel.order + 1}`, {
      type: 'voice',
      position: lastDiscordChannel.rawPosition,
      parent: lastDiscordChannel.parent,
      userLimit: 6
    });

    this.lobbyArray.push({
      ids: [newMainChannel.id, newRadiantChannel.id, newDireChannel.id],
      name: newMainChannel.name,
      order: lastChannel.order + 1,
      members: 0,
    });

    this.watchingVoiceChannels[newMainChannel.id] = 'lobbyArray';
    this.watchingVoiceChannels[newRadiantChannel.id] = 'lobbyArray';
    this.watchingVoiceChannels[newDireChannel.id] = 'lobbyArray';
  }

  async addTeamArrayChannel (guild) {
    const lastChannel = this.teamArray[this.teamArray.length - 1];
    const lastDiscordChannel = await this.client.channels.fetch(lastChannel.id);

    const newTeamChannel = await guild.channels.create(`Team #${lastChannel.order + 1}`, {
      type: 'voice',
      position: lastDiscordChannel.rawPosition,
      parent: lastDiscordChannel.parent,
      userLimit: 6
    });

    this.teamArray.push({
      id: newTeamChannel.id,
      name: newTeamChannel.name,
      order: lastChannel.order + 1,
      members: 0
    });

    this.watchingVoiceChannels[newTeamChannel.id] = 'teamArray';
  }

  async createVoiceChannelHandling () {
    await this.mutex.runExclusive(async () => {
      this.generalArray = [];
      this.teamArray = [];
      this.lobbyArray = [];
      this.watchingVoiceChannels = {};

      const guild = await this.client.guilds.fetch(process.env.DOTAU_GUILD_ID, true, true);

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
          this.watchingVoiceChannels[channel.id] = 'lobbyArray';
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
          this.watchingVoiceChannels[channel.id] = 'lobbyArray';
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
          this.watchingVoiceChannels[channel.id] = 'lobbyArray';
        } else if (channel.name.startsWith('General')) {
          const newChannel = {
            id: channel.id,
            order: parseInt(channel.name.slice(-1)),
            members: channel.members.size
          };

          if (newChannel.order !== (this.generalArray.length + 1)) {
            newChannel.order = (this.generalArray.length + 1);
            await channel.edit({ name: `General #${newChannel.order}` });
          }

          this.generalArray.push(newChannel);
          this.watchingVoiceChannels[channel.id] = 'generalArray';
        } else if (channel.name.startsWith('Team')) {
          const newChannel = {
            id: channel.id,
            order: parseInt(channel.name.slice(-1)),
            members: channel.members.size
          };

          if (newChannel.order !== (this.teamArray.length + 1)) {
            newChannel.order = (this.teamArray.length + 1);
            await channel.edit({ name: `Team #${newChannel.order}` });
          }

          this.teamArray.push(newChannel);
          this.watchingVoiceChannels[channel.id] = 'teamArray';
        }
      }

      // order them by the numbers at the end of the channel names
      mainLobbyArray.sort((a, b) => a.order - b.order);
      radiantArray.sort((a, b) => a.order - b.order);
      direArray.sort((a, b) => a.order - b.order);

      this.teamArray.sort((a, b) => a.order - b.order);
      this.generalArray.sort((a, b) => a.order - b.order);

      // group the lobby ones together
      for (let i = 0; i < mainLobbyArray.length; i++) {
        this.lobbyArray.push({
          ids: [mainLobbyArray[i].id, radiantArray[i].id, direArray[i].id],
          order: mainLobbyArray[i].order,
          members: mainLobbyArray[i].members + radiantArray[i].members + direArray[i].members,
        });
      }

      let deletedCount = 0;
      let deletedIds = [];

      // clean up extra lobby channels
      for (const channel of this.lobbyArray) {
        if (channel.members === 0 && channel !== this.lobbyArray[this.lobbyArray.length - 1]) {
          const mainLobbyDiscordChannel = await this.client.channels.fetch(channel.ids[0]);
          const radiantDiscordChannel = await this.client.channels.fetch(channel.ids[1]);
          const direDiscordChannel = await this.client.channels.fetch(channel.ids[2]);

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
          const mainLobbyDiscordChannel = await this.client.channels.fetch(channel.ids[0]);
          const radiantDiscordChannel = await this.client.channels.fetch(channel.ids[1]);
          const direDiscordChannel = await this.client.channels.fetch(channel.ids[2]);

          await mainLobbyDiscordChannel.edit({ name: `🤍 Main Lobby #${channel.order - deletedCount}` });
          await radiantDiscordChannel.edit({ name: `Team Radiant #${channel.order - deletedCount}` });
          await direDiscordChannel.edit({ name: `Team Dire #${channel.order - deletedCount}` });

          channel.order = channel.order - deletedCount;
        }
      }
      this.lobbyArray = this.lobbyArray.filter((x) => !x.deleted);
      // check if we need another lobby channel
      if (this.lobbyArray[this.lobbyArray.length - 1].members !== 0) {
        await this.addLobbyArrayChannel(guild);
      }

      // clean up extra team channels
      deletedCount = 0;
      for (const channel of this.teamArray) {
        if (channel.members === 0 && channel !== this.teamArray[this.teamArray.length - 1]) {
          const discordChannel = await this.client.channels.fetch(channel.id);
          await discordChannel.delete();

          deletedCount++;

          deletedIds.push(channel.id);

          channel.deleted = true;

          continue;
        }

        if (deletedCount > 0) {
          // alter the names
          const discordChannel = await this.client.channels.fetch(channel.id);
          await discordChannel.edit({ name: `Team #${channel.order - deletedCount}` });

          channel.order = channel.order - deletedCount;
        }
      }
      this.teamArray = this.teamArray.filter((x) => !x.deleted);
      // check if we need another team channel
      if (this.teamArray[this.teamArray.length - 1].members !== 0) {
        await this.addTeamArrayChannel(guild);
      }

      // clean up extra general channels
      deletedCount = 0;
      for (const channel of this.generalArray) {
        if (channel.members === 0 && channel !== this.generalArray[this.generalArray.length - 1]) {
          const discordChannel = await this.client.channels.fetch(channel.id);
          await discordChannel.delete();

          deletedCount++;

          deletedIds.push(channel.id);

          channel.deleted = true;

          continue;
        }

        if (deletedCount > 0) {
          // alter the names
          const discordChannel = await this.client.channels.fetch(channel.id);
          await discordChannel.edit({ name: `General #${channel.order - deletedCount}` });

          channel.order = channel.order - deletedCount;
        }
      }
      this.generalArray = this.generalArray.filter((x) => !x.deleted);
      // check if we need another general channel
      if (this.generalArray[this.generalArray.length - 1].members !== 0) {
        await this.addGeneralArrayChannel(guild);
      }

      for (const deletedId of deletedIds) {
        delete this.watchingVoiceChannels[deletedId];
      }
    });
  }

  scheduleVoiceChannelUpdater () {
    new CronJob('30 */5 * * * *', async () => {
      await this.createVoiceChannelHandling();
    }, null, true, 'America/New_York');
  }

  async voiceStateUpdate ({ oldState, newState }) {
    // Node will attempt to "multi-thread" event handlers like this at awaits. So
    // if one person joins a channel then a second person joins a second later, when the first persons
    // handler hits an await, it switches to the second, which is bad. We mutex them to ensure the voicechannels object
    // and the actual channels themselves arent getting edited by two callbacks at once
    await this.mutex.runExclusive(async () => {
      // dont care if they are changing state in the same channel
      if (newState.channelID === oldState.channelID) {
        return;
      }

      // if they leave a lobby group channel into another lobbygroup channel (Team Dire #1 to Team Radiant #1 for example)
      if (this.watchingVoiceChannels.hasOwnProperty(newState.channelID) && this.watchingVoiceChannels.hasOwnProperty(oldState.channelID)) {
        if (this.watchingVoiceChannels[newState.channelID] === this.watchingVoiceChannels[oldState.channelID]) {
          let channelArray;
          if (this.watchingVoiceChannels[newState.channelID] === 'lobbyArray') {
            const joinedChannel = this.lobbyArray.find((c) => {
              return (c.ids && c.ids.includes(newState.channelID));
            });

            const leftChannel = this.lobbyArray.find((c) => {
              return (c.ids && c.ids.includes(oldState.channelID));
            });

            if (joinedChannel === leftChannel) {
              return;
            }
          }
        }
      }

      // joining a watched channel
      if (this.watchingVoiceChannels.hasOwnProperty(newState.channelID)) {
        let channelArray;
        if (this.watchingVoiceChannels[newState.channelID] === 'lobbyArray') {
          channelArray = this.lobbyArray;
        } else if (this.watchingVoiceChannels[newState.channelID] === 'generalArray') {
          channelArray = this.generalArray;
        } else if (this.watchingVoiceChannels[newState.channelID] === 'teamArray') {
          channelArray = this.teamArray;
        }

        const joinedChannel = channelArray.find((c) => {
          return c.id === newState.channelID || (c.ids && c.ids.includes(newState.channelID));
        });

        if (!joinedChannel) {
          console.error(`big problem, couldnt find ${newState.channelID} channel in channelArray: ${channelArray}`);
        }

        // if the channel is empty we are going to need to add a new one
        if (joinedChannel.members < 1) {
          // FN: add a new channel(s) relative to channel
          const guild = await this.client.guilds.fetch(process.env.DFZ_GUILD);
          // gotta do special stuff for each type of lobby
          if (channelArray === this.lobbyArray) {
            await this.addLobbyArrayChannel(guild);
          } else if (channelArray === this.teamArray) {
            await this.addTeamArrayChannel(guild);
          } else if (channelArray === this.generalArray) {
            await this.addGeneralArrayChannel(guild);
          }

          joinedChannel.members++;
        } else {
          // they are joining a channel that already has people in it, dont need to do much
          joinedChannel.members++;
        }
      }

      // leaving a watched channel
      if (this.watchingVoiceChannels.hasOwnProperty(oldState.channelID)) {
        let channelArray;
        if (this.watchingVoiceChannels[oldState.channelID] === 'lobbyArray') {
          channelArray = this.lobbyArray;
        } else if (this.watchingVoiceChannels[oldState.channelID] === 'generalArray') {
          channelArray = this.generalArray;
        } else if (this.watchingVoiceChannels[oldState.channelID] === 'teamArray') {
          channelArray = this.teamArray;
        }

        const leftChannel = channelArray.find((c) => {
          return c.id === oldState.channelID || (c.ids && c.ids.includes(oldState.channelID));
        });

        if (!leftChannel) {
          console.error(`big problem, couldnt find ${oldState.channelID} channel in channelArray: ${channelArray}`);
        }

        if (leftChannel.members > 1 || channelArray.length === 1) {
          // leaving a channel with people in it, dont need to do much
          leftChannel.members--;
        } else {
          const guild = await this.client.guilds.fetch(process.env.DFZ_GUILD);

          // last one to leave the channel, time to delete stuff
          // loop through all the channels, if its the one they left, delete it, then
          // reduce the numbers of the following lobbies by 1

          if (channelArray === this.lobbyArray) {
            let deleted = false;
            for (const channel of this.lobbyArray) {
              if (channel === leftChannel) {
                const leftMainLobbyDiscordChannel = await this.client.channels.fetch(channel.ids[0]);
                const leftRadiantDiscordChannel = await this.client.channels.fetch(channel.ids[1]);
                const leftDireDiscordChannel = await this.client.channels.fetch(channel.ids[2]);

                await leftMainLobbyDiscordChannel.delete();
                await leftRadiantDiscordChannel.delete();
                await leftDireDiscordChannel.delete();

                deleted = true;
                continue;
              }

              if (deleted) {
                // alter the names
                const mainLobbyDiscordChannel = await this.client.channels.fetch(channel.ids[0]);
                const radiantDiscordChannel = await this.client.channels.fetch(channel.ids[1]);
                const direDiscordChannel = await this.client.channels.fetch(channel.ids[2]);

                await mainLobbyDiscordChannel.edit({ name: `🤍 Main Lobby #${channel.order - 1}` });
                await radiantDiscordChannel.edit({ name: `Team Radiant #${channel.order - 1}` });
                await direDiscordChannel.edit({ name: `Team Dire #${channel.order - 1}` });

                channel.order--;
              }
            }

            this.lobbyArray = this.lobbyArray.filter((l) => l !== leftChannel);

            delete this.watchingVoiceChannels[leftChannel.ids[0]];
            delete this.watchingVoiceChannels[leftChannel.ids[1]];
            delete this.watchingVoiceChannels[leftChannel.ids[2]];
          } else if (channelArray === this.teamArray) {
            let deleted = false;
            for (const channel of this.teamArray) {
              if (channel === leftChannel) {
                const leftDiscordChannel = await this.client.channels.fetch(channel.id);
                await leftDiscordChannel.delete();

                deleted = true;
                continue;
              }

              if (deleted) {
                // alter the names
                const discordChannel = await this.client.channels.fetch(channel.id);
                await discordChannel.edit({ name: `Team #${channel.order - 1}` });

                channel.order--;
              }
            }

            this.teamArray = this.teamArray.filter((l) => l !== leftChannel);

            delete this.watchingVoiceChannels[leftChannel.id];
          } else if (channelArray === this.generalArray) {
            let deleted = false;
            for (const channel of this.generalArray) {
              if (channel === leftChannel) {
                const leftDiscordChannel = await this.client.channels.fetch(channel.id);
                await leftDiscordChannel.delete();

                deleted = true;
                continue;
              }

              if (deleted) {
                // alter the names
                const discordChannel = await this.client.channels.fetch(channel.id);
                await discordChannel.edit({ name: `General #${channel.order - 1}` });

                channel.order--;
              }
            }

            this.generalArray = this.generalArray.filter((l) => l !== leftChannel);

            delete this.watchingVoiceChannels[leftChannel.id];
          }
        }
      }

      return;
    });
  }
}

module.exports = VoiceChannelCtrl;
