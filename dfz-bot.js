require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client();
const moment = require('moment');

const express = require('express');

const CronJob = require('cron').CronJob;

// Database stuff
const Pool = require('pg').Pool;
const pool = new Pool({
  connectionString: process.env.HEROKU_POSTGRESQL_ONYX_URL,
  ssl: true
});

// express stuff to keep heroku happy
const PORT = process.env.PORT || 5000
express().listen(PORT, () => console.log(`Listening on ${ PORT }`));

const PREFIX = '!';

const queuableRoles = [process.env.COACH, process.env.TIER_ONE, process.env.TIER_TWO, process.env.TIER_THREE, process.env.TIER_FOUR, process.env.TIER_GRAD, process.env.TIER_TRYOUT];
const emojiNumbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const voiceChannels = [process.env.DFZ_VC_1, process.env.DFZ_VC_2, process.env.DFZ_VC_3, process.env.DFZ_VC_4];

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

client.once('ready', async () => {
  lobbies = [];
  console.log('Ready!');

  await loadPastLobbies();

  // await updateUsersTable();

  await scheduleLobbies();
});


// ~~~~~~~~~~~~~~~~ CRON STUFF ~~~~~~~~~~~~~~~~

const scheduledLobbies = [
  {
    min: '0',
    hour: '14',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '1',
    args: ['23', 'EU', 'lobby at 20:00 CEST // 2PM EDT (UNCOACHED)']
  },
  {
    min: '0',
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
    dayOfWeek: '2,4,5',
    args: ['12', 'EU', 'lobby at 20:00 CEST // 2PM EDT']
  },
  {
    min: '0',
    hour: '14',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '0',
    args: ['234', 'EU', 'lobby at 20:00 CEST // 2PM EDT (UNCOACHED)']
  },

  {
    min: '0',
    hour: '21',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '1,3,5,0',
    args: ['12', 'NA', 'lobby at 9pm EDT']
  },
  {
    min: '1',
    hour: '21',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '3,5',
    args: ['34', 'NA', 'lobby at 9pm EDT']
  },
  {
    min: '1',
    hour: '21',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '0',
    args: ['23', 'NA', 'lobby at 9pm EDT']
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

// ~~~~~~~~~~~~~~~~ END CRON STUFF ~~~~~~~~~~~~~~~~


const commandForName = {};


// users / transfer commands
const updateUsersTable = async () => {
  const dbClient = await pool.connect();

  const guild = client.guilds.get('629298549976334337');
  const guildMembers = await guild.fetchMembers();

  for (const member of guildMembers.members) {
    await saveUser({
      id: member[0],
      roles: member[1]._roles,
      username: member[1].user.username
    }, dbClient);
  }

  dbClient.release();
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

const rolesMap = {
  // yagpdb.xyz
  "664261527687266305": null,
  // admin
  "664843392756482098": "731171811152101397",
  //intermediate
  "688870180646158399": "731171811143975022",
  //bots
  "629653230971781120": "731171811143975021",
  // headcoach
  "631918135905091594": "731171811143975020",
  //coach
  "629623683958177793": "731171811143975019",
  // coach inhouse
  "700113712945823874": "731171811143975018",
  //staff
  "629624134179094579": "731171811143975017",
  //tournament champion
  "673338917117755403": "731171811143975016",
  // mod mute
  "679375449104580629": "731171811143975015",
  // honorary
  "664455951897722881": "731171811143975014",
  // server booster is this automatic?
  "647359339010457604": null,
  // mee6
  "629650879397756949": null,
  // tournament org
  "670732153910198312": "731171811143975013",
  // tier 1
  "629623752010891284": "731171811131392080",
  // tier 2
  "629623832990187520": "731171811131392079",
  // tier 3
  "629623895401562123": "731171811131392078",
  // tier 4
  "724326915753771068": "731171811131392077",
  // grad
  "688703108888526886": "731171811131392076",
  // unnoficial inhouse
  "723931615352455189": "731171811131392075",
  // bot prac
  "723931625230041100": "731171811131392074",
  // tryout
  "631474548319191053": "731171811131392073",
  // workshop
  "680498688430440558": "731171811131392072",
  // events
  "698832577150320700": "731171811131392071",
  // table sim
  "698935479852204122": "731171810757967981",
  // eu coach
  "669872208847437844": "731171810757967980",
  // na coach
  "668136392567816202": "731171810757967979",
  // sea coach
  "669867457196064818": "731171810757967978",
  // eu
  "664261682415271986": "731171810757967977",
  // na
  "664261634612789269": "731171810757967976",
  // sea
  "664261661472849922": "731171810757967975",
  // community
  "630697798022463497": "731171810757967974",
  // bota
  "629826340379557912": null,
  //dfz
  "686308071194230818": null,
  // mango
  "631428023916167198": null,
  // gather
  "631867955851821086": null,
  // betterttv
  "634017453147422741": null,
  // serverstats
  "664506937949421569": null,
  // logger
  "693550838827843665": null,
  // groovy
  "696040292033364079": null
};

const getRoles = async (user_id) => {
  const query = `
    select
      roles
    from users
    where id = '${user_id}';
  `;

  const response = await pool.query(query);

  if (response.rows && response.rows.length) {
    return response.rows[0].roles;
  }
}

client.on('guildMemberAdd', async (member) => {
  const previousRoles = await getRoles(member.id);
  if (previousRoles && previousRoles.length) {
    for (const role of previousRoles) {
      const newRole = rolesMap[role];
      if (newRole) {
        await member.addRole(newRole);
      }
    }
  }
});


// lobby database commands
const loadPastLobbies = async () => {
  const channel = await client.channels.get(process.env.DFZ_LOBBY_CHANNEL);

  // Get the saved lobbies from the database
  const dbLobbies = await getLobbies();

  for (const lobby of dbLobbies) {
    lobbies.push(lobby);

    // need to fetch the messages to add them to the cache
    try {
      await channel.fetchMessage(lobby.id);
    } catch (err) {
      console.log({err});
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
    if (args.includes("tryout")){
      await postTryout(args);
    }

    await postLobby(args);
  }
}

const postLobby = async (args) => {
  const tiersJoined = args[0];
  const freeText = args.slice(1).join(' ');

  const tiers = [];
  for (const tierString of tiersJoined) {
    const tier = parseInt(tierString);
    if (isNaN(tier) || tier < 1 || tier > 5) {
      return;
    }

    tiers.push(queuableRoles[tier]);
  }

  const lobby = {
    coaches: [],
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
  await message.react('📚');
  await message.react('🗒️');
  await message.react('✅');
  await message.react('🔒');

  return lobby;
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

// Ex: !post tryout at 8/31/2020 23:08:48 PDT
const postTryout = async (args) => {
  var dateText = args.slice(2).join(' ');
  //  console.log("dateText: " + dateText);
  var freeText = args.slice(0).join(' ');
  var tryoutRole = process.env.TIER_TRYOUT
  timezones = ['America/Los_Angeles', 'America/New_York', 'Europe/Berlin', 'Asia/Singapore'];
  var timeString = '';

  var date = new Date(dateText);

  for (i = 0; i < timezones.length; i++) {
    timeString += "  " + date.toLocaleString("en-US", {timeZone: timezones[i]}) + " " + timezones[i]+"\n";
  }
  //  console.log(timeString);

  const tiers = [];
  tiers.push(tryoutRole);

  const lobby = {
    coaches: [],
    fields: [
      []
    ],
    tiers,
    text: freeText,
    locked: false
  };

  const channel = await client.channels.get(process.env.DFZ_TRYOUT_CHANNEL);

  await channel.send(`**<@&${tryoutRole}> Time!**\nHosting tryouts at:\n${timeString}\nReact to the message below if you wanna join. All regions are free to attend.`);

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
  await message.react('🏁');
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
  const embed = new Discord.RichEmbed();
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

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) {
    return;
  }

  const guildUser = await reaction.message.channel.guild.fetchMember(user.id);
  const tier = guildUser.roles.find((role) => queuableRoles.includes(role.id));

  // if is a coach
  const isCoach = guildUser.roles.some((role) => role.id === process.env.COACH);
  const isAdmin = guildUser.roles.some((role) => role.id === process.env.DFZ_ADMIN);


  // tip handling
  if (reaction.emoji.name === 'Tip') {
    // cant tip urself
    if (user.id === reaction.message.author.id) {
      return reaction.remove(user);
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
        return reaction.remove(user);
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
        const previousEmbedMessage = await reaction.message.channel.fetchMessage(previousEmbedId);
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
      console.log(lobby.fields)
      console.log(players)
      const player = players.find((player) => player.id === user.id);
      if (player) {
          console.log(player)
          await removeFromLobby(lobby, user, reaction.message);
          await saveLobby({
          id: lobby.id,
          data: lobby
          });
        return reaction.remove(user);
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

      var bigAssMessage = "**Hello and welcome to Dota University!**\n\nIf you didn't know, the aim of Dota U is to be a platform for beginners to have fair and fun games! We offer new player coaching and lobby games that are designed to help you understand and get better at Dota2!\n\nAs you do your tryouts, a coach will watch your gameplay VS bots for the first 10-15 minutes of the game. The coach will not tell you to do anything so that they do not influence your gameplay. \n\nDuring the match, the coach will assign you into one of 3 beginner tiers:\n  **Tier 1**: Clearly lost, using abilities at random, rough execution\n  **Tier 2**: Rough grasp of laning; trading, pulling. can follow up and land skills.\n  **Tier 3**: Has decent understanding of their hero pool, can utilize complex mechanics with those heroes.\n\n**To join the tryout lobby, in dota go to:**\n**Play Dota > Custom Lobbies > Browse > Lobby Name : DotaU Tryouts > password: ogre**\n\nDon't worry too much about the tryouts (This isnt like taking the MCAT)! Just play as you normally would and most importantly, have fun!"
      await user.send(bigAssMessage);

      return reaction.remove(user);
   }

  if (!tier || !lobby.tiers.includes(tier.id)) {
    return reaction.remove(user);
  }

  if (isCoach || isAdmin) {
    console.log(`${user.id} reacted with ${reaction.emoji.name}`);
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
    } else if (reaction.emoji.name === '🏁') {
      // print
      // Get list of people who reacted to the tryout message
      // find their post in sighups
      // send all of their signup posts to each of the coaches
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

      return reaction.remove(user);
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

      return reaction.remove(user);
    }
  }

  const positionNumber = emojiNumbers.indexOf(reaction.emoji.name);

  if (positionNumber < 1 || positionNumber > 5) {
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
    if (a.signupTime && moment(a.signupTime).isBefore(b.signupTime)) {
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

    if (answer.length > 1024) {
      return author.send('Shorter than 1024 characters, sorry eh.');
    }

    const qaChannel = await client.channels.get(process.env.DFZ_QA_CHANNEL);

    const questionMessage = await qaChannel.fetchMessage(messageId);

    if (questionMessage && questionMessage.embeds && questionMessage.embeds.length > 0) {
      const oldEmbed = questionMessage.embeds[0];

      const embed = new Discord.RichEmbed();
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

    const channel = await client.channels.get(process.env.DFZ_LOBBY_CHANNEL);
    const message = await channel.fetchMessage(lobby.id);

    if (message) {
      const embed = generateEmbed(lobby);
      await message.edit(embed);
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
