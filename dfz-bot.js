require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client();
const moment = require('moment');

const express = require('express');

// Database stuff
const Pool = require('pg').Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

// express stuff to keep heroku happy
const PORT = process.env.PORT || 5000
express().listen(PORT, () => console.log(`Listening on ${ PORT }`));

const PREFIX = '!';

const queuableRoles = [process.env.COACH, process.env.TIER_ONE, process.env.TIER_TWO, process.env.TIER_THREE, process.env.TIER_FOUR, process.env.TIER_GRAD];
const emojiNumbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const voiceChannels = [process.env.DFZ_VC_1, process.env.DFZ_VC_2, process.env.DFZ_VC_3, process.env.DFZ_VC_4];

const questionAnswerableIds = [process.env.COACH, process.env.DFZ_ADMIN, process.env.DFZ_QA_CONTRIBUTOR];

// array of lobby posts
let lobbies;

client.once('ready', async () => {
  lobbies = [];
  console.log('Ready!');

  await loadPastLobbies();
});

const commandForName = {};

// lobby database commands
const loadPastLobbies = async () => {
  const channel = await client.channels.get(process.env.DFZ_LOBBY_CHANNEL);

  // Get the saved lobbies from the database
  const dbLobbies = await getLobbies();

  for (const lobby of dbLobbies) {
    lobbies.push(lobby);

    // need to fetch the messages to add them to the
    const test = await channel.fetchMessage(lobby.id);
  }
}

const saveLobby = async (lobby) => {
  const text = `
    insert into lobbies(id, data)
    values ($1, $2)
    on conflict on constraint lobbies_pkey
    do update
    set data = $2;
  `;
  const values = Object.values(lobby);
  await pool.query(text, values);
}

const getLobbies = async () => {
  const query = 'select data from lobbies;';

  const response = await pool.query(query);

  return response.rows.map((row) => {
    return row.data;
  });
}

const deleteLobby = async (messageId) => {
  const query = `delete from lobbies where id = '${messageId}';`;
  const response = await pool.query(query);

  lobbies = lobbies.filter((lobby) => {
    return lobby.id !== messageId;
  });
}

/*
lobby = {
  fields: [[]], // an array of player object arrays
  tiers: [], // array of ints corresponding to tiers
  text: '', // a string for the lobby title
  locked: false // lock the lobby post after its done, removing it from the database
}

player = {
  id
  joinTime
  tierNumber
  roles
}
*/

