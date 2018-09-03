const fs = require('fs');
const Enmap = require('enmap');
const Discord = require('discord.js');
const client = new Discord.Client();

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
		if(props.init) props.init(client);
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
