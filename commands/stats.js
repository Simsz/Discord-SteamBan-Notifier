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

	const description = [];
	description.push('```asciidoc');
	description.push('•      Mem Usage :: ' + (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB');
	description.push('•  Client Uptime :: ' + moment.duration(client.uptime).format(' D [days], H [hrs], m [mins], s [secs]'));
	description.push('• Process Uptime :: ' + moment.duration(process.uptime() * 1000).format(' D [days], H [hrs], m [mins], s [secs]'));
	description.push('•        Latency :: ' + '*Calculating... Please wait.*');
	description.push('•    API Latency :: ' + client.ping + 'ms');
	description.push('•          Users :: ' + client.users.size.toString());
	description.push('•        Servers :: ' + client.guilds.size.toString());
	description.push('•       Channels :: ' + client.channels.size.toString());
	description.push('•     Discord.js :: v' + Discord.version);
	description.push('•           Node :: ' + process.version);
	description.push('•    Steam users :: ' + datas.size);
	description.push('```');
	description.push(String.fromCodePoint(0x200B));
	embed.addField('Statistics', description.join('\n'));
	embed.addField('Module Versions/Hashes', '```asciidoc\n' + modules.join('\n') + '\n```\n' + String.fromCodePoint(0x200B));

	var start = new Date();
	m.edit({ embed: embed }).then((m) => {
		m.embeds[0].fields[0].value = m.embeds[0].fields[0].value.replace('*Calculating... Please wait.*', (new Date().getTime() - start.getTime()) + 'ms');
		m.edit({ embed: m.embeds[0] });
	}).catch(() => {});
};

exports.help = {
	name: 'stats',
	description: 'Get some bot stats',
	usage: 'stats'
};
