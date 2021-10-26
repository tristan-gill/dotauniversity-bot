const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('MasteryTier', {
    number: {
      allowNull: false,
      type: Sequelize.INTEGER
    },
    name: {
      allowNull: false,
      type: Sequelize.STRING
    }
  });
};
