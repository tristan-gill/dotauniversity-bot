const { SlashCommandBuilder } = require('@discordjs/builders');

class MasteryRankCmd {
  constructor (models, client, controllers) {
    this.client = client;
    this.controllers = controllers;
    this.models = models;
  }

  get data () {
    return new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Manage your progress through the Mastery Rank system')

    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current Mastery Rank position tiers'))

    .addSubcommand(subcommand =>
      subcommand
        .setName('token')
        .setDescription('View your rank tokens'))

    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Exchange a token for a new rank')
        .addStringOption(option =>
          option
            .setName('tier')
            .setDescription('Which tier are you unlocking')
            .setRequired(true)
            .addChoice('Bronze', '1')
            .addChoice('Silver', '2')
            .addChoice('Gold', '3')
            .addChoice('Platinum', '4')
            .addChoice('Master', '5'))
        .addStringOption(option =>
          option
            .setName('position')
            .setDescription('Which position are you unlocking')
            .setRequired(true)
            .addChoice('Position 1', '1')
            .addChoice('Position 2', '2')
            .addChoice('Position 3', '3')
            .addChoice('Position 4', '4')
            .addChoice('Position 5', '5')))
  }

  async execute (interaction) {
    if (interaction.options.getSubcommand() === 'view') {
      await this.controllers.MasteryCtrl.viewUserRanks({
        interaction
      });
    } else if (interaction.options.getSubcommand() === 'token') {
      await this.controllers.MasteryCtrl.viewUserTokens({
        interaction
      });
    } else if (interaction.options.getSubcommand() === 'add') {
      const tier = parseInt(interaction.options.getString('tier'));
      const position = parseInt(interaction.options.getString('position'));

      await this.controllers.MasteryCtrl.exchangeToken({
        interaction,
        position,
        tier
      });
    }
  }
}

module.exports = MasteryRankCmd;