//!post 12345 [NA 9:00pm EDT]
commandForName['post'] = {
  execute: async (msg, args) => {
    if (msg.channel instanceof Discord.DMChannel) {
      return;
    }

    const isCoach = msg.member.roles.some((role) => role.id === process.env.COACH);
    if (!isCoach && msg.channel.id !== process.env.DFZ_COACHES_CHANNEL) {
      return msg.channel.send('Sorry, only coaches can manage this.');
    }

    const tiersJoined = args[0];
    const freeText = args.slice(1).join(' ');

    const tiers = [];
    for (const tierString of tiersJoined) {
      const tier = parseInt(tierString);
      if (isNaN(tier) || tier < 1 || tier > 5) {
        return msg.channel.send('Incorrect format: \`!post 12345 [free text fields]\`');
      }

      tiers.push(queuableRoles[tier]);
    }

    const lobby = {
      fields: [
        []
      ],
      tiers,
      text: freeText,
      locked: false
    };

    const channel = await client.channels.get(process.env.DFZ_LOBBY_CHANNEL);

    const tiersString = tiers.map((tier) => {
      return `<@&${tier}>`;
    }).join(' ');

    await channel.send(`**New scheduled lobby!**\nReact to the message below with the number(s) corresponding to the roles you would like to play.\n${tiersString}`);

    const embed = generateEmbed(lobby);
    const message = await channel.send(embed);

    lobby.id = message.id;

    lobbies.push(lobby);

    await saveLobby({
      id: message.id,
      data: lobby
    });

    await message.react('1️⃣');
    await message.react('2️⃣');
    await message.react('3️⃣');
    await message.react('4️⃣');
    await message.react('5️⃣');
    await message.react('✅');
    await message.react('🗒️');
    await message.react('🔒');
  }
}

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) {
    return;
  }

  const lobby = lobbies.find((lobby) => lobby.id === reaction.message.id);

  if (!lobby) {
    return;
  }

  const guildUser = await reaction.message.channel.guild.fetchMember(user.id);
  const tier = guildUser.roles.find((role) => queuableRoles.includes(role.id));

  // if is a coach
  const isCoach = guildUser.roles.some((role) => role.id === process.env.COACH);
  const isAdmin = guildUser.roles.some((role) => role.id === process.env.DFZ_ADMIN);

  if (isCoach || isAdmin) {
    if (reaction.emoji.name === '✅') {
      // remind
      // for each group in the post
      for (let l = 0; l < lobby.fields.length; l++) {
        if (lobby.fields[l].length >= 10) {
          const voiceChannel = await client.channels.get(voiceChannels[0]).createInvite();

          // send to the coach/reacter
          await user.send(`**Lobby reminder!**\nHead over to the voice channel: ${voiceChannel.url}`);

          for (const player of lobby.fields[l]) {
            const u = client.users.get(player.id);
            await u.send(`**Lobby reminder!**\nHead over to the voice channel: ${voiceChannel.url}`);
          }
        }
      }

      return reaction.remove(user);
    } else if (reaction.emoji.name === '🗒️') {
      // print
      await user.send(getPostPrintString(lobby));
      return reaction.remove(user);
    } else if (reaction.emoji.name === '🔒') {
      if (lobby.locked) {
       // do nothing, no unlocking
      } else {
        // lock
        lobby.locked = !lobby.locked;
        await deleteLobby(lobby.id);
      }

      const embed = generateEmbed(lobby);
      await reaction.message.edit(embed);

      return reaction.remove(user);
    } else {
      return reaction.remove(user);
    }
  }

  if (!tier || !lobby.tiers.includes(tier.id)) {
    console.log('wrong tier breh')
    return reaction.remove(user);
  }

  const positionNumber = emojiNumbers.indexOf(reaction.emoji.name);

  if (positionNumber < 1 || positionNumber > 5) {
    console.log('wrong reaction')
    return reaction.remove(user);
  }

  if (!lobby) {
    return reaction.remove(user);
  }

  if (lobby.locked) {
    return reaction.remove(user);
  }

  // if already signed up, update roles
  for (const players of lobby.fields) {
    const player = players.find((player) => player.id === user.id);

    if (player) {
      if (player.roles.includes(positionNumber)) {
        // do nothing? this shouldnt happen
        return;
      } else {
        player.roles.push(positionNumber);

        return await saveLobby({
          id: lobby.id,
          data: lobby
        });
      }
    }
  }

  // not yet signed up, add them
  await addToLobby(lobby, user, reaction, tier, positionNumber);
});

// no nice event handler for reaction removal, raw looks at all discord events
client.on('raw', async (event) => {
  if (event.t === 'MESSAGE_REACTION_REMOVE') {
    const { d: data } = event;

    const user = client.users.get(data.user_id);

    if (user.bot || !isWatchingChannel(data.channel_id)) {
      return;
    }

    const lobby = lobbies.find((lobby) => lobby.id === data.message_id);

    if (!lobby) {
      return;
    }

    const message = await client.channels.get(process.env.DFZ_LOBBY_CHANNEL).fetchMessage(data.message_id);
    const positionNumber = emojiNumbers.indexOf(data.emoji.name);

    if (positionNumber < 1 || positionNumber > 5) {
      console.log('wrong reaction')
      return;
    }

    // find the user
    for (const players of lobby.fields) {
      const player = players.find((player) => player.id === user.id);

      if (player) {
        // remove the role
        player.roles = player.roles.filter((posNum) => posNum !== positionNumber);

        // if the player has no roles left, remove them from the post
        if (player.roles.length < 1) {
          // remove the user from this lobby
          await removeFromLobby(lobby, user, message);
        }

        await saveLobby({
          id: lobby.id,
          data: lobby
        });

        return;
      }
    }
  }
});

