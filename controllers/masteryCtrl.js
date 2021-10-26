const Discord = require('discord.js');
const nconf = require('nconf');
const Sequelize = require('sequelize');

class MasteryCtrl {
  constructor (models, client, controllers) {
    this.models = models;
    this.client = client;
    this.controllers = controllers;
  }

  async getPositionTierRecord (positionNumber, tierNumber) {
    const positionRecord = await this.models.MasteryPosition.findOne({
      where: {
        number: positionNumber
      }
    });

    const tierRecord = await this.models.MasteryTier.findOne({
      where: {
        number: tierNumber
      }
    });

    return this.models.MasteryPositionTier.findOne({
      where: {
        mastery_position_id: positionRecord.get('id'),
        mastery_tier_id: tierRecord.get('id')
      }
    });
  }

  async getPositionTierRecords (positionNumber, tierNumber) {
    const whereCondition = {};

    if (positionNumber > 0) {
      const positionRecord = await this.models.MasteryPosition.findOne({
        where: {
          number: positionNumber
        }
      });

      whereCondition.mastery_position_id = positionRecord.get('id');
    }

    if (tierNumber > 0) {
      const tierRecord = await this.models.MasteryTier.findOne({
        where: {
          number: tierNumber
        }
      });

      whereCondition.mastery_tier_id = tierRecord.get('id');
    }

    return this.models.MasteryPositionTier.findAll({
      where: whereCondition
    });
  }

  async exchangeToken ({
    interaction,
    position,
    tier
  }) {
    const masteryPositionTierRecord = await this.getPositionTierRecord(position, tier);

    if (!masteryPositionTierRecord) {
      console.error('addSkill: no position-tier found');
      return;
    }

    // check if they have a token for this tier
    const masteryTokenRecord = await this.models.MasteryToken.findOne({
      where: {
        user_id: interaction.user.id,
        mastery_tier_id: masteryPositionTierRecord.get('mastery_tier_id')
      }
    });

    if (!masteryTokenRecord) {
      return interaction.reply({
        content: "You don't have a token for this tier.",
        ephemeral: true
      });
    }

    const userMasteryPositionTierRecord = await this.models.UserMasteryPositionTier.create({
      user_id: interaction.user.id,
      mastery_position_tier_id: masteryPositionTierRecord.get('id')
    });

    await masteryTokenRecord.destroy();

    return this.viewUserRanks({ interaction });
  }

  async adminViewSkills ({
    interaction,
    position,
    tier
  }) {
    const masteryPositionTierRecords = await this.getPositionTierRecords(position, tier);

    const masterySkillRecords = await this.models.MasterySkill.findAll({
      include: [{
        model: this.models.MasteryPositionTier,
        include: [{
          model: this.models.MasteryTier
        }, {
          model: this.models.MasteryPosition
        }]
      }],
      order: [
        [Sequelize.literal('"MasteryPositionTier.MasteryTier.number"'), 'ASC'],
        [Sequelize.literal('"MasteryPositionTier.MasteryPosition.number"'), 'ASC']
      ],
      where: {
        mastery_position_tier_id: {
          [Sequelize.Op.in]: masteryPositionTierRecords.map((r) => r.get('id'))
        }
      }
    });

    const positionTierGrouped = {};

    for (const masterySkillRecord of masterySkillRecords) {
      if (positionTierGrouped[masterySkillRecord.get('mastery_position_tier_id')]) {
        positionTierGrouped[masterySkillRecord.get('mastery_position_tier_id')].push(masterySkillRecord);
      } else {
        positionTierGrouped[masterySkillRecord.get('mastery_position_tier_id')] = [masterySkillRecord];
      }
    }

    let content = '';

    for (const groupedMasterySkillRecords of Object.values(positionTierGrouped)) {
      const firstMasterySkillRecord = groupedMasterySkillRecords[0];
      let str = `\n\n__${firstMasterySkillRecord.MasteryPositionTier.MasteryPosition.name} - ${firstMasterySkillRecord.MasteryPositionTier.MasteryTier.name}__`;

      for (const masterySkillRecord of groupedMasterySkillRecords) {
        str += `\n**${masterySkillRecord.get('name')}:** ${masterySkillRecord.get('description')}`;
      }

      content += str;
    }

    return interaction.reply({
      content,
      ephemeral: true
    });
  }

  async addSkill ({
    description,
    interaction,
    name,
    position,
    tier
  }) {
    if (!description || !name || description.length < 1 || name.length < 1) {
      await interaction.reply({
        content: 'Invalid description or name',
        ephemeral: true
      });
    }

    const masteryPositionTierRecord = await this.getPositionTierRecord(position, tier);

    if (!masteryPositionTierRecord) {
      console.error('addSkill: no position-tier found');
      return;
    }

    const newSkillRecord = await this.models.MasterySkill.create({
      mastery_position_tier_id: masteryPositionTierRecord.get('id'),
      name,
      description
    });

    return this.viewSkills({
      interaction,
      position,
      tier
    });
  }

