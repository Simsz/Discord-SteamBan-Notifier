const fs = require('fs');
const Discord = require('discord.js');

exports.run = async (client, msg, args) => {
	var files = fs.readdirSync('./data');
	var users = [];
	files.forEach((file) => {
		var json = JSON.parse(fs.readFileSync('./data/' + file));
		if (json.channels.includes(msg.channel.id)) {
			users.push({ steamID: json.steamID, name: json.lastSavedName });
		}
	});
	if (users.length < 1) return msg.channel.send('*Template:* This channel has nobody on their watchlist').catch(() => {});

	var text = '*Template:* Users in this watchlist\n\n__`Last saved name` - SteamID64__\n';
	for (let i = 0; i < users.length; i++) {
		text += '`' + Discord.Util.escapeMarkdown(users[i].name) + '` - ' + users[i].steamID + '\n';
	}
	text += '\n\n***TODO:** Add pages*';

	msg.channel.send(text).catch(() => {});
};

exports.help = {
	name: 'list',
	description: 'List your watchlist',
	usage: 'list'
};
