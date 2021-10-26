const { SlashCommandBuilder } = require('@discordjs/builders');

class MasterySkillCmd {
  constructor (models, client, controllers) {
    this.client = client;
    this.controllers = controllers;
    this.models = models;
  }

  get data () {
    return new SlashCommandBuilder()
    .setName('adminskill')
    .setDescription('Manage the mastery skills')

    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View the skills for this Tier and Position')
        .addStringOption(option =>
          option
            .setName('tier')
            .setDescription('Which tier are you managing')
            .addChoice('Bronze', '1')
            .addChoice('Silver', '2')
            .addChoice('Gold', '3')
            .addChoice('Platinum', '4')
            .addChoice('Master', '5'))
        .addStringOption(option =>
          option
            .setName('position')
            .setDescription('Which position are you managing')
            .addChoice('Position 1', '1')
            .addChoice('Position 2', '2')
            .addChoice('Position 3', '3')
            .addChoice('Position 4', '4')
            .addChoice('Position 5', '5')))

    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a skill for this Tier and Position')
        .addStringOption(option =>
          option
            .setName('tier')
            .setDescription('Which tier are you managing')
            .setRequired(true)
            .addChoice('Bronze', '1')
            .addChoice('Silver', '2')
            .addChoice('Gold', '3')
            .addChoice('Platinum', '4')
            .addChoice('Master', '5'))
        .addStringOption(option =>
          option
            .setName('position')
            .setDescription('Which position are you managing')
            .setRequired(true)
            .addChoice('Position 1', '1')
            .addChoice('Position 2', '2')
            .addChoice('Position 3', '3')
            .addChoice('Position 4', '4')
            .addChoice('Position 5', '5'))
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Name of the new skill')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Describe the new skill')
            .setRequired(true)))

    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a skill. Get the skill id from the view sub-command.')
        .addIntegerOption(option =>
          option
            .setName('id')
            .setDescription('The id of the skill you want to remove')
            .setRequired(true)))
  }

  async execute (interaction) {
    const isAdmin = interaction.member.roles.cache.some((role) => role.id === process.env.ROLE_ADMIN);

    if (!isAdmin) {
      return interaction.reply({
        content: 'Only admins can manage skills, you might be looking for the "/skills" command',
        ephemeral: true
      });
    }

    if (interaction.options.getSubcommand() === 'view') {
      const tier = parseInt(interaction.options.getString('tier')) || null;
      const position = parseInt(interaction.options.getString('position')) || null;

      await this.controllers.MasteryCtrl.adminViewSkills({
        interaction,
        position,
        tier
      });
    } else if (interaction.options.getSubcommand() === 'add') {
      const tier = parseInt(interaction.options.getString('tier'));
      const position = parseInt(interaction.options.getString('position'));
      const name = interaction.options.getString('name');
      const description = interaction.options.getString('description');

      await this.controllers.MasteryCtrl.addSkill({
        description,
        interaction,
        name,
        position,
        tier
      });
    } else if (interaction.options.getSubcommand() === 'remove') {
      const id = interaction.options.getInteger('id');

      await this.controllers.MasteryCtrl.removeSkill({
        id,
        interaction
      });
    }
  }
}

module.exports = MasterySkillCmd;
