const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('UserMasterySkill', {
    user_id: {
      allowNull: false,
      type: Sequelize.BIGINT
    },
    mastery_skill_id: {
      allowNull: false,
      type: Sequelize.INTEGER
    },
    progress: {
      allowNull: false,
      defaultValue: 0,
      type: Sequelize.INTEGER
    }
  }, {
    tableName: 'users_mastery_skills'
  });
};
