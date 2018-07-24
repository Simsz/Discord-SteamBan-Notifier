const fs = require('fs');
const Discord = require('discord.js');

module.exports = async client => {
	if (fs.existsSync('./reboot.json')) {
		const json = JSON.parse(fs.readFileSync('./reboot.json'));
		const m = await client.channels.get(json.channel).messages.fetch(json.id).catch((e) => {console.log(e)});
		
		const embed = new Discord.MessageEmbed();
		embed.setTimestamp();
		embed.setTitle('Rebooted!');

		var m2 = await m.edit({embed: embed});

		embed.setTitle('Rebooted! (took: `' + parseInt(m2.editedTimestamp - m2.createdTimestamp) + 'ms)`');
		await m2.edit({embed: embed});
		
		fs.unlink('./reboot.json', ()=>{});
	}
	console.log('Ready to spy on ' + client.users.size + ' users, in ' + client.channels.size + ' channels of ' + client.guilds.size + ' servers as ' + client.user.tag + '.');

	client.user.setActivity('for steam bans', { type: 'WATCHING' });
};
