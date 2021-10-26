const CronJob = require('cron').CronJob;
const Discord = require('discord.js');
const nconf = require('nconf');

class TipsCtrl {
  constructor (models, client, controllers) {
    this.models = models;
    this.client = client;
    this.controllers = controllers;
  }

  avatarUrl (userId, avatarString) {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarString}.png`
  }

  generateTipEmbed ({
    receiver,
    sender,
    receiverUserTip,
    senderUserTip,
    message
  }) {
    const embed = new Discord.MessageEmbed();
    embed.setColor([222, 97, 1]);

    try {
      embed.setDescription(message.content.substring(0, 2048));
    } catch (err) {
      console.log(err)
    }

    embed.setAuthor(`${receiver.nickname || receiver.username} has been tipped!`, this.avatarUrl(receiver.id, receiver.avatar));
    embed.setFooter(sender.nickname || sender.username, this.avatarUrl(sender.id, sender.avatar));

    embed.addField(`To: ${receiver.nickname || receiver.username}`, `available: ${receiverUserTip.current_tips} - received: ${receiverUserTip.received_tips}`);
    embed.addField(`Recent tip from: ${sender.nickname || sender.username}`, `available: ${senderUserTip.current_tips} - received: ${senderUserTip.received_tips}`);

    embed.setThumbnail('https://cdn.discordapp.com/emojis/743131216475062443.png?v=1');

    return embed;
  }

  // a tip reaction was added
  async messageReactionAdd ({
    isAdmin,
    reaction,
    user
  }) {
    // cant tip your own message
    if (user.id === reaction.message.author.id) {
      return reaction.users.remove(user);
    }

    const senderUserRecord = await this.controllers.UserCtrl.getOrCreateUserRecord(user);

    let senderUserTipRecord = await this.models.UserTip.findByPk(user.id);

    if (!senderUserTipRecord) {
      // if there is no usertip record, this is their first time tipping
      // create the record before proceeding
      senderUserTipRecord = await this.models.UserTip.create({
        id: user.id,
        current_tips: nconf.get('defaultTips'),
        received_tips: 0
      });
    }

    // decrement the sender current_tips
    if (senderUserTipRecord.get('current_tips') >= 1) {
      await senderUserTipRecord.update({
        current_tips: senderUserTipRecord.get('current_tips') - 1
      });
    } else if (isAdmin) {
      // admins have unlimited tips
    } else {
      // not enough tips
      return reaction.users.remove(user);
    }

    // increment the receiver received_tips
    const receiverUserRecord = await this.controllers.UserCtrl.getOrCreateUserRecord(reaction.message.author);

    let receiverUserTipRecord = await this.models.UserTip.findByPk(reaction.message.author.id);

    if (!receiverUserTipRecord) {
      // same deal as sender, no usertip record (first time) so create one
      receiverUserTipRecord = await this.models.UserTip.create({
        id: reaction.message.author.id,
        current_tips: nconf.get('defaultTips'),
        received_tips: 1
      });
    } else {
      await receiverUserTipRecord.update({
        received_tips: receiverUserTipRecord.get('received_tips') + 1
      });
    }

    // check if this message has been tipped before
    const previousTipRecord = await this.models.Tip.findOne({
      attributes: ['embed_id'],
      where: {
        message_id: reaction.message.id
      }
    });
    const previousEmbedId = previousTipRecord ? previousTipRecord.get('embed_id') : '';

    const tipRecord = await this.models.Tip.create({
      sender_id: senderUserRecord.get('id'),
      receiver_id: receiverUserRecord.get('id'),
      message: reaction.message.content,
      message_id: reaction.message.id,
      embed_id: previousEmbedId
    });

    // if in a whitelisted channel, show the tip embed in the channel
    if (nconf.get('whitelistedTipChannels')[reaction.message.channel.id]) {
      const embed = this.generateTipEmbed({
        receiver: reaction.message.author,
        sender: user,
        receiverUserTip: receiverUserTipRecord.toJSON(),
        senderUserTip: senderUserTipRecord.toJSON(),
        message: reaction.message
      });

      if (previousEmbedId) {
        const previousEmbedMessage = await reaction.message.channel.messages.fetch(previousEmbedId);
        await previousEmbedMessage.edit({ embeds: [embed] });
      } else {
        const embedMessage = await reaction.message.channel.send({ embeds: [embed] });
        await tipRecord.update({
          embed_id: embedMessage.id
        });
      }
    }
  }
}

module.exports = TipsCtrl;