  async removeSkill ({
    id,
    interaction
  }) {
    const masterySkillRecord = await this.models.MasterySkill.findByPk(id);

    if (!masterySkillRecord) {
      await interaction.reply({
        content: `No skill found with id: ${id}`,
        ephemeral: true
      });
    }

    await masterySkillRecord.destroy();

    return interaction.reply({
      content: `Mastery skill removed`,
      ephemeral: true
    });
  }

  async hasBeginnerTier ({
    user
  }) {
    // const userRecord = await this.controllers.UserCtrl.getOrCreateUserRecord(user);
    const guild = await this.client.guilds.fetch(process.env.DOTAU_GUILD_ID);
    const guildUser = await guild.members.fetch({
      user,
      force: true
    });

    if (!guildUser) {
      console.error('No guilduser found for user: ', user);
      return;
    }

    const beginnerTierRoles = [
      process.env.ROLE_BEGINNER_ONE,
      process.env.ROLE_BEGINNER_TWO,
      process.env.ROLE_BEGINNER_THREE,
      process.env.ROLE_BEGINNER_FOUR,
      process.env.ROLE_BEGINNER_GRAD
    ];

    return guildUser.roles.cache.some((role) => beginnerTierRoles.includes(role.id));
  }

  async convertBeginnerTierUserToTokens ({
    user
  }) {
    const userRecord = await this.controllers.UserCtrl.getOrCreateUserRecord(user);
    const guild = await this.client.guilds.fetch(process.env.DOTAU_GUILD_ID);
    const guildUser = await guild.members.fetch({
      user,
      force: true
    });

    if (!guildUser) {
      console.error('No guilduser found for user: ', user);
      return;
    }

    const beginnerTierRoles = [
      process.env.ROLE_BEGINNER_ONE,
      process.env.ROLE_BEGINNER_TWO,
      process.env.ROLE_BEGINNER_THREE,
      process.env.ROLE_BEGINNER_FOUR,
      process.env.ROLE_BEGINNER_GRAD
    ];

    const beginnerRole = guildUser.roles.cache.find((role) => beginnerTierRoles.includes(role.id));
    const numericTier = beginnerTierRoles.indexOf(beginnerRole.id);

    if (numericTier < 0) {
      console.log('convertBeginnerTierUserToTokens called for non-beginner tier haver: ', user);
      return;
    }

    const masteryTierRecords = await this.models.MasteryTier.findAll({
      order: [['number', 'ASC']]
    });

    // specifically ordered by number ascending so that index corresponds to numericTier
    const masteryTierIds = masteryTierRecords.map((masteryTierRecord) => masteryTierRecord.get('id'));

    // allocate tier tokens to the user
    // beginner tier 3 gets tokens for master tier 1 and 2 for example.

    for (let i = 0; i < numericTier; i++) {
      await this.models.MasteryToken.create({
        user_id: userRecord.get('id'),
        mastery_tier_id: masteryTierIds[i]
      });
    }

    // add student role
    await guildUser.roles.add(process.env.ROLE_STUDENT);
    // remove beginner tier
    await guildUser.roles.remove(beginnerRole.id);

    if (numericTier > 0) {
      //TODO dm the user about cashing in the token

    }
  }

  async viewUserTokens ({ interaction }) {
    const masteryTokenRecords = await this.models.MasteryToken.findAll({
      include: [{
        model: this.models.MasteryTier
      }],
      where: {
        user_id: interaction.user.id
      }
    });

    const content = `__Tokens__\n${masteryTokenRecords.map((r) => r.MasteryTier.get('name')).join(', ')}`;

    return interaction.reply({
      content,
      ephemeral: true
    });
  }

