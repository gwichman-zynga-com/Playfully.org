var servers = {
	local: 'http://localhost:8001',	// FIXME - port hardcode warning
	stage: "http://stage.playfully.org",
	prod: "http://playfully.org"
}

module.exports = {
	
	// e2e global server config
	serverAddress: servers.stage,
	
	// Loation of screenshots and logs
	resultDir: './e2e/results/'
	
}