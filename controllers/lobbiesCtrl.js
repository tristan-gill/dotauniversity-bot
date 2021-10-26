const CronJob = require('cron').CronJob;
const Discord = require('discord.js');

class LobbiesCtrl {
  constructor (models, client, controllers) {
    this.models = models;
    this.client = client;
    this.controllers = controllers;
  }

  async cronScheduleLobbies () {
    const scheduledLobbyRecords = await this.models.ScheduledLobby.findAll();

    for (const scheduledLobbyRecord of scheduledLobbyRecords) {
      await this.cronScheduleLobby(scheduledLobbyRecord.toJSON());
    }
  }

  async cronScheduleLobby (scheduledLobby) {
    // schedule post 4h before
    const cronStringSignup = `${scheduledLobby.min} ${parseInt(scheduledLobby.hour) - 4} ${scheduledLobby.day_of_month} ${scheduledLobby.month} ${scheduledLobby.day_of_week}`;

    new CronJob(cronStringSignup, () => {
      console.log('scheduledLobby', scheduledLobby);
      // postLobby(scheduledLobby.args); //TODO args no longer exist
    }, null, true, 'America/New_York');
  }

  generateEmbed (lobby) {
    let playerCount = 0;
    for (const playerList of lobby.fields) {
      playerCount += playerList.length;
    }

    const lockedString = lobby.locked ? '🔒 ' : '';
    const regionString = lobby.region ? lobby.region + ' ' : '';

    const embed = new Discord.MessageEmbed();
    embed.setColor('GOLD');
    embed.setAuthor(`${lockedString}${regionString}${lobby.text} - (${playerCount})`);
    embed.setDescription(`Tiers: ${tiersString}`);

    for (let i = 0; i < lobby.fields.length; i++) {
      if (lobby.fields[i].length < 1) {
        embed.addField(`Lobby ${i+1}`, '-');
      } else {
        const playersString = lobby.fields[i].map((player) => {
          return `<@${player.id}>`;
        }).join(' ');

        embed.addField(`Lobby ${i+1}`, playersString || '-');
      }
    }

    const coachesString = lobby.coaches.map((coach) => {
      return `<@${coach}>`;
    }).join(' ');

    embed.addField('Coaches', coachesString || '-');

    if (lobby.id) {
      embed.setFooter(lobby.id);
    }

    return embed;
  }

  // the list of people signed up to dm
  getPostPrintString (lobby) {
    const lobbyStrings = [];

    for (let j = 0; j < lobby.fields.length; j++) {
      const players = [...lobby.fields[j]];

      lobbyStrings.push(`**Lobby ${j+1}**\n`);

      // TODO possible sorting here

      const playersRoleBox = players.map((player) => {
        const rolesArray = [];
        for (let i = 1; i <= 5; i++) {
          rolesArray.push(`${player.roles.includes(i) ? i : ' '}`)
        }

        const rolesString = rolesArray.join(' ');

        return `\`${rolesString}\`|\`T${queuableRoles.indexOf(player.tierId)}\` <@!${player.id}>`;
      }).join('\n');

      lobbyStrings.push(`${playersRoleBox}\n`);
    }

    return lobbyStrings.join('');
  }

  async loadPastLobbies () {
    const lobbyRecords = await this.models.Lobby.findAll({
      attributes: ['id']
    });

    this.lobbyIds = lobbyRecords.map((lobbyRecord) => lobbyRecord.get('id'));
  }

