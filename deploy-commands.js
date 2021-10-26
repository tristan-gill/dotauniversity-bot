require('dotenv').config();
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js') && file !== 'index.js');

for (const file of commandFiles) {
  const Cmd = require(`./commands/${file}`);

  const command = new Cmd();
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

rest.put(Routes.applicationGuildCommands(process.env.SELF_CLIENT_ID, process.env.DOTAU_GUILD_ID), { body: commands })
  .then(() => console.log('Successfully registered application commands.'))
  .catch(console.error);
