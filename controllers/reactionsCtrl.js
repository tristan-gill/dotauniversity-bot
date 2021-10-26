const CronJob = require('cron').CronJob;
const Discord = require('discord.js');

class ReactionsCtrl {
  constructor (models, client, controllers) {
    this.models = models;
    this.client = client;
    this.controllers = controllers;
  }

  async messageReactionAdd ({
    reaction,
    user
  }) {
    console.log({reaction, user});

    if (user.bot) {
      return;
    }

    const guild = await this.client.guilds.fetch(process.env.DOTAU_GUILD_ID);
    const guildUser = await guild.members.fetch({
      user,
      force: true
    });

    const isCoach = guildUser.roles.cache.some((role) => role.id === process.env.ROLE_COACH);
    const isAdmin = guildUser.roles.cache.some((role) => role.id === process.env.ROLE_ADMIN);
    const isGradCoach = guildUser.roles.cache.some((role) => role.id === process.env.ROLE_GRAD_COACH);

    if (reaction.emoji.id === process.env.EMOJI_TIP) {
      await this.controllers.TipsCtrl.messageReactionAdd({
        isAdmin,
        reaction,
        user
      });
    }

    // lobby emote signup
    if ([process.env.NA_LOBBY_CHANNEL, process.env.EU_LOBBY_CHANNEL, process.env.SEA_LOBBY_CHANNEL].includes(reaction.message.channel.id)) {
      await this.controllers.LobbiesCtrl.messageReactionAdd({
        isAdmin,
        isCoach,
        isGradCoach,
        reaction,
        user
      });
    }
  }
}

module.exports = ReactionsCtrl;
