module.exports = async (client, message) => {
	if(!message.guild || message.content.indexOf(client.config.prefix) !== 0) return;

	const args = message.content.split(/ +/g);
	const command = args.shift().slice(client.config.prefix.length).toLowerCase();

	if (!client.commands.get(command)) return;

	const cmd = client.commands.get(command);
	if (cmd) {
		cmd.run(client, message, args);
	}
};