  async viewUserRanks ({ interaction }) {
    const userMasteryPositionTierRecords = await this.models.UserMasteryPositionTier.findAll({
      include: [{
        model: this.models.MasteryPositionTier,
        include: [{
          model: this.models.MasteryTier
        }, {
          model: this.models.MasteryPosition
        }]
      }],
      order: [
        [Sequelize.literal('"MasteryPositionTier.MasteryTier.number"'), 'ASC'],
        [Sequelize.literal('"MasteryPositionTier.MasteryPosition.number"'), 'ASC']
      ],
      where: {
        user_id: interaction.user.id
      }
    });

    const userMasterySkillRecords = await this.models.UserMasterySkill.findAll({
      include: [{
        model: this.models.MasterySkill
      }],
      where: {
        user_id: interaction.user.id
      }
    });

    // we only want to show the highest medal in each position
    const positionGroupedArray = [null, null, null, null, null];

    for (const userMasteryPositionTierRecord of userMasteryPositionTierRecords) {
      const masteryPositionRecord = userMasteryPositionTierRecord.MasteryPositionTier.MasteryPosition;
      positionGroupedArray[masteryPositionRecord.get('number') - 1] = userMasteryPositionTierRecord;
    }

    let content = '';

    for (const userMasteryPositionTierRecord of positionGroupedArray) {
      if (userMasteryPositionTierRecord) {
        const masteryPositionRecord = userMasteryPositionTierRecord.MasteryPositionTier.MasteryPosition;
        const masteryTierRecord = userMasteryPositionTierRecord.MasteryPositionTier.MasteryTier;

        const skillsStringForPositionTier = userMasterySkillRecords.filter((userMasterySkillRecord) => {
          return userMasterySkillRecord.MasterySkill.get('mastery_position_tier_id') === userMasteryPositionTierRecord.MasteryPositionTier.get('id');
        }).map((userMasterySkillRecord) => {
          return `${userMasterySkillRecord.MasterySkill.get('name')} (${userMasterySkillRecord.get('progress')})`;
        }).join(', ');

        content += `\n**${masteryPositionRecord.get('name')} [${masteryTierRecord.get('name')}]**`;

        if (skillsStringForPositionTier) {
          content += ` - ${skillsStringForPositionTier}`;
        }
      }
    }

    return interaction.reply({
      content,
      ephemeral: true
    });
  }

  async viewUserSkills ({ interaction }) {
    const userMasteryPositionTierRecords = await this.models.UserMasteryPositionTier.findAll({
      include: [{
        model: this.models.MasteryPositionTier,
        include: [{
          model: this.models.MasteryTier
        }, {
          model: this.models.MasteryPosition
        }]
      }],
      order: [
        [Sequelize.literal('"MasteryPositionTier.MasteryTier.number"'), 'ASC'],
        [Sequelize.literal('"MasteryPositionTier.MasteryPosition.number"'), 'ASC']
      ],
      where: {
        user_id: interaction.user.id
      }
    });

    // find the highest medal in each position
    const positionGroupedTiers = [null, null, null, null, null];

    for (const userMasteryPositionTierRecord of userMasteryPositionTierRecords) {
      const masteryPositionRecord = userMasteryPositionTierRecord.MasteryPositionTier.MasteryPosition;
      const masteryTierRecord = userMasteryPositionTierRecord.MasteryPositionTier.MasteryTier;

      positionGroupedTiers[masteryPositionRecord.get('number') - 1] = masteryTierRecord.get('number');
    }

    const opOr = [];
    for (let i = 0; i < 5; i++) {
      opOr.push(
        Sequelize.literal(`("MasteryPositionTier->MasteryPosition"."number" = ${i + 1} AND "MasteryPositionTier->MasteryTier"."number" = ${positionGroupedTiers[i] + 1 || 1})`)
      )
    }

    const allMasterySkillRecords = await this.models.MasterySkill.findAll({
      include: [{
        model: this.models.MasteryPositionTier,
        include: [{
          model: this.models.MasteryTier
        }, {
          model: this.models.MasteryPosition
        }]
      }],
      order: [
        [Sequelize.literal('"MasteryPositionTier.MasteryTier.number"'), 'ASC'],
        [Sequelize.literal('"MasteryPositionTier.MasteryPosition.number"'), 'ASC']
      ],
      where: {
        [Sequelize.Op.or]: opOr
      }
    });

    const userMasterySkillRecords = await this.models.UserMasterySkill.findAll({
      where: {
        user_id: interaction.user.id
      }
    });

    const skillProgressMap = {};
    for (const userMasterySkillRecord of userMasterySkillRecords) {
      skillProgressMap[userMasterySkillRecord.get('mastery_skill_id')] = userMasterySkillRecord.get('progress');
    }

    const positionTierGrouped = {};

    for (const masterySkillRecord of allMasterySkillRecords) {
      if (positionTierGrouped[masterySkillRecord.get('mastery_position_tier_id')]) {
        positionTierGrouped[masterySkillRecord.get('mastery_position_tier_id')].push(masterySkillRecord);
      } else {
        positionTierGrouped[masterySkillRecord.get('mastery_position_tier_id')] = [masterySkillRecord];
      }
    }

    let content = '';

    for (const groupedMasterySkillRecords of Object.values(positionTierGrouped)) {
      const firstMasterySkillRecord = groupedMasterySkillRecords[0];
      let str = `\n\n__${firstMasterySkillRecord.MasteryPositionTier.MasteryPosition.name} - ${firstMasterySkillRecord.MasteryPositionTier.MasteryTier.name}__`;

      for (const masterySkillRecord of groupedMasterySkillRecords) {
        // just dont look at it
        str += `\n**${masterySkillRecord.get('name')}${skillProgressMap[masterySkillRecord.get('id')] ? ` (${skillProgressMap[masterySkillRecord.get('id')]})` : ''}:** ${masterySkillRecord.get('description')}`;
      }

      content += str;
    }

    return interaction.reply({
      content,
      ephemeral: true
    });
  }
}

module.exports = MasteryCtrl;
