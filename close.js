// Convenience method to close window, if needed.
// Useful for indicating test completion.
function close() {
	if (typeof window !== 'undefined') {
		window.__close__();
	}
}

module.exports = close;