const addToLobby = async (lobby, user, reaction, tier, positionNumber) => {
  const player = {
    id: user.id,
    tierId: tier.id,
    signupTime: moment(),
    roles: [positionNumber]
  };

  // which field they are going into
  let fieldIndex = lobby.fields.findIndex((playerList) => playerList.length < 10);

  if (fieldIndex < 0) {
    // need a new field for this person
    lobby.fields.push([]);

    fieldIndex = lobby.fields.length - 1;
  }

  // if this field has 9 players in it, sort it, and the previous fields
  const sortFields = lobby.fields[fieldIndex].length === 9;

  lobby.fields[fieldIndex].push(player);

  if (sortFields) {
    const allPlayers = [];
    for (let i = 0; i <= fieldIndex; i++) {
      allPlayers.push(...lobby.fields[i]);
    }

    allPlayers.sort((a, b) => {
      return queuableRoles.indexOf(a.tierId) - queuableRoles.indexOf(b.tierId);
    });

    const newFields = [];
    for (let i = 0; i < allPlayers.length; i += 10) {
      newFields.push(allPlayers.slice(i, i + 10));
    }

    lobby.fields = newFields;
  }

  await saveLobby({
    id: lobby.id,
    data: lobby
  });

  const embed = generateEmbed(lobby);
  await reaction.message.edit(embed);
}

const removeFromLobby = async (lobby, user, message) => {
  // re-sort the whole thing by signup time, let add function handle tier sorting
  const allPlayers = [];
  for (let i = 0; i < lobby.fields.length; i++) {
    allPlayers.push(...lobby.fields[i]);
  }

  const index = allPlayers.findIndex((player) => player.id === user.id);
  allPlayers.splice(index, 1);

  allPlayers.sort((a, b) => {
    if (a.signupTime.isBefore(b.signupTime)) {
      return -1;
    }
    return 1;
  });

  const newFields = [];
  if (allPlayers.length === 0) {
    lobby.fields = [[]];
  } else {
    for (let i = 0; i < allPlayers.length; i += 10) {
      newFields.push(allPlayers.slice(i, i + 10));
    }

    lobby.fields = newFields;
  }

  const embed = generateEmbed(lobby);
  await message.edit(embed);
}

const generateEmbed = (lobby) => {
  let playerCount = 0;
  for (const playerList of lobby.fields) {
    playerCount += playerList.length;
  }

  const tiersString = lobby.tiers.map((tier) => {
    return `<@&${tier}>`;
  }).join(' ');

  const lockedString = lobby.locked ? '🔒 ' : '';

  const embed = new Discord.RichEmbed();
  embed.setColor('GOLD');
  embed.setAuthor(`${lockedString}${lobby.text} - (${playerCount})`);
  embed.setDescription(`Tiers: ${tiersString}`);

  for (let i = 0; i < lobby.fields.length; i++) {
    if (lobby.fields[i].length < 1) {
      embed.addField(`Lobby ${i+1}`, '-');
    } else {
      const playersString = lobby.fields[i].map((player) => {
        return `<@${player.id}>`;
      }).join(' ');

      embed.addField(`Lobby ${i+1}`, playersString);
    }
  }

  return embed;
}

