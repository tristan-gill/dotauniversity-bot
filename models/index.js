const lobby = require('./lobby');
const masteryPosition = require('./masteryPosition');
const masteryPositionTier = require('./masteryPositionTier');
const masterySkill = require('./masterySkill');
const masteryTier = require('./masteryTier');
const masteryToken = require('./masteryToken');
const scheduledLobby = require('./scheduledLobby');
const tip = require('./tip');
const user = require('./user');
const userMasteryPositionTier = require('./userMasteryPositionTier');
const userMasterySkill = require('./userMasterySkill');
const userTip = require('./userTip');

const models = {};
module.exports = models;

models.setup = function (sq) {
  models.Lobby = lobby(sq);
  models.MasteryPosition = masteryPosition(sq);
  models.MasteryPositionTier = masteryPositionTier(sq);
  models.MasterySkill = masterySkill(sq);
  models.MasteryTier = masteryTier(sq);
  models.MasteryToken = masteryToken(sq);
  models.ScheduledLobby = scheduledLobby(sq);
  models.Tip = tip(sq);
  models.User = user(sq);
  models.UserMasteryPositionTier = userMasteryPositionTier(sq);
  models.UserMasterySkill = userMasterySkill(sq);
  models.UserTip = userTip(sq);

  models.sequelize = sq;

  // models.MasteryPositionTier
  models.MasteryPositionTier.belongsTo(models.MasteryPosition, {
    foreignKey: 'mastery_position_id'
  });
  models.MasteryPositionTier.belongsTo(models.MasteryTier, {
    foreignKey: 'mastery_tier_id'
  });

  // models.MasterySkill
  models.MasterySkill.belongsTo(models.MasteryPositionTier, {
    foreignKey: 'mastery_position_tier_id'
  });

  // models.MasteryToken
  models.MasteryToken.belongsTo(models.User, {
    foreignKey: 'user_id'
  });
  models.MasteryToken.belongsTo(models.MasteryTier, {
    foreignKey: 'mastery_tier_id'
  });

  // models.Tip
  models.Tip.belongsTo(models.User, {
    foreignKey: 'sender_id'
  });
  models.Tip.belongsTo(models.User, {
    foreignKey: 'receiver_id'
  });

  // models.UserMasteryPositionTier
  models.UserMasteryPositionTier.belongsTo(models.User, {
    foreignKey: 'user_id'
  });
  models.UserMasteryPositionTier.belongsTo(models.MasteryPositionTier, {
    foreignKey: 'mastery_position_tier_id'
  });

  // models.UserMasterySkill
  models.UserMasterySkill.belongsTo(models.User, {
    foreignKey: 'user_id'
  });
  models.UserMasterySkill.belongsTo(models.MasterySkill, {
    foreignKey: 'mastery_skill_id'
  });

  // models.UserTip
  models.UserTip.belongsTo(models.User, {
    foreignKey: 'id'
  });

  console.log('Models defined');

  return models;
};
