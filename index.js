require('dotenv').config();
const nconf = require('nconf');
const { Client, Collection, Intents } = require('discord.js');

nconf.env().file({ file: './config/constants.json' });

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

client.commands = new Collection();

let controllers;

client.once('ready', async () => {
  try {
    const sq = require('./config/sequelize-init');
    const models = await require('./models/').setup(sq);
    controllers = require('./controllers/').setup(models, client);
    const commands = require('./commands/').setup(models, client, controllers);

    // await controllers.LobbiesCtrl.loadPastLobbies();
    // await controllers.LobbiesCtrl.cronScheduleLobbies();

    for (const command of Object.values(commands)) {
      if (command?.data?.name) {
        client.commands.set(command.data.name, command);
      }
    }

    console.log('Ready');
  } catch (error) {
    console.error('Setup error:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  // When a reaction is received, check if the structure is partial
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the message:', error);
      return;
    }
  }

  // Now the message has been cached and is fully available
  await controllers.ReactionsCtrl.messageReactionAdd({reaction, user});
});

client.login(process.env.BOT_TOKEN);
