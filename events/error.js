module.exports = (client, err) => {
	if (err.error && err.error.code === 'ECONNRESET') return console.log('Bot lost connection to Discord');

	console.error(err);
};
