const Discord = require('discord.js');
const fs = require('fs');
const moment = require('moment');
require('moment-duration-format');

exports.run = async (client, msg, args) => {
	var datas = await client.accounts.fetchEverything();

	var m = await msg.channel.send('Getting bot information... Please wait a couple of seconds.');

	var requiredModules = Object.keys(JSON.parse(fs.readFileSync('./package.json')).dependencies);
	var moduleVersions = JSON.parse(fs.readFileSync('./package-lock.json')).dependencies;
	var rawModules = [];

	for (let i in requiredModules) {
		if (!moduleVersions[requiredModules[i]]) continue;

		rawModules.push({ name: requiredModules[i], version: moduleVersions[requiredModules[i]].version });
	}

	const longest = rawModules.map((mod) => mod.name).reduce((long, str) => Math.max(long, str.length), 0);
	const modules = rawModules.map((mod) => '• ' + ' '.repeat(longest - mod.name.length) + mod.name + ' :: ' + ((mod.version.startsWith('github:') ? (mod.version.split('#')[mod.version.split('#').length - 1]) : ('v' + mod.version))));

	const embed = new Discord.MessageEmbed();
	embed.setTimestamp();
	embed.setAuthor(msg.author.tag, msg.author.avatarURL({format: 'png'}));
	embed.setTitle('Statistics');

	const description = [];
	/*00*/ description.push('```asciidoc');
	/*01*/ description.push('•      Mem Usage :: ' + (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB');
	/*02*/ description.push('•  Client Uptime :: ' + moment.duration(client.uptime).format(' D [days], H [hrs], m [mins], s [secs]'));
	/*03*/ description.push('• Process Uptime :: ' + moment.duration(process.uptime() * 1000).format(' D [days], H [hrs], m [mins], s [secs]'));
	/*04*/ description.push('•        Latency :: ' + '*Calculating... Please wait.*');
	/*05*/ description.push('•    API Latency :: ' + client.ping + 'ms');
	/*06*/ description.push('•          Users :: ' + client.users.size.toString());
	/*07*/ description.push('•        Servers :: ' + client.guilds.size.toString());
	/*08*/ description.push('•       Channels :: ' + client.channels.size.toString());
	/*09*/ description.push('•     Discord.js :: v' + Discord.version);
	/*10*/ description.push('•           Node :: ' + process.version);
	/*11*/ description.push('•    Steam users :: ' + datas.size);
	/*12*/ description.push('```');
	embed.setDescription(description.join('\n'));
	embed.addField('Module Versions/Hashes', '```asciidoc\n' + modules.join('\n') + '```');

	var start = new Date();
	m.edit({ embed: embed }).then((m) => {
		description[4] = description[4].replace('*Calculating... Please wait.*', (new Date().getTime() - start.getTime()) + 'ms');
		embed.setDescription(description.join('\n'));
		m.edit({ embed: embed });
	});
};

exports.help = {
	name: 'stats',
	description: 'Gives some useful bot statistics',
	usage: 'stats'
};