  async messageReactionAdd({
    isAdmin,
    isCoach,
    isGradCoach,
    reaction,
    user
  }) {
    // const lobbyRecord = await this.models.Lobby.findByPk(reaction.message.id);

    // if (!lobbyRecord) {
    //   return;
    // }

    // const lobby = lobbyRecord.toJSON();
    // console.log({lobby})

    //TODO
    const hasBeginnerTier = await this.controllers.MasteryCtrl.hasBeginnerTier({ user });
    if (hasBeginnerTier) {
      // if has beginner tier x role, remove it and add tokens
      await this.controllers.MasteryCtrl.convertBeginnerTierUserToTokens({
        user
      });
    }

    // if has tokens
    // then send dm about spending them

    return;

    // if (isCoach || isAdmin || isGradCoach) {
    //   console.log(`${user.id} reacted with ${reaction.emoji.name}`);
    //   if (reaction.emoji.name === '✅') {
    //     // remind
    //     // for each group in the post
    //     for (let l = 0; l < lobby.fields.length; l++) {
    //       if (lobby.fields[l].length >= 10 || l === 0) {
    //         const voiceChannel = await client.channels.fetch(lobbyArray[0].ids[0]);
    //         const channelInvite = await voiceChannel.createInvite();

    //         // send to the coach/reacter
    //         await user.send(`**Lobby reminder!**\nHead over to the voice channel: ${channelInvite.url}`);

    //         for (const player of lobby.fields[l]) {
    //           const u = await client.users.fetch(player.id);
    //           await u.send(`**Lobby reminder!**\nHead over to the voice channel: ${channelInvite.url}`);
    //         }
    //       }
    //     }

    //     return reaction.users.remove(user);
    //   } else if (reaction.emoji.name === '🗒️') {
    //     // print
    //     const postString = getPostPrintString(lobby);
    //     await user.send(postString);
    //     return reaction.users.remove(user);
    //   } else if (reaction.emoji.name === '🔒') {
    //     if (lobby.locked) {
    //       // do nothing, no unlocking
    //     } else {
    //       // lock
    //       lobby.locked = !lobby.locked;
    //       await lobbyRecord.destroy();
    //     }

    //     const embed = generateEmbed(lobby);
    //     await reaction.message.edit(embed);

    //     return reaction.users.remove(user);
    //   } else if (reaction.emoji.name === '📚') {
    //     if (lobby.coaches.includes(user.id)) {
    //       lobby.coaches = lobby.coaches.filter((coach) => coach !== user.id);
    //     } else {
    //       lobby.coaches.push(user.id);
    //     }

    //     await saveLobby({
    //       id: lobby.id,
    //       data: lobby
    //     });

    //     const embed = generateEmbed(lobby);
    //     await reaction.message.edit(embed);

    //     return reaction.users.remove(user);
    //   } else {
    //     // lets see if the coach/admin clicked 12345
    //     const positionNumber = emojiNumbers.indexOf(reaction.emoji.name);

    //     if (positionNumber && positionNumber >= 1 && positionNumber <= 5) {
    //       // ok so coach clicked on one of the numbers, lets add or remove the beginner tier corresponding to that number
    //       const clickedTier = queuableRoles[positionNumber];

    //       // could be more efficient i think
    //       if (lobby.tiers.includes(clickedTier)) {
    //         lobby.tiers = lobby.tiers.filter((tier) => tier !== clickedTier);

    //         await saveLobby({
    //           id: lobby.id,
    //           data: lobby
    //         });

    //         const embed = generateEmbed(lobby);
    //         await reaction.message.edit(embed);
    //       } else {
    //         lobby.tiers.push(clickedTier);

    //         await saveLobby({
    //           id: lobby.id,
    //           data: lobby
    //         });

    //         const embed = generateEmbed(lobby);
    //         await reaction.message.edit(embed);
    //       }
    //     }

    //     return reaction.users.remove(user);
    //   }
    // }

    // if (!tier || !lobby.tiers.includes(tier.id)) {
    //   return reaction.users.remove(user);
    // }

    // const positionNumber = emojiNumbers.indexOf(reaction.emoji.name);

    // if (positionNumber < 1 || positionNumber > 5) {
    //   return reaction.users.remove(user);
    // }

    // if (!lobby) {
    //   return reaction.users.remove(user);
    // }

    // if (lobby.locked) {
    //   return reaction.users.remove(user);
    // }

    // // if already signed up, update roles
    // for (const players of lobby.fields) {
    //   const player = players.find((player) => player.id === user.id);

    //   if (player) {
    //     if (player.roles.includes(positionNumber)) {
    //       // do nothing? this shouldnt happen
    //       return;
    //     } else {
    //       player.roles.push(positionNumber);

    //       return await saveLobby({
    //         id: lobby.id,
    //         data: lobby
    //       });
    //     }
    //   }
    // }

    // // not yet signed up, add them
    // await addToLobby(lobby, user, reaction, tier, positionNumber);
  }

  async postLobby (region, title) {
    const lobby = {
      coaches: [],
      fields: [
        []
      ],
      text: freeText,
      locked: false,
      region
    };

    let channel;
    if (region === 'EU') {
      channel = await this.client.channels.fetch(process.env.EU_LOBBY_CHANNEL);
    } else if (region === 'NA') {
      channel = await this.client.channels.fetch(process.env.NA_LOBBY_CHANNEL);
    } else if (region === 'SEA') {
      channel = await this.client.channels.fetch(process.env.SEA_LOBBY_CHANNEL);
    } else {
      console.error('unknown region: ', region);
      return;
    }

    await channel.send('**New scheduled lobby!**\nReact to the message below with the number(s) corresponding to the roles you would like to play.');

    const embed = this.generateEmbed(lobby);
    const message = await channel.send(embed);

    lobby.id = message.id;
    // lobbies.push(lobby); //TODO?

    await this.models.Lobby.upsert({
      id: message.id,
      data: lobby
    });

    await message.react('1️⃣');
    await message.react('2️⃣');
    await message.react('3️⃣');
    await message.react('4️⃣');
    await message.react('5️⃣');
    await message.react('📚');
    await message.react('🗒️');
    await message.react('✅');
    await message.react('🔒');

    return lobby;
  }
}

module.exports = LobbiesCtrl;
