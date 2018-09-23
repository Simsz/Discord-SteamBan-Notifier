const Discord = require('discord.js');

exports.run = async (client, msg, args) => {
	var datas = await client.accounts.fetchEverything();

	var users = [];
	datas.forEach((data) => {
		if (data.channels.includes(msg.channel.id)) {
			users.push({ steamID: data.steamID, name: data.lastSavedName });
		}
	});

	if (users.length < 1) return msg.channel.send({embed: {
		title: 'Error',
		description: 'This channel\'s watchlist is empty',
		color: Discord.Util.resolveColor('#ff0000')
	}}).catch(() => {});

	var chunkArray = client.chunkArray(users, 20);
	if (chunkArray.length <= 0) {
		// This should never happen
		console.log(chunkArray);
		msg.channel.send({embed: {
			title: 'Error',
			description: 'An internal error occured'
		}}).catch(() => {});
	} else if (chunkArray.length === 1) {
		// No need for page switching
		const embed = new Discord.MessageEmbed();
		embed.setTimestamp();
		embed.setTitle('Watchlist for this channel');
		embed.setAuthor(msg.author.tag, msg.author.avatarURL({format: 'png'}));
		embed.setColor('#06abe1');
		embed.setDescription('Total watchlist length: ' + users.length);
		for (let i = 0; i < chunkArray[0].length; i++) embed.addField('Last saved name: ' + Discord.Util.escapeMarkdown(chunkArray[0][i].name), '[' + chunkArray[0][i].steamID + '](https://steamcommunity.com/profiles/' + chunkArray[0][i].steamID + '/)');
		msg.channel.send({embed: embed}).catch(() => {});
	} else {
		// Include page switching
		var pages = [];

		for (let i = 0; i < chunkArray.length; i++) {
			let tmpPg = {
				author: { name: msg.author.tag, icon_url: msg.author.avatarURL({format: 'png'})},
				title: 'Watchlist for this channel - ' + parseInt(i + 1) + '/' + chunkArray.length,
				fields: [],
				timestamp: new Date(),
				footer: {
					text: 'Use the reactions to switch pages - You have 3 minutes'
				}
			}

			for (let i2 = 0; i2 < chunkArray[i].length; i2++) {
				tmpPg.fields.push({
					name: 'Last saved name: ' + Discord.Util.escapeMarkdown(chunkArray[0][i].name),
					value: '[' + chunkArray[0][i].steamID + '](https://steamcommunity.com/profiles/' + chunkArray[0][i].steamID + '/)'
				});
			}
			pages.push(tmpPg);
		}

		var startPage = 0;
		if (args[0]) {
			if (!isNaN(parseInt(args[0]))) {
				if (parseInt(args[0]) >= 1 && parseInt(args[0]) <= pages.length) {
					startPage = parseInt(args[0]);
				}
			}
		}

		msg.channel.send({embed: pages[startPage]}).then((m) => {
			var cancelAdd = false;

			if (!cancelAdd) m.react('⬅').then(() => {
				if (cancelAdd) return m.reactions.removeAll().catch(() => {});

				if (!cancelAdd) m.react('➡').then(() => {
					if (cancelAdd) return m.reactions.removeAll().catch(() => {});

					if (!cancelAdd) m.react('⏹').then(() => {
						if (cancelAdd) return m.reactions.removeAll().catch(() => {});
					}).catch(() => {});
				}).catch(() => {});
			}).catch(() => {});

			const filter = (reaction, user) => user.id === msg.author.id;
			const collector = m.createReactionCollector(filter, { time: 180000 });
			collector.on('collect', (r, user) => {
				if (r.emoji.name === '⬅') {
					// Go back
					var title = m.embeds[0].title;
					title = title.replace('Watchlist for this channel - ', '');
					var ary = title.split('/');
					var curPage = parseInt(ary[0] - 1);

					var nextPage = parseInt(curPage - 1);
					if (nextPage < 0) nextPage = parseInt(chunkArray.length -1);

					pages[nextPage].timestamp = new Date();

					m.edit({embed: pages[nextPage]}).catch(() => {});
					r.users.remove(user.id).catch(() => {});
				} else if (r.emoji.name === '➡') {
					// Go forward
					var title = m.embeds[0].title;
					title = title.replace('Watchlist for this channel - ', '');
					var ary = title.split('/');
					var curPage = parseInt(ary[0] - 1);
					var nextPage = parseInt(curPage + 1);
					if (nextPage > parseInt(chunkArray.length - 1)) nextPage = 0;

					pages[nextPage].timestamp = new Date();

					m.edit({embed: pages[nextPage]}).catch(() => {});
					r.users.remove(user.id).catch(() => {});
				} else if (r.emoji.name === '⏹') {
					// Stop
					collector.stop().catch(() => {});
				}
			});
			collector.on('end', (collected, reason) => {
				m.reactions.removeAll().catch(() => {});

				if (reason === 'user') {
					m.embeds[0].timestamp = new Date();
					m.embeds[0].footer = {};
					m.embeds[0].footer.text = 'Stopped due to user';
					m.edit(m.embeds[0]).catch(() => {});
				} else {
					m.embeds[0].timestamp = new Date();
					m.embeds[0].footer = {};
					m.embeds[0].footer.text = 'Stopped due to time running out (3 mins)';
					m.edit(m.embeds[0]).catch(() => {});
				}
			});
		}).catch(() => {});
	}
};

exports.help = {
	name: 'list',
	description: 'List all users in this channel\'s watchlist',
	usage: 'list [page]'
};
