const { SlashCommandBuilder } = require('@discordjs/builders');

class PostLobbyCmd {
  constructor (models, client, controllers) {
    this.client = client;
    this.controllers = controllers;
    this.models = models;
  }

  get data () {
    return new SlashCommandBuilder()
    .setName('postlobby')
    .setDescription('Creates a new lobby post message')

    .addStringOption(option =>
      option
        .setName('region')
        .setDescription('Which region is this lobby')
        .setRequired(true)
        .addChoice('NA', 'NA')
        .addChoice('EU', 'EU')
        .addChoice('SEA', 'SEA'))

    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Lobby title')
        .setRequired(true))
    ;
  }

  async execute (interaction) {
    const region = interaction.options.getString('region');
    const title = interaction.options.getString('title');

    console.log({region, title});

    const lobby = await this.controllers.LobbiesCtrl.postLobby(region, title);

    return interaction.reply('thanks');
  }
}

module.exports = PostLobbyCmd;
