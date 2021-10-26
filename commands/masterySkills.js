const { SlashCommandBuilder } = require('@discordjs/builders');

class MasterySkillsCmd {
  constructor (models, client, controllers) {
    this.client = client;
    this.controllers = controllers;
    this.models = models;
  }

  get data () {
    return new SlashCommandBuilder()
    .setName('skills')
    .setDescription('View the skills you can work on')
  }

  async execute (interaction) {
    await this.controllers.MasteryCtrl.viewUserSkills({
      interaction
    });
  }
}

module.exports = MasterySkillsCmd;
