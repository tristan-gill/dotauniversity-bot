const Sequelize = require('sequelize');

module.exports = function (sq) {
  return sq.define('Tip', {
    sender_id: {
      allowNull: false,
      type: Sequelize.STRING
    },
    receiver_id: {
      allowNull: false,
      type: Sequelize.STRING
    },
    message: {
      allowNull: false,
      type: Sequelize.STRING
    },
    message_id: {
      allowNull: false,
      type: Sequelize.STRING
    },
    embed_id: {
      allowNull: false,
      type: Sequelize.STRING
    }
  });
};