// the list of people that gets dmed to people on the print react
const getPostPrintString = (lobby) => {
  const lobbyStrings = [];

  for (let j = 0; j < lobby.fields.length; j++) {
    const players = [...lobby.fields[j]];

    lobbyStrings.push(`**Lobby ${j+1}**\n`);

    players.sort((a, b) => {
      const aTier = queuableRoles.indexOf(a.tierId);
      const bTier = queuableRoles.indexOf(b.tierId);

      if (aTier === bTier) {
        const aNumRoles = a.roles.length;
        const bNumRoles = b.roles.length;

        if (aNumRoles === bNumRoles) {
          return a.roles[0] - b.roles[0];
        } else {
          return aNumRoles - bNumRoles;
        }
      } else {
        return bTier - aTier;
      }
    });

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

// Q and A stuff

// !ask Blah blah blah blah
commandForName['ask'] = {
  execute: async (msg, args) => {
    const guild = await client.guilds.get(process.env.DFZ_GUILD);
    const author = await guild.fetchMember(msg.author);

    if (!author) {
      // not from dfz
      return;
    }

    const question = args.join(' ');

    const qaChannel = await client.channels.get(process.env.DFZ_QA_CHANNEL);

    const embed = generateQAEmbed(question, author);

    const questionMessage = await qaChannel.send(embed);

    await questionMessage.edit(generateQAEmbed(question, author, questionMessage.id));
  }
}

// !answer <messageId> response
commandForName['answer'] = {
  execute: async (msg, args) => {
    const guild = await client.guilds.get(process.env.DFZ_GUILD);
    const author = await guild.fetchMember(msg.author);

    const canAnswer = author.roles.some((role) => questionAnswerableIds.includes(role.id));

    if (!author || !canAnswer) {
      // not allowed to answer
      return;
    }

    const messageId = args[0];
    const answer = args.slice(1).join(' ');

    const qaChannel = await client.channels.get(process.env.DFZ_QA_CHANNEL);

    const questionMessage = await qaChannel.fetchMessage(messageId);

    if (questionMessage && questionMessage.embeds && questionMessage.embeds.length > 0) {
      const oldEmbed = questionMessage.embeds[0];

      const embed = new Discord.RichEmbed();
      embed.setColor([193, 109, 255]);
      embed.setDescription(oldEmbed.description);
      embed.setAuthor(oldEmbed.author.name, oldEmbed.author.iconURL);
      embed.setFooter(oldEmbed.footer.text);

      for (const field of oldEmbed.fields) {
        embed.addField(field.name, field.value);
      }

      embed.addField(author.nickname || author.user.username, answer);

      await questionMessage.edit(embed);
    }
  }
}

const generateQAEmbed = (questionText, author, footerText, answer) => {
  const embed = new Discord.RichEmbed();
  embed.setColor([193, 109, 255]);
  embed.setDescription(questionText);
  embed.setAuthor(author.nickname || author.user.username, avatarUrl(author.user.id, author.user.avatar));

  if (footerText) {
    embed.setFooter(footerText);
  }

  return embed;
}

const avatarUrl = (userId, avatarString) => {
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarString}.png`
}

function isOwner (userId) {
  return userId === process.env.OWNER_DISCORD_ID;
}

function isWatchingChannel (discord_id) {
  return (
    process.env.DFZ_LOBBY_CHANNEL === discord_id ||
    process.env.DFZ_COACHES_CHANNEL === discord_id
  );
}

client.on('message', async (msg) => {
  try {
    // not watching and not a dm
    if (!isWatchingChannel(msg.channel.id) && !(msg.channel instanceof Discord.DMChannel)) {
      return;
    }

    const content = msg.content;

    // Ignore any message that doesn't start with the correct prefix.
    if (!content.startsWith(PREFIX)) {
      return;
    }

    // Ignore messages from self
    if (msg.author.id === process.env.SELF_DISCORD_ID) {
      return;
    }

    // Extract the name of the command
    const parts = content.split(' ').map(s => s.trim()).filter(s => s);

    const commandName = parts[0].substr(PREFIX.length);

    // Get the requested command, if there is one.
    const command = commandForName[commandName];
    if (!command) {
      return;
    }

    if (command.owner && !isOwner(msg.author.id)) {
      return await msg.reply('Only the owner can use that command');
    }

    // Separate the command arguments from the command prefix and name.
    const args = parts.slice(1);

    // Execute the command.
    await command.execute(msg, args);
  } catch (err) {
    console.warn('Error handling message create event');
    console.warn(err);
  }
});

module.exports.client = client;
