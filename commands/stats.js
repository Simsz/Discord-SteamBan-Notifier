const Discord = require('discord.js');
const fs = require('fs');
const moment = require('moment');
require('moment-duration-format');

exports.run = (client, msg, args) => {
	const embed = new Discord.MessageEmbed();
	embed.setTimestamp();
	embed.setAuthor(msg.author.tag, msg.author.avatarURL({format: 'png'}));
	embed.setTitle('Statistics');

	var description = [];
	description.push('```asciidoc');
	description.push('• Mem Usage      :: ' + (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + 'MB');
	description.push('• Uptime         :: ' + moment.duration(client.uptime).format(' D [days], H [hrs], m [mins], s [secs]'));
	description.push('• Users          :: ' + client.users.size.toString());
	description.push('• Servers        :: ' + client.guilds.size.toString());
	description.push('• Channels       :: ' + client.channels.size.toString());
	description.push('• Discord.js     :: v' + Discord.version);
	description.push('• Node           :: ' + process.version);

	var files = fs.readdirSync('./data');
	description.push('• Steam users    :: ' + files.length);

	description.push('```');
	embed.setDescription(description.join('\n'));

	msg.channel.send({embed: embed}).catch((e) => console.error(e));
};

exports.help = {
	name: 'stats',
	description: 'Gives some useful bot statistics',
	usage: 'stats'
};
