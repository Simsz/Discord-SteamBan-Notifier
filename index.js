const fs = require('fs');
const Enmap = require('enmap');
const Discord = require('discord.js');
const client = new Discord.Client({
	messageCacheMaxSize: 50,
	messageCacheLifetime: 30,
	messageSweepInterval: 60,
	retryLimit: 5,
	disabledEvents: [
		'GUILD_UPDATE',
		'GUILD_MEMBER_ADD',
		'GUILD_MEMBER_REMOVE',
		'GUILD_MEMBER_UPDATE',
		'GUILD_MEMBERS_CHUNK',
		'GUILD_INTEGRATIONS_UPDATE',
		'GUILD_ROLE_CREATE',
		'GUILD_ROLE_DELETE',
		'GUILD_ROLE_UPDATE',
		'GUILD_BAN_ADD',
		'GUILD_BAN_REMOVE',
		'CHANNEL_CREATE',
		'CHANNEL_UPDATE',
		'CHANNEL_PINS_UPDATE',
		'MESSAGE_DELETE',
		'MESSAGE_UPDATE',
		'MESSAGE_DELETE_BULK',
		'MESSAGE_REACTION_ADD',
		'MESSAGE_REACTION_REMOVE',
		'MESSAGE_REACTION_REMOVE_ALL',
		'USER_UPDATE',
		'USER_NOTE_UPDATE',
		'USER_SETTINGS_UPDATE',
		'PRESENCE_UPDATE',
		'VOICE_STATE_UPDATE',
		'TYPING_START',
		'VOICE_SERVER_UPDATE',
		'WEBHOOKS_UPDATE'
	]
});

const config = require('./config.json');
client.config = config;
client.accounts = new Enmap({ name: 'accounts' });
client.commands = new Discord.Collection();
require('./modules/functions.js')(client);

if (!fs.existsSync('./apiKeys.json')) {
	var data = {
		currentlyUsedID: 0,
		curUses: 0,
		keys: client.config.steamAPIkeys
	};

	fs.writeFileSync('./apiKeys.json', JSON.stringify(data, null, 4));
}

client.steamAPI = JSON.parse(fs.readFileSync('./apiKeys.json'));

fs.readdir('./commands/', (err, files) => {
	if (err) console.error(err);
	console.log('Loading a total of ' + files.length + ' commands.');
	files.forEach(f => {
		if(f.split('.').slice(-1)[0] !== 'js') return;
		let props = require('./commands/' + f);
		client.commands.set(props.help.name, props);
	});
});

fs.readdir('./events/', (err, files) => {
	if (err) console.error(err);

	var onces = 0;
	for (let i = 0; i < files.length; i++) if (files[i].startsWith('once_') && files[i].endsWith('.js')) onces++;

	console.log('Loading a total of ' + files.length + ' events. (' + onces + ' onces)');
	files.forEach(file => {
		if (file.startsWith('once_')) {
			file = file.replace('once_', '');

			const eventName = file.split('.')[0];
			const event = require('./events/once_' + file);
			client.once(eventName, event.bind(null, client));
			delete require.cache[require.resolve('./events/once_' + file)];
		} else {
			const eventName = file.split('.')[0];
			const event = require('./events/' + file);
			client.on(eventName, event.bind(null, client));
			delete require.cache[require.resolve('./events/' + file)];
		}
	});
});

client.login(client.config.botToken).then(() => {
	client.fetchApplication().then((r) => {
		client.config.owner = r.owner.id;
		if (config.admins) config.admins.push(r.owner.id);
	}).catch((e) => console.error(e));
});
