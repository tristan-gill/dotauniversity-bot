require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client();
const moment = require('moment');
const Mutex = require('async-mutex').Mutex;
const express = require('express');
const CronJob = require('cron').CronJob;

// Database stuff
const Pool = require('pg').Pool;
const pool = new Pool({
  connectionString: process.env.HEROKU_POSTGRESQL_ONYX_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// express stuff to keep heroku happy
const PORT = process.env.PORT || 5000
express().listen(PORT, () => console.log(`Listening on ${ PORT }`));

const PREFIX = '!';

const queuableRoles = [process.env.COACH, process.env.TIER_ONE, process.env.TIER_TWO, process.env.TIER_THREE, process.env.TIER_FOUR, process.env.TIER_GRAD, process.env.TIER_TRYOUT];
const emojiNumbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const beginnerTiers = [process.env.TIER_ONE, process.env.TIER_TWO, process.env.TIER_THREE, process.env.TIER_FOUR, process.env.TIER_GRAD]

const questionAnswerableIds = [process.env.COACH, process.env.DFZ_ADMIN, process.env.DFZ_QA_CONTRIBUTOR];

// channels that the bot will show the tip message in
/*
 * admin-chat           731171811437445152
 * internal-talk        731171811437445153
 * beep-boop            731171811437445154
 * general              731171811437445160
 * looking-for-group    731171811647291456
 * bot-chat             731171811647291457
 * dota2-talk           731171811647291460
 * esports-discussions  731171811844161608
 * bot-practice         731171812024778842
 * lobby-discussions    731171812024778843
 * eu-general           731171812238557203
 * na-general           731171812481957923
 * sea-general          731171812666245222
 * eu-coaches           731171812481957920
 * na-coaches           731171812481957926
 * sea-coaches          731171812666245223
 * memes-and-dreams     731171812666245225
 * art-station          731171812666245226
 * anime-channel        731171812666245227
 * muted-text-channel   731171812666245229
 */
const whitelistedTipChannels = {
  '731171811437445152': true,
  '731171811437445153': true,
  '731171811437445154': true,
  '731171811437445160': true,
  '731171811647291456': true,
  '731171811647291457': true,
  '731171811647291460': true,
  '731171811844161608': true,
  '731171812024778842': true,
  '731171812024778843': true,
  '731171812238557203': true,
  '731171812481957923': true,
  '731171812666245222': true,
  '731171812481957920': true,
  '731171812481957926': true,
  '731171812666245223': true,
  '731171812666245225': true,
  '731171812666245226': true,
  '731171812666245227': true,
  '731171812666245229': true

  // testing
  // '742948255695896678': true
};

// array of lobby posts
let lobbies;
let mutex;

client.once('ready', async () => {
  lobbies = [];
  mutex = new Mutex();

  await createVoiceChannelHandling();
  await scheduleVoiceChannelUpdater();

  await loadPastLobbies();
  await scheduleLobbies();

  console.log('Ready!');
});


// ~~~~~~~~~~~~~~~~ CRON STUFF ~~~~~~~~~~~~~~~~
// 1 - Monday
// 2 - Tuesday
// 3 - Wednesday
// 4 - Thursday
// 5 - Friday
// 6 - Saturday
// 0 - Sunday

const scheduledLobbies = [{
    min: '0',
    hour: '14',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '4,0',
    args: ['12', 'EU', 'lobby at 20:00 CEST // 2PM EDT']
  },
  {
    min: '1',
    hour: '14',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '3',
    args: ['34', 'EU', 'lobby at 20:00 CEST // 2PM EDT']
  },
  {
    min: '0',
    hour: '14',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '1',
    args: ['234', 'EU', 'lobby at 20:00 CEST // 2PM EDT']
  },

  {
    min: '0',
    hour: '21',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '2,5',
    args: ['234', 'NA', 'lobby at 9pm EDT']
  },
  {
    min: '0',
    hour: '21',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '6,0',
    args: ['123', 'NA', 'lobby at 9pm EDT']
  }
];

const scheduleLobbies = async () => {
  for (const scheduledLobby of scheduledLobbies) {
    await scheduleLobby(scheduledLobby);
  }
}

const scheduleLobby = async (scheduledLobby) => {
  // schedule post 4h before
  const cronStringSignup = `${scheduledLobby.min} ${parseInt(scheduledLobby.hour) - 4} ${scheduledLobby.dayOfMonth} ${scheduledLobby.month} ${scheduledLobby.dayOfWeek}`;

  new CronJob(cronStringSignup, () => {
    postLobby(scheduledLobby.args);
  }, null, true, 'America/New_York');

  // 30 mins before send lists
  // at cron time, send out ping
}

const scheduleVoiceChannelUpdater = () => {
  new CronJob('30 */5 * * * *', async () => {
    await createVoiceChannelHandling();
  }, null, true, 'America/New_York');
}

// ~~~~~~~~~~~~~~~~ END CRON STUFF ~~~~~~~~~~~~~~~~


const commandForName = {};


// users / transfer commands
const updateUsersTable = async () => {
  // const dbClient = await pool.connect();

  // const guild = client.guilds.fetch(process.env.DFZ_GUILD);
  // const guildMembers = await guild.fetchMembers();

  // beginnerTiers

  // for (const member of guildMembers.members) {
  //   const role = member.roles.find((role) => beginnerTiers.includes(role.id);
  //   if (role) {

  //   }
  //   await saveUser({
  //     id: member[0],
  //     roles: member[1]._roles,
  //     username: member[1].user.username
  //   }, dbClient);
  // }

  // dbClient.release();
}

const saveUser = async (user, dbClient) => {
  const text = `
    insert into users(id, roles, username)
    values ($1, $2, $3)
    on conflict on constraint users_pkey
    do nothing;
  `;
  const values = Object.values(user);
  await dbClient.query(text, values);
}

// lobby database commands
const loadPastLobbies = async () => {
  const naLobbyChannel = await client.channels.fetch(process.env.NA_LOBBY_CHANNEL);
  const euLobbyChannel = await client.channels.fetch(process.env.EU_LOBBY_CHANNEL);
  const seaLobbyChannel = await client.channels.fetch(process.env.SEA_LOBBY_CHANNEL);
  const tryoutChannel = await client.channels.fetch(process.env.DFZ_TRYOUT_CHANNEL);

  // Get the saved lobbies from the database
  const dbLobbies = await getLobbies();
  for (const lobby of dbLobbies) {
    lobbies.push(lobby);

    // need to fetch the messages to add them to the cache
    try {
      if (lobby.type === 'beginner') {
        if (lobby.region === 'NA') {
          await naLobbyChannel.messages.fetch(lobby.id);
        } else if (lobby.region === 'EU') {
          await euLobbyChannel.messages.fetch(lobby.id);
        } else {
          await seaLobbyChannel.messages.fetch(lobby.id);
        }
      } else if (lobby.type === 'tryout') {
        await tryoutChannel.messages.fetch(lobby.id);
      }
    } catch (err) {
      console.log({
        err
      });
    }
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
  const query = 'select data from lobbies where deleted_at is null;';

  const response = await pool.query(query);

  return response.rows.map((row) => {
    return row.data;
  });
}

const deleteLobby = async (messageId) => {
  const query = `update lobbies set deleted_at = now() where id = '${messageId}';`;
  const response = await pool.query(query);

  lobbies = lobbies.filter((lobby) => {
    return lobby.id !== messageId;
  });
}


/*
lobby = {
  type: '',
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

const regionAlias = {
  na: 'NA',
  NA: 'NA',
  nA: 'NA',
  Na: 'NA',
  eu: 'EU',
  Eu: 'EU',
  eU: 'EU',
  EU: 'EU',
  SEA: 'SEA',
  Sea: 'SEA',
  Aus: 'SEA',
  AUS: 'SEA',
  SeaAus: 'SEA',
  'sea-aus': 'SEA'
};

//!post 12345 [NA 9:00pm EDT]
commandForName['post'] = {
  execute: async (msg, args) => {
    if (msg.channel instanceof Discord.DMChannel) {
      return;
    }

    const isCoach = msg.member.roles.cache.some((role) => role.id === process.env.COACH);

    if (!isCoach && msg.channel.id !== process.env.DFZ_COACHES_CHANNEL) {
      return msg.channel.send('Sorry, only coaches can manage this.');
    }
    if (args.includes("tryout")) {
      await postTryout(args);
    }

    const region = args[1];
    if (!regionAlias.hasOwnProperty(region)) {
      return msg.channel.send('Region should be EU, NA or SEA');
    }

    await postLobby(args);
  }
}

const postLobby = async (args) => {
  const tiersJoined = args[0];
  const region = regionAlias[args[1]];
  const freeText = args.slice(2).join(' ');

  const tiers = [];
  for (const tierString of tiersJoined) {
    const tier = parseInt(tierString);
    if (isNaN(tier) || tier < 1 || tier > 5) {
      return;
    }

    tiers.push(queuableRoles[tier]);
  }

  const lobby = {
    type: 'beginner',
    coaches: [],
    fields: [
      []
    ],
    tiers,
    text: freeText,
    locked: false,
    region
  };

  // const channel = await client.channels.fetch(process.env.DFZ_LOBBY_CHANNEL);
  let channel;
  if (region === 'EU') {
    channel = await client.channels.fetch(process.env.EU_LOBBY_CHANNEL);
  } else if (region === 'NA') {
    channel = await client.channels.fetch(process.env.NA_LOBBY_CHANNEL);
  } else if (region === 'SEA') {
    channel = await client.channels.fetch(process.env.SEA_LOBBY_CHANNEL);
  } else {
    console.error('unknown region', args);
    return;
  }

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
  await message.react('📚');
  await message.react('🗒️');
  await message.react('✅');
  await message.react('🔒');

  return lobby;
}

// Ex: !post tryout at 8/31/2020 23:08:48 PDT
const postTryout = async (args) => {
  const dateText = args.slice(2).join(' ');
  const freeText = args.slice(0).join(' ');

  const tryoutRole = process.env.TIER_TRYOUT
  const timezones = ['America/Los_Angeles', 'America/New_York', 'Europe/Berlin', 'Asia/Singapore'];
  let timeString = '';

  const date = new Date(dateText);
  if (date == "Invalid Date") {
    console.log(date);
    const internalChannel = await client.channels.fetch(process.env.DFZ_COACHES_CHANNEL);
    await internalChannel.send("Invalid Date. Try something like this:```!post tryout at 9/1/2020 15:00 PST\n!post tryout at 9/1/2020 15:00 GMT-0700\n!post tryout at Thu Jan 02 2014 00:00:00 GMT-0600\n```");
    return;
  }
  console.log(date);
  for (i = 0; i < timezones.length; i++) {
    timeString += "  " + date.toLocaleString("en-US", {
      timeZone: timezones[i]
    }) + " " + timezones[i] + "\n";
  }

  const tiers = [];
  tiers.push(tryoutRole);

  const lobby = {
    type: 'tryout',
    coaches: [],
    fields: [
      []
    ],
    tiers,
    text: freeText,
    locked: false
  };

  const channel = await client.channels.fetch(process.env.DFZ_TRYOUT_CHANNEL);

  await channel.send(`**<@&${tryoutRole}> Time!**\nHosting tryouts at:\n${timeString}\nReact with ✳ to the message below if you wanna join. All regions are free to attend.\n`);

  const embed = generateEmbed(lobby);

  const message = await channel.send(embed);

  lobby.id = message.id;

  lobbies.push(lobby);

  await saveLobby({
    id: message.id,
    data: lobby
  });

  await message.react('✳');
  await message.react('📚');
  //  await message.react('🏁');
  await message.react('🔒');

  return lobby;
}


// ~~~~~~~~~~~~~~~~ TIPS STUFF ~~~~~~~~~~~~~~~~

const defaultTips = 3;

const getUsersTips = async (userId, dbClient) => {
  const query = `
    select
      id, current_tips, received_tips
    from users_tips
    where id = '${userId}';
  `;

  const response = await dbClient.query(query);

  if (response.rows && response.rows.length) {
    return response.rows[0];
  }
}

const getTipByMessageId = async (messageId, dbClient) => {
  const query = `
    select
      embed_id
    from tips
    where message_id = '${messageId}';
  `;

  const response = await dbClient.query(query);

  if (response.rows && response.rows.length) {
    return response.rows[0].embed_id;
  }

  return null;
}

const createUsersTips = async (userTips, dbClient) => {
  const text = `
    insert into users_tips(id, current_tips, received_tips)
    values ($1, $2, $3)
    on conflict on constraint users_tips_pkey
    do nothing;
  `;
  const values = Object.values(userTips);
  await dbClient.query(text, values);
}

const decrementCurrentTips = async (userId, dbClient) => {
  const query = `
    UPDATE users_tips
    SET current_tips = current_tips - 1
    WHERE id = '${userId}';
  `;

  await dbClient.query(query);
}

const incrementReceivedTips = async (userId, dbClient) => {
  const query = `
    UPDATE users_tips
    SET received_tips = received_tips + 1
    WHERE id = '${userId}';
  `;

  await dbClient.query(query);
}

const createTip = async (sender_id, receiver_id, message, embed_id, dbClient) => {
  const text = `
    insert into tips(sender_id, receiver_id, message, message_id, embed_id)
    values ($1, $2, $3, $4, $5)
    on conflict on constraint tips_pkey
    do nothing;
  `;

  const values = Object.values({
    sender_id,
    receiver_id,
    message: message.content,
    message_id: message.id,
    embed_id
  });
  await dbClient.query(text, values);
}

const updateTipEmbedMessageId = async (messageId, embedMessageId, dbClient) => {
  const query = `
    UPDATE tips
    SET embed_id = '${embedMessageId}'
    WHERE message_id = '${messageId}';
  `;

  await dbClient.query(query);
}

const generateTipEmbed = (receiver, sender, receiverUsersTips, senderUsersTips, message) => {
  const embed = new Discord.MessageEmbed();
  embed.setColor([222, 97, 1]);

  try {
    embed.setDescription(message.content.substring(0, 2048));
  } catch (err) {
    console.log(err)
  }

  embed.setAuthor(`${receiver.nickname || receiver.username} has been tipped!`, avatarUrl(receiver.id, receiver.avatar));
  embed.setFooter(sender.nickname || sender.username, avatarUrl(sender.id, sender.avatar));

  embed.addField(`To: ${receiver.nickname || receiver.username}`, `available: ${receiverUsersTips.current_tips} - received: ${receiverUsersTips.received_tips}`);
  embed.addField(`Recent tip from: ${sender.nickname || sender.username}`, `available: ${senderUsersTips.current_tips} - received: ${senderUsersTips.received_tips}`);

  embed.setThumbnail('https://cdn.discordapp.com/emojis/743131216475062443.png?v=1');

  return embed;
}

// ~~~~~~~~~~~~~~~~ END TIPS STUFF ~~~~~~~~~~~~~~~~

const messageReactionAdd = async (reaction, user) => {
  if (user.bot) {
    return;
  }

  const guild = await client.guilds.fetch(process.env.DFZ_GUILD);
  const guildUser = await guild.members.fetch({ user, force: true });

  const tier = guildUser.roles.cache.find((role) => queuableRoles.includes(role.id));

  // if is a coach
  const isCoach = guildUser.roles.cache.some((role) => role.id === process.env.COACH);
  const isAdmin = guildUser.roles.cache.some((role) => role.id === process.env.DFZ_ADMIN);
  const isGradCoach = guildUser.roles.cache.some((role) => role.id === process.env.GRAD_COACH);

  // tip handling
  if (reaction.emoji.name === 'Tip') {
    // cant tip urself
    if (user.id === reaction.message.author.id) {
      return reaction.users.remove(user);
    }

    const dbClient = await pool.connect();

    let sendersTips = await getUsersTips(user.id, dbClient);

    // if they dont exits, create with default tips num -1
    if (!sendersTips) {
      sendersTips = {
        id: user.id,
        current_tips: defaultTips - 1,
        received_tips: 0
      };
      await createUsersTips(sendersTips, dbClient);
    } else {
      // they do exist, check available tips
      if (sendersTips.current_tips >= 1) {
        if (!isAdmin) {
          sendersTips.current_tips = sendersTips.current_tips - 1;
          await decrementCurrentTips(user.id, dbClient);
        }
      } else {
        // not enough tips
        dbClient.release();
        return reaction.users.remove(user);
      }
    }

    // add tips
    let receiverTips = await getUsersTips(reaction.message.author.id, dbClient);

    if (!receiverTips) {
      receiverTips = {
        id: reaction.message.author.id,
        current_tips: defaultTips,
        received_tips: 1
      };
      await createUsersTips(receiverTips, dbClient);
    } else {
      receiverTips.received_tips = receiverTips.received_tips + 1;
      await incrementReceivedTips(reaction.message.author.id, dbClient);
    }

    // check if this message already has been tipped before
    const previousEmbedId = await getTipByMessageId(reaction.message.id, dbClient);

    await createTip(user.id, reaction.message.author.id, reaction.message, previousEmbedId || '', dbClient);

    // post message
    if (whitelistedTipChannels[reaction.message.channel.id]) {
      const embed = generateTipEmbed(reaction.message.author, user, receiverTips, sendersTips, reaction.message);

      if (previousEmbedId) {
        const previousEmbedMessage = await reaction.message.channel.messages.fetch(previousEmbedId);
        await previousEmbedMessage.edit(embed);
      } else {
        const embedMessage = await reaction.message.channel.send(embed);
        await updateTipEmbedMessageId(reaction.message.id, embedMessage.id, dbClient);
      }
    }

    dbClient.release();
  }


  // Lobby Emote Signups
  const lobby = lobbies.find((lobby) => lobby.id === reaction.message.id);

  if (!lobby) {
    return;
  }

  if (reaction.emoji.name === '✳') {
    console.log(`Tryout - ${user.id} reacted with ${reaction.emoji.name}`);

    // If the user already signed up
    for (const players of lobby.fields) {
      const player = players.find((player) => player.id === user.id);
      if (player) {
        await removeFromLobby(lobby, user, reaction.message);
        await saveLobby({
          id: lobby.id,
          data: lobby
        });
        return reaction.users.remove(user);
      }
    }

    // if they didnt sign up add them to lobby
    await addToLobby(lobby, user, reaction, tier, 1);

    await saveLobby({
      id: lobby.id,
      data: lobby
    });

    const embed = generateEmbed(lobby);
    await reaction.message.edit(embed);

    const bigAssMessage = "**Hello and Welcome to Dota University!**\n\nThe aim of DotaU is to be a platform for beginners to have fair and fun games! We offer new player coaching and lobby games that are designed to help you understand and get better at Dota2!\n\nAs you do your tryout, a coach will watch your gameplay VS bots for the first 10-15 minutes of the game, and will assign you into one of the 3 beginner tiers. The coach will not tell you to do anything so that they do not influence your gameplay. There's no pressure for you to perform, pick a hero you have tried before or you're comfortable with.\n\nTo join the tryout lobby, in Dota go to:\n> Play Dota > Custom Lobbies > Browse > Server (ask coach) > Lobby Name : DotaU Tryouts > password: dotau\n\nMake sure to join the voice channel!\nhttps://discord.gg/49CV692\n\nDon't worry too much about the tryouts!\nJust play as you normally would and most importantly, have fun! :)";
    await user.send(bigAssMessage);

    return reaction.users.remove(user);
  }

  if (isCoach || isAdmin || isGradCoach) {
    console.log(`${user.id} reacted with ${reaction.emoji.name}`);
    if (reaction.emoji.name === '✅') {
      // remind
      // for each group in the post
      for (let l = 0; l < lobby.fields.length; l++) {
        if (lobby.fields[l].length >= 10 || l === 0) {
          const voiceChannel = await client.channels.fetch(lobbyArray[0].ids[0]);
          const channelInvite = await voiceChannel.createInvite();

          // send to the coach/reacter
          await user.send(`**Lobby reminder!**\nHead over to the voice channel: ${channelInvite.url}`);

          for (const player of lobby.fields[l]) {
            const u = await client.users.fetch(player.id);
            await u.send(`**Lobby reminder!**\nHead over to the voice channel: ${channelInvite.url}`);
          }
        }
      }

      return reaction.users.remove(user);
    } else if (reaction.emoji.name === '🗒️') {
      // print
      const postString = getPostPrintString(lobby);
      await user.send(postString);
      return reaction.users.remove(user);
    } else if (reaction.emoji.name === '🏁') {
      // print
      // Get list of people who reacted to the tryout message
      // const signUpChannel = await client.channels.fetch(process.env.DFZ_SIGNUP_CHANNEL);
      // const internalChannel = await client.channels.fetch(process.env.DFZ_COACHES_CHANNEL);

      // let playerInfoString = ""

      // for (const players of lobby.fields) {
      //   const player = players.find((player) => player.id === user.id);
      //   if (player) {
      //     // get their info from the signup channel
      //     await signUpChannel.fetchMessages().then(async messages => {
      //       for (const message of messages.array().reverse()) {
      //         if (parseInt(message.author.id) == parseInt(player.id) && message.content.includes("!apply")) {
      //           //                            add their info to a big string
      //           const stuff = message.content.split(",")[1].trim();
      //           playerInfoString += message.author.username + "\n" + message.content + "\n" + `https://www.dotabuff.com/players/${stuff}\nTier 1/2/3/4 - `;
      //         }
      //       }
      //     })
      //   }
      // }
      // await user.send(playerInfoString);
      // return reaction.remove(user);
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

      return reaction.users.remove(user);
    } else if (reaction.emoji.name === '📚') {
      if (lobby.coaches.includes(user.id)) {
        lobby.coaches = lobby.coaches.filter((coach) => coach !== user.id);
      } else {
        lobby.coaches.push(user.id);
      }

      await saveLobby({
        id: lobby.id,
        data: lobby
      });

      const embed = generateEmbed(lobby);
      await reaction.message.edit(embed);

      return reaction.users.remove(user);
    } else {
      // lets see if the coach/admin clicked 12345
      const positionNumber = emojiNumbers.indexOf(reaction.emoji.name);

      if (positionNumber && positionNumber >= 1 && positionNumber <= 5) {
        // ok so coach clicked on one of the numbers, lets add or remove the beginner tier corresponding to that number
        const clickedTier = queuableRoles[positionNumber];

        // could be more efficient i think
        if (lobby.tiers.includes(clickedTier)) {
          lobby.tiers = lobby.tiers.filter((tier) => tier !== clickedTier);

          await saveLobby({
            id: lobby.id,
            data: lobby
          });

          const embed = generateEmbed(lobby);
          await reaction.message.edit(embed);
        } else {
          lobby.tiers.push(clickedTier);

          await saveLobby({
            id: lobby.id,
            data: lobby
          });

          const embed = generateEmbed(lobby);
          await reaction.message.edit(embed);
        }
      }

      return reaction.users.remove(user);
    }
  }

  if (!tier || !lobby.tiers.includes(tier.id)) {
    return reaction.users.remove(user);
  }

  const positionNumber = emojiNumbers.indexOf(reaction.emoji.name);

  if (positionNumber < 1 || positionNumber > 5) {
    return reaction.users.remove(user);
  }

  if (!lobby) {
    return reaction.users.remove(user);
  }

  if (lobby.locked) {
    return reaction.users.remove(user);
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
}

// no nice event handler for reaction removal, raw looks at all discord events
client.on('raw', async (event) => {
  if (event.t === 'MESSAGE_REACTION_REMOVE') {
    const {
      d: data
    } = event;

    const user = await client.users.fetch(data.user_id);
    if (user.bot || !isWatchingChannel(data.channel_id)) {
      return;
    }

    const lobby = lobbies.find((lobby) => lobby.id === data.message_id);
    if (!lobby) {
      return;
    }

    let channel;
    if (lobby.region === 'NA') {
      channel = await client.channels.fetch(process.env.NA_LOBBY_CHANNEL);
    } else if (lobby.region === 'EU') {
      channel = await client.channels.fetch(process.env.EU_LOBBY_CHANNEL);
    } else {
      channel = await client.channels.fetch(process.env.SEA_LOBBY_CHANNEL);
    }

    const message = await channel.messages.fetch(data.message_id);
    const positionNumber = emojiNumbers.indexOf(data.emoji.name);

    if (positionNumber < 1 || positionNumber > 5) {
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

      for (const p of players) {
        if (p.roles.length < 1) {
          await removeFromLobby(lobby, p, message);

          await saveLobby({
            id: lobby.id,
            data: lobby
          });
        }
      }
    }
  } else if (event.t === 'MESSAGE_REACTION_ADD') {
    const channel = await client.channels.fetch(event.d.channel_id);
    const message = await channel.messages.fetch(event.d.message_id)
    const emoji = event.d.emoji.id ? `${event.d.emoji.name}:${event.d.emoji.id}` : event.d.emoji.name;
    const reaction = message.reactions.cache.find((r) => r._emoji.name === event.d.emoji.name);

    await messageReactionAdd(reaction, await client.users.fetch(event.d.user_id));
  }
});

const addToLobby = async (lobby, user, reaction, tier, positionNumber) => {
  const player = {
    id: user.id,
    tierId: tier.id,
    signupTime: moment().format(),
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
  const sortFields = false; //lobby.fields[fieldIndex].length === 9; // disabled for now

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
    if (a.signupTime && moment(a.signupTime).isBefore(b.signupTime)) {
      return -1;
    }
    return 1;
  });

  const newFields = [];
  if (allPlayers.length === 0) {
    lobby.fields = [
      []
    ];
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

// the list of people that gets dmed to people on the print react
const getPostPrintString = (lobby) => {
  const lobbyStrings = [];

  for (let j = 0; j < lobby.fields.length; j++) {
    const players = [...lobby.fields[j]];

    lobbyStrings.push(`**Lobby ${j+1}**\n`);

    if (players.length >= 10) {
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
    }

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
    const guild = await client.guilds.fetch(process.env.DFZ_GUILD);
    const author = await guild.members.fetch({ user: msg.author, force: true });

    if (!author) {
      // not from dfz
      return;
    }

    const question = args.join(' ');

    const qaChannel = await client.channels.fetch(process.env.DFZ_QA_CHANNEL);

    const embed = generateQAEmbed(question, author);

    const questionMessage = await qaChannel.send(embed);

    await questionMessage.edit(generateQAEmbed(question, author, questionMessage.id));
  }
}

// !answer <messageId> response
commandForName['answer'] = {
  execute: async (msg, args) => {
    const guild = await client.guilds.fetch(process.env.DFZ_GUILD);
    const author = await guild.members.fetch({ user: msg.author, force: true });

    const canAnswer = author.roles.cache.some((role) => questionAnswerableIds.includes(role.id));

    if (!author || !canAnswer) {
      // not allowed to answer
      return;
    }

    const messageId = args[0];
    const answer = args.slice(1).join(' ');

    if (answer.length > 1024) {
      return author.send('Shorter than 1024 characters, sorry eh.');
    }

    const qaChannel = await client.channels.fetch(process.env.DFZ_QA_CHANNEL);

    const questionMessage = await qaChannel.messages.fetch(messageId);

    if (questionMessage && questionMessage.embeds && questionMessage.embeds.length > 0) {
      const oldEmbed = questionMessage.embeds[0];

      const embed = new Discord.MessageEmbed();
      embed.setColor([193, 109, 255]);
      embed.setDescription(oldEmbed.description);
      embed.setAuthor(oldEmbed.author.name, oldEmbed.author.iconURL);
      embed.setFooter(oldEmbed.footer ? oldEmbed.footer.text : questionMessage.id);

      for (const field of oldEmbed.fields) {
        embed.addField(field.name, field.value);
      }

      embed.addField(author.nickname || author.user.username, answer);

      await questionMessage.edit(embed);
    }
  }
}

// !coach <lobbyid> @coach
// toggles the @coach on the lobby
commandForName['coach'] = {
  execute: async (msg, args) => {
    if (msg.channel.id !== process.env.DFZ_COACHES_CHANNEL) {
      return;
    }

    const lobbyId = args[0];
    if (!lobbyId) {
      return;
    }

    const lobby = lobbies.find((lobby) => lobby.id === lobbyId);

    if (!lobby) {
      return;
    }

    const coach = msg.mentions.users.first();

    if (!coach) {
      return;
    }

    if (lobby.coaches.includes(coach.id)) {
      lobby.coaches = lobby.coaches.filter((c) => c !== coach.id);
    } else {
      lobby.coaches.push(coach.id);
    }

    await saveLobby({
      id: lobby.id,
      data: lobby
    });

    let channel;
    if (lobby.region === 'NA') {
      channel = await client.channels.fetch(process.env.NA_LOBBY_CHANNEL);
    } else if (lobby.region === 'EU') {
      channel = await client.channels.fetch(process.env.EU_LOBBY_CHANNEL);
    } else {
      channel = await client.channels.fetch(process.env.SEA_LOBBY_CHANNEL);
    }

    const message = await channel.messages.fetch(lobby.id);

    if (message) {
      const embed = generateEmbed(lobby);
      await message.edit(embed);
    }
  }
}


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

const addLobbyArrayChannel = async (guild) => {
  const lastChannel = lobbyArray[lobbyArray.length - 1];
  const lastDiscordChannel = await client.channels.fetch(lastChannel.ids[2]);

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

  lobbyArray.push({
    ids: [newMainChannel.id, newRadiantChannel.id, newDireChannel.id],
    name: newMainChannel.name,
    order: lastChannel.order + 1,
    members: 0,
  });

  watchingVoiceChannels[newMainChannel.id] = 'lobbyArray';
  watchingVoiceChannels[newRadiantChannel.id] = 'lobbyArray';
  watchingVoiceChannels[newDireChannel.id] = 'lobbyArray';
}

const addTeamArrayChannel = async (guild) => {
  const lastChannel = teamArray[teamArray.length - 1];
  const lastDiscordChannel = await client.channels.fetch(lastChannel.id);

  const newTeamChannel = await guild.channels.create(`Team #${lastChannel.order + 1}`, {
    type: 'voice',
    position: lastDiscordChannel.rawPosition,
    parent: lastDiscordChannel.parent,
    userLimit: 6
  });

  teamArray.push({
    id: newTeamChannel.id,
    name: newTeamChannel.name,
    order: lastChannel.order + 1,
    members: 0
  });

  watchingVoiceChannels[newTeamChannel.id] = 'teamArray';
}

const addGeneralArrayChannel = async (guild) => {
  const lastChannel = generalArray[generalArray.length - 1];
  const lastDiscordChannel = await client.channels.fetch(lastChannel.id);

  const newGeneralChannel = await guild.channels.create(`General #${lastChannel.order + 1}`, {
    type: 'voice',
    position: lastDiscordChannel.rawPosition,
    parent: lastDiscordChannel.parent
  });

  generalArray.push({
    id: newGeneralChannel.id,
    name: newGeneralChannel.name,
    order: lastChannel.order + 1,
    members: 0
  });

  watchingVoiceChannels[newGeneralChannel.id] = 'generalArray';
}

client.on('voiceStateUpdate', async (oldState, newState) => {
  // OK SO. Node will attempt to "multi-thread" event handlers like this at awaits. So
  // if one person joins a channel then a second person joins a second later, when the first persons
  // handler hits an await, it switches to the second, which is bad. We mutex them to ensure the voicechannels object
  // and the actual channels themselves arent getting edited by two callbacks at once
  await mutex.runExclusive(async () => {
    // dont care if they are changing state in the same channel
    if (newState.channelID === oldState.channelID) {
      return;
    }

    // if they leave a lobby group channel into another lobbygroup channel (Team Dire #1 to Team Radiant #1 for example)
    if (watchingVoiceChannels.hasOwnProperty(newState.channelID) && watchingVoiceChannels.hasOwnProperty(oldState.channelID)) {
      if (watchingVoiceChannels[newState.channelID] === watchingVoiceChannels[oldState.channelID]) {
        let channelArray;
        if (watchingVoiceChannels[newState.channelID] === 'lobbyArray') {
          const joinedChannel = lobbyArray.find((c) => {
            return (c.ids && c.ids.includes(newState.channelID));
          });

          const leftChannel = lobbyArray.find((c) => {
            return (c.ids && c.ids.includes(oldState.channelID));
          });

          if (joinedChannel === leftChannel) {
            return;
          }
        }
      }
    }

    // joining a watched channel
    if (watchingVoiceChannels.hasOwnProperty(newState.channelID)) {
      let channelArray;
      if (watchingVoiceChannels[newState.channelID] === 'lobbyArray') {
        channelArray = lobbyArray;
      } else if (watchingVoiceChannels[newState.channelID] === 'generalArray') {
        channelArray = generalArray;
      } else if (watchingVoiceChannels[newState.channelID] === 'teamArray') {
        channelArray = teamArray;
      }

      const joinedChannel = channelArray.find((c) => {
        return c.id === newState.channelID || (c.ids && c.ids.includes(newState.channelID));
      });

      if (!joinedChannel) {
        console.log(`big problem, couldnt find ${newState.channelID} channel in channelArray: ${channelArray}`);
      }

      // if the channel is empty we are going to need to add a new one
      if (joinedChannel.members < 1) {
        // FN: add a new channel(s) relative to channel
        const guild = await client.guilds.fetch(process.env.DFZ_GUILD);
        // gotta do special stuff for each type of lobby
        if (channelArray === lobbyArray) {
          await addLobbyArrayChannel(guild);
        } else if (channelArray === teamArray) {
          await addTeamArrayChannel(guild);
        } else if (channelArray === generalArray) {
          await addGeneralArrayChannel(guild);
        }

        joinedChannel.members++;
      } else {
        // they are joining a channel that already has people in it, dont need to do much
        joinedChannel.members++;
      }
    }

    // leaving a watched channel
    if (watchingVoiceChannels.hasOwnProperty(oldState.channelID)) {
      let channelArray;
      if (watchingVoiceChannels[oldState.channelID] === 'lobbyArray') {
        channelArray = lobbyArray;
      } else if (watchingVoiceChannels[oldState.channelID] === 'generalArray') {
        channelArray = generalArray;
      } else if (watchingVoiceChannels[oldState.channelID] === 'teamArray') {
        channelArray = teamArray;
      }

      const leftChannel = channelArray.find((c) => {
        return c.id === oldState.channelID || (c.ids && c.ids.includes(oldState.channelID));
      });

      if (!leftChannel) {
        console.log(`big problem, couldnt find ${oldState.channelID} channel in channelArray: ${channelArray}`);
      }

      if (leftChannel.members > 1 || channelArray.length === 1) {
        // leaving a channel with people in it, dont need to do much
        leftChannel.members--;
      } else {
        const guild = await client.guilds.fetch(process.env.DFZ_GUILD);

        // last one to leave the channel, time to delete shit
        // loop through all the channels, if its the one they left, delete it, then
        // reduce the numbers of the remaining lobbies by 1

        if (channelArray === lobbyArray) {
          let deleted = false;
          for (const channel of lobbyArray) {
            if (channel === leftChannel) {
              const leftMainLobbyDiscordChannel = await client.channels.fetch(channel.ids[0]);
              const leftRadiantDiscordChannel = await client.channels.fetch(channel.ids[1]);
              const leftDireDiscordChannel = await client.channels.fetch(channel.ids[2]);
              await leftMainLobbyDiscordChannel.delete();
              await leftRadiantDiscordChannel.delete();
              await leftDireDiscordChannel.delete();

              deleted = true;
              continue;
            }

            if (deleted) {
              // alter the names
              const mainLobbyDiscordChannel = await client.channels.fetch(channel.ids[0]);
              const radiantDiscordChannel = await client.channels.fetch(channel.ids[1]);
              const direDiscordChannel = await client.channels.fetch(channel.ids[2]);
              await mainLobbyDiscordChannel.edit({ name: `🤍 Main Lobby #${channel.order - 1}` });
              await radiantDiscordChannel.edit({ name: `Team Radiant #${channel.order - 1}` });
              await direDiscordChannel.edit({ name: `Team Dire #${channel.order - 1}` });

              channel.order--;
            }
          }

          lobbyArray = lobbyArray.filter((l) => l !== leftChannel);

          delete watchingVoiceChannels[leftChannel.ids[0]];
          delete watchingVoiceChannels[leftChannel.ids[1]];
          delete watchingVoiceChannels[leftChannel.ids[2]];
        } else if (channelArray === teamArray) {
          let deleted = false;
          for (const channel of teamArray) {
            if (channel === leftChannel) {
              const leftDiscordChannel = await client.channels.fetch(channel.id);
              await leftDiscordChannel.delete();

              deleted = true;
              continue;
            }

            if (deleted) {
              // alter the names
              const discordChannel = await client.channels.fetch(channel.id);
              await discordChannel.edit({ name: `Team #${channel.order - 1}` });

              channel.order--;
            }
          }

          teamArray = teamArray.filter((l) => l !== leftChannel);

          delete watchingVoiceChannels[leftChannel.id];
        } else if (channelArray === generalArray) {
          let deleted = false;
          for (const channel of generalArray) {
            if (channel === leftChannel) {
              const leftDiscordChannel = await client.channels.fetch(channel.id);
              await leftDiscordChannel.delete();

              deleted = true;
              continue;
            }

            if (deleted) {
              // alter the names
              const discordChannel = await client.channels.fetch(channel.id);
              await discordChannel.edit({ name: `General #${channel.order - 1}` });

              channel.order--;
            }
          }

          generalArray = generalArray.filter((l) => l !== leftChannel);

          delete watchingVoiceChannels[leftChannel.id];
        }
      }
    }

    return;
  });
});


/* ----- Auto Role -----
  Any member can pick their region, but we want just beginners of a certain region to be able to see the region channels
  So when a person has [region] + [beginner] then we give them `${[region]}-beginner` role which has view perms on the regional channels

  needs SYNC component, that applies the region-beginner role to all beginners with a region
  needs ONCHANGE component, that applies/removes the region-beginner role when a relevant role is changed
*/

const generateQAEmbed = (questionText, author, footerText, answer) => {
  const embed = new Discord.MessageEmbed();
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

function isOwner(userId) {
  return userId === process.env.OWNER_DISCORD_ID;
}

function isWatchingChannel(discord_id) {
  return (
    process.env.NA_LOBBY_CHANNEL === discord_id ||
    process.env.EU_LOBBY_CHANNEL === discord_id ||
    process.env.SEA_LOBBY_CHANNEL === discord_id ||
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
