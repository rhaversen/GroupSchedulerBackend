const requiredInAllEnvironments = ['SESSION_SECRET']
const requiredInProduction = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME']

for (const key of requiredInAllEnvironments) {
	if ((process.env[key] ?? '') === '') {
		throw new Error(`Missing required environment variable: ${key}`)
	}
}

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
	for (const key of requiredInProduction) {
		if ((process.env[key] ?? '') === '') {
			throw new Error(`Missing required environment variable: ${key}`)
		}
	}
}

export {}
