// Convenience method to close window.
// Useful for indicating test completion.
function end() {
	if (typeof window !== 'undefined') {
		window.close();
	}
}

module.exports = end;
