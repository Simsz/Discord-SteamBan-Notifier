module.exports = async (client, guild) => {
	console.log('Joined guild ' + guild.name + ' (' + guild.id + ') owned by ' + guild.owner.tag + ' (' + guild.owner.id + ') with ' + guild.memberCount + ' members');
};
