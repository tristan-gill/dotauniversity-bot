const AdminMasterySkillCmd = require('./adminMasterySkill.js');
const MasteryRankCmd = require('./masteryRank.js');
const MasterySkillsCmd = require('./masterySkills.js');
const PostLobbyCmd = require('./postLobby.js');

const commands = {};
module.exports = commands;

commands.setup = function (models, client, controllers) {
  commands.AdminMasterySkillCmd = new AdminMasterySkillCmd(models, client, controllers);
  commands.MasteryRankCmd = new MasteryRankCmd(models, client, controllers);
  commands.MasterySkillsCmd = new MasterySkillsCmd(models, client, controllers);
  commands.PostLobbyCmd = new PostLobbyCmd(models, client, controllers);

  console.log('Commands defined');

  return commands;
};
