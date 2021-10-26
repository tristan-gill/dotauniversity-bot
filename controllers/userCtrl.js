const CronJob = require('cron').CronJob;
const Discord = require('discord.js');

class UserCtrl {
  constructor (models, client, controllers) {
    this.models = models;
    this.client = client;
    this.controllers = controllers;
  }

  async getOrCreateUserRecord (discordUser) {
    const userRecord = await this.models.User.findByPk(discordUser.id);

    if (!userRecord) {
      return this.models.User.create({
        id: discordUser.id,
        username: discordUser.nickname || discordUser.username
      });
    }

    return userRecord;
  }
}

module.exports = UserCtrl;
